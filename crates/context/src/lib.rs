use iron_types::AppEvent;
use tokio::sync::mpsc;

pub struct Context {
    pub db: iron_db::DB,
    pub app_snd: mpsc::UnboundedSender<AppEvent>,
}
