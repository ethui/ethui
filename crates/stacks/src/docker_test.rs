#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    use tempfile::TempDir;
    use tokio::time::sleep;

    const TEST_PORT: u16 = 5678;
    const TEST_IMAGE: &str = "hashicorp/http-echo";
    const TEST_CONTAINER: &str = "ethui-test-http-echo";

    async fn wait_for_container_ready() -> Result<(), Box<dyn std::error::Error>> {
        let client = reqwest::Client::new();
        let mut attempts = 0;
        const MAX_ATTEMPTS: u32 = 30; // 30 seconds timeout

        while attempts < MAX_ATTEMPTS {
            match client
                .get(&format!("http://localhost:{}", TEST_PORT))
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
                    // Container not ready yet, wait and retry
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
            .get(&format!("http://localhost:{}", TEST_PORT))
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
        // Create a temporary directory for the test
        let temp_dir = TempDir::new()?;
        let config_dir = temp_dir.path().to_path_buf();

        // Create the Docker manager
        let docker_manager = DockerManager::new(
            config_dir.join("test-local/"),
            TEST_IMAGE.to_string(),
            TEST_CONTAINER.to_string(),
        );

        // Step 1: Check socket and binary
        let docker_manager = docker_manager.check_socket_and_bin()?;
        println!("✅ Docker socket and binary check passed");

        // Step 2: Check if Docker is installed
        let docker_manager = docker_manager.check_docker_installed()?;
        println!("✅ Docker installation check passed");

        // Step 3: Check if the http-echo image is available, pull if not
        let docker_manager = match docker_manager.check_image_available() {
            Ok(manager) => {
                println!("✅ HTTP echo image already available");
                manager
            }
            Err(_) => {
                println!("📥 Pulling http-echo image...");
                let docker_bin = docker_manager.docker_bin()?;
                let output = std::process::Command::new(docker_bin)
                    .args(["pull", TEST_IMAGE])
                    .output()?;
                
                if !output.status.success() {
                    return Err(format!(
                        "Failed to pull image: {}",
                        String::from_utf8_lossy(&output.stderr)
                    ).into());
                }
                
                docker_manager.check_image_available()?
            }
        };

        // Step 4: Ensure data directory
        let docker_manager = docker_manager.ensure_data_directory()?;
        println!("✅ Data directory ready");

        // Step 5: Start the container
        let docker_manager = docker_manager.run(TEST_PORT)?;
        println!("✅ Container started");

        // Step 6: Wait for container to be ready
        println!("⏳ Waiting for container to be ready...");
        wait_for_container_ready().await?;
        println!("✅ Container is ready and responding");

        // Step 7: Make HTTP request and verify response
        println!("🌐 Making HTTP request...");
        let response = make_http_request().await?;
        println!("📄 Response received: {}", response);

        // The http-echo container should return "hello world" by default
        if !response.contains("hello world") {
            return Err(format!("Expected 'hello world' in response, got: {}", response).into());
        }
        println!("✅ HTTP response verification passed");

        // Step 8: Stop the container
        println!("🛑 Stopping container...");
        let docker_manager = docker_manager.stop(TEST_PORT)?;
        println!("✅ Container stopped");

        // Step 9: Verify container is stopped
        let docker_manager = docker_manager.check_stopped(TEST_PORT)?;
        println!("✅ Container stop verification passed");

        // Step 10: Verify HTTP endpoint is no longer accessible
        println!("🔍 Verifying container is no longer accessible...");
        sleep(Duration::from_secs(2)).await; // Give container time to fully stop
        
        match make_http_request().await {
            Ok(_) => return Err("Container should not be accessible after stopping".into()),
            Err(_) => {
                println!("✅ Container is no longer accessible");
            }
        }

        println!("🎉 All tests passed! Docker container lifecycle test completed successfully.");
        Ok(())
    }

    #[tokio::test]
    async fn test_docker_manager_error_handling() -> Result<(), Box<dyn std::error::Error>> {
        // Test with invalid image name
        let temp_dir = TempDir::new()?;
        let config_dir = temp_dir.path().to_path_buf();

        let docker_manager = DockerManager::new(
            config_dir.join("test-local/"),
            "nonexistent-image:latest".to_string(),
            "test-nonexistent".to_string(),
        );

        let result = docker_manager
            .check_socket_and_bin()?
            .check_docker_installed()?
            .check_image_available();

        assert!(result.is_err(), "Should fail with nonexistent image");
        println!("✅ Error handling test passed");

        Ok(())
    }
} 