use super::worker::Msg;

pub trait Consumer: Send + Clone {
    fn process(&mut self, msg: Msg) -> impl std::future::Future<Output = ()> + Send;
}