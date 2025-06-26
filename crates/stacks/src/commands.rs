async fn start_stacks() -> Result<(), String> {
    let manager = DockerManager::new(
        "/path/to/your/stacks-data".into(),
        "blockstack/stacks-blockchain:latest".into(), // Or your preferred image
        "stacks-node-mainnet".into(),
    );

    let ready_manager = manager
        .check_docker_installed().await?
        .check_image_available().await?
        .ensure_data_directory().await?
        .check_container_running().await?
        .check_health().await?;

    info!("Stacks is fully up and running!");
    Ok(())
}
