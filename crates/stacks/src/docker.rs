use std::{
    env, fs::canonicalize, marker::PhantomData, path::PathBuf, process::Command, str::FromStr,
};

use tracing::{error, info};

use crate::error::{Error, Result};

pub struct Initial;
pub struct DockerSocketReady;
pub struct DockerInstalled;
pub struct ImageAvailable;
pub struct DataDirectoryReady;
pub struct ContainerRunning;
pub struct Ready;

pub struct DockerManager<State> {
    data_dir: PathBuf,
    image_name: String,
    container_name: String,
    docker_bin: Option<String>,
    socket_path: Option<String>,
    _state: PhantomData<State>,
}

impl DockerManager<Initial> {
    pub fn new(data_dir: PathBuf, image_name: String, container_name: String) -> Self {
        Self {
            data_dir,
            image_name,
            container_name,
            docker_bin: None,
            socket_path: None,
            _state: PhantomData,
        }
    }

    pub fn check_socket_and_bin(mut self) -> Result<DockerManager<DockerSocketReady>> {
        if Command::new("podman")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            let xdg_runtime_dir =
                env::var("XDG_RUNTIME_DIR").unwrap_or_else(|_| "/run/user/1000".to_string());
            let podman_sock = format!("{}/podman/podman.sock", xdg_runtime_dir);
            self.docker_bin = Some("podman".to_string());
            self.socket_path = Some(podman_sock);
        } else {
            self.docker_bin = Some("docker".to_string());
            self.socket_path = Some("/var/run/docker.sock".to_string());
        }
        Ok(DockerManager {
            data_dir: self.data_dir,
            image_name: self.image_name,
            container_name: self.container_name,
            docker_bin: self.docker_bin,
            socket_path: self.socket_path,
            _state: PhantomData,
        })
    }
}

impl DockerManager<DockerSocketReady> {
    pub fn check_docker_installed(self) -> Result<DockerManager<DockerInstalled>> {
        let docker_bin = self.docker_bin.as_ref().unwrap();
        info!("Checking for Docker/Podman...");
        let output = Command::new(docker_bin).arg("--version").output()?;
        if output.status.success() {
            info!("{} is installed.", docker_bin);
            Ok(self.transition())
        } else {
            Err(Error::DockerNotInstalled)
        }
    }
}

impl DockerManager<DockerInstalled> {
    pub fn check_image_available(self) -> Result<DockerManager<ImageAvailable>> {
        let docker_bin = self.docker_bin.as_ref().unwrap();
        info!(image = %self.image_name, "Checking for Docker image...");
        let image_name = self.image_name.clone();
        let output = Command::new(docker_bin)
            .args(["images", "-q", &image_name])
            .output()?;

        let id = String::from_utf8_lossy(&output.stdout);
        if !id.trim().is_empty() {
            info!(image = %self.image_name, "Docker image found.");
            Ok(self.transition())
        } else {
            Err(Error::ImageNotFound(self.image_name))
        }
    }
}

impl DockerManager<ImageAvailable> {
    pub fn ensure_data_directory(self) -> Result<DockerManager<DataDirectoryReady>> {
        info!(path = ?self.data_dir, "Ensuring data directory exists...");
        std::fs::create_dir_all(&self.data_dir)
            .map_err(|e| Error::DirectoryCreate(self.data_dir.clone(), e))?;
        info!("Data directory is ready.");
        Ok(self.transition())
    }
}

impl DockerManager<DataDirectoryReady> {
    pub fn check_container_running(self, port: u16) -> Result<DockerManager<ContainerRunning>> {
        let docker_bin = self.docker_bin.as_ref().unwrap();
        let container_name = self.container_name.clone();
        info!(container = %container_name, "Checking if container is running...");
        let output = Command::new(docker_bin)
            .args(["ps", "-q", "--filter", &format!("name={}", container_name)])
            .output()?;

        let id = String::from_utf8_lossy(&output.stdout);
        if !id.trim().is_empty() {
            info!(container = %self.container_name, "Container is already running.");
            return Ok(self.transition());
        }

        info!(container = %self.container_name, "Container not running. Starting it now...");
        Err(Error::Command(
            "run_container must be called with port".to_string(),
        ))
    }

    pub fn run_container(self, port: u16) -> Result<DockerManager<ContainerRunning>> {
        let docker_bin = self.docker_bin.as_ref().unwrap();
        let socket_path = self.socket_path.as_ref().unwrap();
        let home_dir = env::var("HOME").unwrap_or_else(|_| "/home/user".to_string());
        let data_root = PathBuf::from_str(&home_dir).unwrap();
        let canonicalize_data_root = canonicalize(data_root)?.join(".config/ethui/stacks/local");
        let canonicalize_str = canonicalize_data_root.to_string_lossy();
        let canonicalize_data_dir = canonicalize(&self.data_dir)?;
        let data_dir_str = canonicalize_data_dir.to_string_lossy();

        let mut cmd = Command::new(docker_bin);

        cmd.arg("run")
            .arg("-v")
            .arg(format!("{data_dir_str}:{canonicalize_str}"))
            .arg("-e")
            .arg(format!("DATA_ROOT={canonicalize_str}"))
            .arg("-v")
            .arg(format!("{socket_path}:/var/run/docker.sock"))
            .arg("--init")
            .arg("-p")
            .arg(format!("{port}:4000"))
            .arg("--replace")
            .arg(format!("--name={}", self.container_name))
            .arg(&self.image_name);

        println!("Running command: {cmd:?}");
        info!(command = ?cmd, "Running Docker/Podman command");
        let output = cmd.output()?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!(stderr = %stderr, "Docker/Podman run error");
            return Err(Error::Command("Failed to start container".to_string()));
        }
        Ok(self.transition())
    }
}

impl DockerManager<ContainerRunning> {
    pub fn check_health(self) -> Result<DockerManager<Ready>> {
        let docker_bin = self.docker_bin.as_ref().unwrap();
        let container_name = self.container_name.clone();
        info!(container = %container_name, "Final check on container status...");
        let output = Command::new(docker_bin)
            .args(["ps", "-q", "--filter", &format!("name={container_name}")])
            .output()?;

        let id = String::from_utf8_lossy(&output.stdout);
        if !id.trim().is_empty() {
            info!(container = %self.container_name, "Container is ready.");
            return Ok(self.transition());
        }

        Err(Error::ContainerNotRunning(self.container_name))
    }
}

impl<State> DockerManager<State> {
    fn transition<NewState>(self) -> DockerManager<NewState> {
        DockerManager {
            data_dir: self.data_dir,
            image_name: self.image_name,
            container_name: self.container_name,
            docker_bin: self.docker_bin,
            socket_path: self.socket_path,
            _state: PhantomData,
        }
    }
}

pub fn start_stacks(port: u16, config_dir: PathBuf) -> Result<()> {
    let manager = DockerManager::new(
        config_dir.join("local/"),
        "ethui-stacks".to_string(),
        "ethui-stacks".to_string(),
    );

    let _ready_manager = manager
        .check_socket_and_bin()?
        .check_docker_installed()?
        .check_image_available()?
        .ensure_data_directory()?
        .run_container(port)?
        .check_health()?;

    info!("Stacks is fully up and running!");
    Ok(())
}
