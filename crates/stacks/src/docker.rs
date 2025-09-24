use std::{env, fs, marker::PhantomData, path::PathBuf, process::Command, str::FromStr};

use color_eyre::eyre::{eyre, OptionExt, WrapErr};
use reqwest::Client;

#[derive(Debug, Clone)]
pub struct Initial;

#[derive(Debug, Clone)]
pub struct DockerSocketReady;

#[derive(Debug, Clone)]
pub struct DockerInstalled;

#[derive(Debug, Clone)]
pub struct ImageAvailable;
#[derive(Debug, Clone)]
pub struct DataDirectoryReady;

#[derive(Debug, Clone)]
pub struct ContainerRunning;

#[derive(Debug, Clone)]
pub struct ContainerNotRunning;

#[derive(Debug, Clone)]
pub struct DockerManager<State> {
    data_dir: PathBuf,
    image_name: String,
    container_name: String,
    container_port: u16,
    host_port: u16,
    docker_bin: Option<&'static str>,
    socket_path: Option<PathBuf>,
    _state: PhantomData<State>,
}

impl<State> DockerManager<State> {
    fn transition<NewState>(self) -> DockerManager<NewState> {
        DockerManager {
            data_dir: self.data_dir,
            image_name: self.image_name,
            container_name: self.container_name,
            container_port: self.container_port,
            host_port: self.host_port,
            docker_bin: self.docker_bin,
            socket_path: self.socket_path,
            _state: PhantomData,
        }
    }

    fn docker_bin(&self) -> color_eyre::Result<&str> {
        self.docker_bin.ok_or_eyre("Docker binary not set")
    }

    fn socket_path(&self) -> color_eyre::Result<&PathBuf> {
        self.socket_path.as_ref().ok_or_eyre("Socket path not set")
    }

    fn is_container_running(&self) -> color_eyre::Result<bool> {
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

        let expected = format!("{}->{}", self.host_port, self.container_port);

        Ok(String::from_utf8_lossy(&output.stdout)
            .trim()
            .contains(&expected))
    }
}

impl DockerManager<Initial> {
    pub fn new(
        data_dir: PathBuf,
        image_name: String,
        container_name: String,
        container_port: u16,
        host_port: u16,
    ) -> Self {
        Self {
            data_dir,
            image_name,
            container_name,
            container_port,
            host_port,
            docker_bin: None,
            socket_path: None,
            _state: PhantomData,
        }
    }

    pub fn check_socket_and_bin(mut self) -> color_eyre::Result<DockerManager<DockerSocketReady>> {
        if Command::new("podman")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            let xdg_runtime_dir =
                env::var("XDG_RUNTIME_DIR").unwrap_or_else(|_| "/run/user/1000".to_string());
            let podman_sock = PathBuf::from(format!("{xdg_runtime_dir}/podman/podman.sock"));
            self.docker_bin = Some("podman");
            self.socket_path = Some(podman_sock);
        } else {
            self.docker_bin = Some("docker");
            self.socket_path = Some(PathBuf::from("/var/run/docker.sock"));
        }
        Ok(self.transition())
    }
}

impl DockerManager<DockerSocketReady> {
    pub fn check_docker_installed(self) -> color_eyre::Result<DockerManager<DockerInstalled>> {
        let docker_bin = self.docker_bin()?;
        tracing::debug!("Checking for Docker/Podman...");
        let output = Command::new(docker_bin).arg("--version").output()?;
        if output.status.success() {
            tracing::debug!("{} is installed.", docker_bin);
            Ok(self.transition())
        } else {
            Err(eyre!("Docker/Podman is not installed"))
        }
    }
}

impl DockerManager<DockerInstalled> {
    pub fn check_image_available(self) -> color_eyre::Result<DockerManager<ImageAvailable>> {
        let docker_bin = self.docker_bin()?;

        let pull_output = Command::new(docker_bin)
            .args(["pull", &self.image_name])
            .output()?;

        if !pull_output.status.success() {
            return Err(eyre!(
                "Failed to pull image {}: {}",
                self.image_name,
                String::from_utf8_lossy(&pull_output.stderr)
            ));
        }

        let verify_output = Command::new(docker_bin)
            .args(["images", "-q", &self.image_name])
            .output()?;
        let id = String::from_utf8_lossy(&verify_output.stdout);

        if id.trim().is_empty() {
            return Err(eyre!("Image not found after pull: {}", self.image_name));
        }

        Ok(self.transition())
    }
}

impl DockerManager<ImageAvailable> {
    pub fn ensure_data_directory(self) -> color_eyre::Result<DockerManager<DataDirectoryReady>> {
        tracing::debug!(path = ?self.data_dir, "Ensuring data directory exists...");
        fs::create_dir_all(&self.data_dir)
            .wrap_err_with(|| format!("Failed to create directory: {:?}", self.data_dir))?;
        tracing::debug!("Data directory is ready.");
        Ok(self.transition())
    }
}

impl DockerManager<DataDirectoryReady> {
    pub fn run(self) -> color_eyre::Result<DockerManager<ContainerRunning>> {
        let docker_bin = self.docker_bin()?;
        if self.is_container_running()? && docker_bin.contains("docker") {
            let stop_output = Command::new(docker_bin)
                .args(["stop", &self.container_name])
                .output()?;

            if !stop_output.status.success() {
                return Err(eyre!(
                    "Failed to stop container: {}",
                    String::from_utf8_lossy(&stop_output.stderr)
                ));
            }

            Command::new(docker_bin)
                .args(["rm", &self.container_name])
                .output()?;
        }

        let socket_path = self.socket_path()?;
        let home_dir = env::var("HOME").unwrap_or_else(|_| "/home/user".to_string());
        let canonicalize_str = fs::canonicalize(PathBuf::from_str(&home_dir).unwrap())?
            .join(".config/ethui/stacks/local")
            .to_string_lossy()
            .to_string();
        let data_dir_str = fs::canonicalize(&self.data_dir)?
            .to_string_lossy()
            .to_string();

        let mut binding = Command::new(docker_bin);
        let mut command = binding
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
            .arg(format!("{}:{}", self.host_port, self.container_port));

        if docker_bin.contains("podman") {
            command = command.arg("--replace");
        } else {
            command = command.arg("--rm");
        }

        command = command
            .arg(format!("--name={}", self.container_name))
            .arg(&self.image_name);

        let output = command.output()?;

        if !output.status.success() {
            return Err(eyre!(
                "Failed to start container: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        Ok(self.transition())
    }

    pub fn initialize(self) -> color_eyre::Result<DockerManager<ContainerNotRunning>> {
        Ok(self.transition())
    }
}

impl DockerManager<ContainerRunning> {
    pub fn check_health(self) -> color_eyre::Result<DockerManager<ContainerRunning>> {
        if self.is_container_running()? {
            Ok(self)
        } else {
            Err(eyre!(
                "Container not running: {}",
                self.container_name.clone()
            ))
        }
    }

    pub async fn create_stack(&self, slug: &str) -> color_eyre::Result<()> {
        let url = format!("http://api.local.ethui.dev:{}/stacks", self.host_port);
        let client = Client::new();
        let res = client
            .post(&url)
            .json(&serde_json::json!({ "slug": slug }))
            .send()
            .await
            .wrap_err_with(|| format!("Failed to send POST to {url}"))?;
        if !res.status().is_success() {
            return Err(eyre!("Failed to create stack: {}", res.status()));
        }
        Ok(())
    }

    pub async fn list_stacks(&self) -> color_eyre::Result<Vec<String>> {
        let url = format!("http://api.local.ethui.dev:{}/stacks", self.host_port);
        let client = Client::new();
        let res = client
            .get(&url)
            .send()
            .await
            .wrap_err_with(|| format!("Failed to send GET to {url}"))?;

        if !res.status().is_success() {
            return Err(eyre!("Failed to list stacks: {}", res.status()));
        }

        let stacks: ListStacksResponse = res
            .json()
            .await
            .wrap_err("Failed to parse stacks response")?;

        Ok(stacks.data.into_iter().map(|stack| stack.slug).collect())
    }

    pub async fn remove_stack(&self, slug: &str) -> color_eyre::Result<()> {
        let url = format!(
            "http://api.local.ethui.dev:{}/stacks/{slug}",
            self.host_port
        );
        let client = Client::new();
        let res = client
            .delete(&url)
            .send()
            .await
            .wrap_err_with(|| format!("Failed to send Delete to {url}"))?;
        if !res.status().is_success() {
            return Err(eyre!("Failed to delete stack: {}", res.status()));
        }
        Ok(())
    }

    pub fn stop(self) -> color_eyre::Result<DockerManager<ContainerNotRunning>> {
        if !self.is_container_running()? {
            tracing::debug!("Container {} is already stopped.", self.container_name);

            return Ok(self.transition());
        }

        let docker_bin = self.docker_bin()?;
        let stop_output = Command::new(docker_bin)
            .args(["stop", &self.container_name])
            .output()?;
        if !stop_output.status.success() {
            return Err(eyre!(
                "Failed to stop container: {}",
                String::from_utf8_lossy(&stop_output.stderr)
            ));
        }

        Command::new(docker_bin)
            .args(["rm", &self.container_name])
            .output()?;
        Ok(self.transition())
    }
}

#[derive(serde::Deserialize)]
struct ListStacksResponse {
    data: Vec<StackInfo>,
}

#[derive(serde::Deserialize)]
struct StackInfo {
    slug: String,
}

impl DockerManager<ContainerNotRunning> {
    pub fn check_stopped(self) -> color_eyre::Result<DockerManager<ContainerNotRunning>> {
        if !self.is_container_running()? {
            Ok(self)
        } else {
            Err(eyre!("Container {} is still running", self.container_name))
        }
    }

    pub fn run(self) -> color_eyre::Result<DockerManager<ContainerRunning>> {
        let docker_bin = self.docker_bin()?;

        if self.is_container_running()? && docker_bin.contains("docker") {
            let stop_output = Command::new(docker_bin)
                .args(["stop", &self.container_name])
                .output()?;

            if !stop_output.status.success() {
                return Err(eyre!(
                    "Failed to stop container: {}",
                    String::from_utf8_lossy(&stop_output.stderr)
                ));
            }

            Command::new(docker_bin)
                .args(["rm", &self.container_name])
                .output()?;
        }

        let socket_path = self.socket_path()?;
        let home_dir = env::var("HOME").unwrap_or_else(|_| "/home/user".to_string());
        let canonicalize_str = fs::canonicalize(PathBuf::from_str(&home_dir).unwrap())?
            .join(".config/ethui/stacks/local")
            .to_string_lossy()
            .to_string();
        let data_dir_str = fs::canonicalize(&self.data_dir)?
            .to_string_lossy()
            .to_string();

        let mut binding = Command::new(docker_bin);
        let mut command = binding
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
            .arg(format!("{}:{}", self.host_port, self.container_port));

        if docker_bin.contains("podman") {
            command = command.arg("--replace");
        } else {
            command = command.arg("--rm");
        }

        command = command
            .arg(format!("--name={}", self.container_name))
            .arg(&self.image_name);

        let output = command.output()?;

        if !output.status.success() {
            return Err(eyre!(
                "Failed to start container: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        Ok(self.transition())
    }
}

pub fn initialize(
    port: u16,
    config_dir: PathBuf,
) -> color_eyre::Result<DockerManager<ContainerNotRunning>> {
    let manager = DockerManager::new(
        config_dir.join("local/"),
        "ghcr.io/ethui/stacks:latest".to_string(),
        "ethui-local-stacks".to_string(),
        4000,
        port,
    )
    .check_socket_and_bin()?
    .check_docker_installed()?
    .check_image_available()?
    .ensure_data_directory()?
    .initialize()?;

    Ok(manager)
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use tempfile::TempDir;
    use tokio::time::sleep;

    use super::*;

    const TEST_PORT: u16 = 5678;
    const TEST_CONTAINER_PORT: u16 = 8080;
    const TEST_IMAGE: &str = "jmalloc/echo-server";
    const TEST_CONTAINER: &str = "ethui-test-http-echo";

    async fn wait_for_container_ready() -> Result<(), Box<dyn std::error::Error>> {
        let client = reqwest::Client::new();
        let mut attempts = 0;
        const MAX_ATTEMPTS: u32 = 30;

        while attempts < MAX_ATTEMPTS {
            match client
                .get(format!("http://localhost:{TEST_PORT}"))
                .timeout(Duration::from_secs(1))
                .send()
                .await
            {
                Ok(response) => {
                    if response.status().is_success() {
                        return Ok(());
                    }
                }
                Err(_) => {
                    sleep(Duration::from_secs(1)).await;
                }
            }
            attempts += 1;
        }

        Err("Container failed to become ready within timeout".into())
    }

    async fn make_http_request() -> Result<String, Box<dyn std::error::Error>> {
        let client = reqwest::Client::new();
        let response = client
            .get(format!("http://localhost:{TEST_PORT}"))
            .timeout(Duration::from_secs(5))
            .send()
            .await?;

        if response.status().is_success() {
            let body = response.text().await?;
            Ok(body)
        } else {
            Err(format!("HTTP request failed with status: {}", response.status()).into())
        }
    }

    #[tokio::test]
    async fn test_docker_container_lifecycle() -> Result<(), Box<dyn std::error::Error>> {
        let temp_dir = TempDir::new()?;
        let config_dir = temp_dir.path().to_path_buf();

        let manager = DockerManager::new(
            config_dir.join("test-local/"),
            TEST_IMAGE.to_string(),
            TEST_CONTAINER.to_string(),
            TEST_CONTAINER_PORT,
            TEST_PORT,
        );

        let docker_manager = manager
            .check_socket_and_bin()?
            .check_docker_installed()?
            .check_image_available()?
            .ensure_data_directory()?;

        docker_manager.clone().run()?.check_health()?;

        wait_for_container_ready().await?;

        let response = make_http_request().await?;

        if !response.contains("Request served by") {
            return Err(format!("Expected 'hello world' in response, got: {response}").into());
        }

        docker_manager.stop()?.check_stopped()?;

        sleep(Duration::from_secs(2)).await;

        match make_http_request().await {
            Ok(_) => Err("Container should not be accessible after stopping".into()),
            Err(_) => Ok(()),
        }
    }

    #[tokio::test]
    async fn test_docker_manager_error_handling() -> Result<(), Box<dyn std::error::Error>> {
        let temp_dir = TempDir::new()?;
        let config_dir = temp_dir.path().to_path_buf();

        let docker_manager = DockerManager::new(
            config_dir.join("test-local/"),
            "nonexistent-image:latest".to_string(),
            "test-nonexistent".to_string(),
            8080,
            12345,
        );

        let result = docker_manager
            .check_socket_and_bin()?
            .check_docker_installed()?
            .check_image_available();

        assert!(result.is_err(), "Should fail with nonexistent image");

        Ok(())
    }

    #[tokio::test]
    async fn test_image_version_checking() -> Result<(), Box<dyn std::error::Error>> {
        let temp_dir = TempDir::new()?;
        let config_dir = temp_dir.path().to_path_buf();

        let docker_manager = DockerManager::new(
            config_dir.join("test-local/"),
            TEST_IMAGE.to_string(),
            "test-image-check".to_string(),
            8080,
            12345,
        );

        let result = docker_manager
            .check_socket_and_bin()?
            .check_docker_installed()?
            .check_image_available();

        assert!(
            result.is_ok(),
            "Image checking should succeed for valid image"
        );

        Ok(())
    }
}
