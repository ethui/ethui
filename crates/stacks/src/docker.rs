use std::{env, fs, marker::PhantomData, path::PathBuf, process::Command, str::FromStr};

use tracing::info;

use crate::error::{Error, Result};

pub struct Initial;
pub struct DockerSocketReady;
pub struct DockerInstalled;
pub struct ImageAvailable;
pub struct DataDirectoryReady;
pub struct ContainerRunning;
pub struct ContainerNotRunning;

pub struct DockerManager<State> {
    data_dir: PathBuf,
    image_name: String,
    container_name: String,
    docker_bin: Option<String>,
    socket_path: Option<PathBuf>,
    _state: PhantomData<State>,
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

    fn docker_bin(&self) -> Result<&str> {
        self.docker_bin
            .as_deref()
            .ok_or_else(|| Error::Command("Docker binary not set".to_string()))
    }

    fn socket_path(&self) -> Result<&PathBuf> {
        self.socket_path
            .as_ref()
            .ok_or_else(|| Error::Command("Socket path not set".to_string()))
    }

    fn is_container_running(&self, port: u16) -> Result<bool> {
        let docker_bin = self.docker_bin()?;
        let output = Command::new(docker_bin)
            .args([
                "ps",
                "--filter",
                &format!("name={}", self.container_name),
                "--format",
                "{{.Ports}}",
            ])
            .output()?;
        let expected = format!("{port}->4000");
        Ok(String::from_utf8_lossy(&output.stdout)
            .trim()
            .contains(&expected))
    }
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
            let podman_sock = PathBuf::from(format!("{xdg_runtime_dir}/podman/podman.sock"));
            self.docker_bin = Some("podman".to_string());
            self.socket_path = Some(podman_sock);
        } else {
            self.docker_bin = Some("docker".to_string());
            self.socket_path = Some(PathBuf::from("/var/run/docker.sock"));
        }
        Ok(self.transition())
    }
}

impl DockerManager<DockerSocketReady> {
    pub fn check_docker_installed(self) -> Result<DockerManager<DockerInstalled>> {
        let docker_bin = self.docker_bin()?;
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
        let docker_bin = self.docker_bin()?;
        info!(image = %self.image_name, "Checking for Docker image...");
        let output = Command::new(docker_bin)
            .args(["images", "-q", &self.image_name])
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
        fs::create_dir_all(&self.data_dir)
            .map_err(|e| Error::DirectoryCreate(self.data_dir.clone(), e))?;
        info!("Data directory is ready.");
        Ok(self.transition())
    }
}

impl DockerManager<DataDirectoryReady> {
    pub fn run(self, port: u16) -> Result<DockerManager<ContainerRunning>> {
        if self.is_container_running(port)? {
            info!(
                "Container {} is already running on port {}.",
                self.container_name, port
            );
            return Ok(self.transition());
        }

        let docker_bin = self.docker_bin()?;
        let socket_path = self.socket_path()?;
        let home_dir = env::var("HOME").unwrap_or_else(|_| "/home/user".to_string());
        let canonicalize_str = fs::canonicalize(PathBuf::from_str(&home_dir).unwrap())?
            .join(".config/ethui/stacks/local")
            .to_string_lossy()
            .to_string();
        let data_dir_str = fs::canonicalize(&self.data_dir)?
            .to_string_lossy()
            .to_string();
        let output = Command::new(docker_bin)
            .arg("run")
            .arg("-d")
            .arg("-v")
            .arg(format!("{data_dir_str}:{canonicalize_str}"))
            .arg("-e")
            .arg(format!("DATA_ROOT={canonicalize_str}"))
            .arg("-v")
            .arg(format!("{}:/var/run/docker.sock", socket_path.display()))
            .arg("--init")
            .arg("-p")
            .arg(format!("{port}:4000"))
            .arg("--replace")
            .arg(format!("--name={}", self.container_name))
            .arg(&self.image_name)
            .output()?;
        if !output.status.success() {
            return Err(Error::Command(format!(
                "Failed to start container: {}",
                String::from_utf8_lossy(&output.stderr)
            )));
        }
        Ok(self.transition())
    }

    pub fn stop(self, port: u16) -> Result<DockerManager<ContainerNotRunning>> {
        if !self.is_container_running(port)? {
            info!("Container {} is already stopped.", self.container_name);
            return Ok(self.transition());
        }

        let docker_bin = self.docker_bin()?;
        let output = Command::new(docker_bin)
            .args(["stop", &self.container_name])
            .output()?;
        if !output.status.success() {
            return Err(Error::Command(format!(
                "Failed to stop container: {}",
                String::from_utf8_lossy(&output.stderr)
            )));
        }
        Ok(self.transition())
    }
}

impl DockerManager<ContainerRunning> {
    pub fn check_health(self, port: u16) -> Result<DockerManager<ContainerRunning>> {
        if self.is_container_running(port)? {
            Ok(self)
        } else {
            Err(Error::ContainerNotRunning(self.container_name.clone()))
        }
    }
}

impl DockerManager<ContainerNotRunning> {
    pub fn check_stopped(self, port: u16) -> Result<DockerManager<ContainerNotRunning>> {
        if !self.is_container_running(port)? {
            Ok(self)
        } else {
            Err(Error::Command(format!(
                "Container {} is still running",
                self.container_name
            )))
        }
    }
}

pub fn start_stacks(port: u16, config_dir: PathBuf) -> Result<()> {
    DockerManager::new(
        config_dir.join("local/"),
        "ethui-stacks".to_string(),
        "ethui-stacks".to_string(),
    )
    .check_socket_and_bin()?
    .check_docker_installed()?
    .check_image_available()?
    .ensure_data_directory()?
    .run(port)?
    .check_health(port)?;
    info!("Stacks is fully up and running!");
    Ok(())
}

pub fn stop_stacks(port: u16, config_dir: PathBuf) -> Result<()> {
    DockerManager::new(
        config_dir.join("local/"),
        "ethui-stacks".to_string(),
        "ethui-stacks".to_string(),
    )
    .check_socket_and_bin()?
    .check_docker_installed()?
    .check_image_available()?
    .ensure_data_directory()?
    .stop(port)?
    .check_stopped(port)?;
    info!("Stacks has been stopped successfully.");
    Ok(())
}
