/// Request the main window to open on the current running EthUI process.
/// Used by the app to open the window of an existing process instead of instantiating a new one
pub async fn request_main_window_open(port: u16) -> crate::Result<()> {
    let addr = format!("127.0.0.1:{}", port);

    reqwest::Client::new()
        .post(format!("http://{}/ethui/ui/show", addr))
        .send()
        .await?;
    Ok(())
}
