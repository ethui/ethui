/// Request the main window to open on the current running Iron process.
/// Used by the app to open the window of an existing process instead of instantiating a new one
pub async fn request_main_window_open() -> crate::Result<()> {
    let addr: String = std::env::var("IRON_HTTP_SERVER_ENDPOINT")
        .unwrap_or("127.0.0.1:9003".into())
        .parse()
        .unwrap();

    reqwest::Client::new()
        .post(format!("http://{}/iron/ui/show", addr))
        .send()
        .await?;
    Ok(())
}
