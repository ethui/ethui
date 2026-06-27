use tracing::debug;

use crate::tracker::{consumer::Consumer, worker::Msg};

#[derive(Clone)]
pub struct TestConsumer;

impl Consumer for TestConsumer {
    async fn process(&mut self, msg: Msg) -> color_eyre::Result<()> {
        debug!("TestConsumer processing message: {:?}", msg);
        Ok(())
    }
}
