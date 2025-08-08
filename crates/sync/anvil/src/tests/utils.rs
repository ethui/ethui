use tracing::debug;

use crate::tracker2::{consumer::Consumer, worker::Msg};

#[derive(Clone)]
pub struct TestConsumer;

impl Consumer for TestConsumer {
    async fn process(&mut self, msg: Msg) {
        debug!("TestConsumer processing message: {:?}", msg);
    }
}
