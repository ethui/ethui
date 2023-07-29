use iron_db::DB;
use iron_types::UISender;

pub async fn init(db: DB, window_snd: UISender) {
    iron_sync_anvil::init(db.clone(), window_snd.clone());
    iron_sync_alchemy::init(db, window_snd).await;

    tokio::spawn(async { receiver().await });
}

async fn receiver() -> ! {
    todo!()
    // let mut rx = iron_broadcast::subscribe().await;
    //
    // loop {}
}
