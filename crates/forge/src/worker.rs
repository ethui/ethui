use tokio::sync::mpsc::UnboundedReceiver;

pub(crate) struct Worker {
    rcv: UnboundedReceiver<notify::Result<notify::Event>>,
}

impl Worker {
    pub fn new(rcv: UnboundedReceiver<notify::Result<notify::Event>>) -> Self {
        Self { rcv }
    }

    pub async fn run(mut self) {
        while let Some(msg) = self.rcv.recv().await {
            match msg {
                Ok(event) => {
                    tracing::info!("event: {:?}", event);
                    // convert event to a match, notify if successful
                    //if let Ok(m) = event.try_into() {
                    //    snd.send(m).unwrap();
                    //}
                }

                Err(e) => {
                    tracing::warn!("watch error: {:?}", e)
                }
            }
        }
    }
}
