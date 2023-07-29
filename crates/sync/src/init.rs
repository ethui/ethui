use iron_broadcast::InternalMsg;
use iron_db::DB;
use iron_types::{ChecksummedAddress, UISender};
use tokio::sync::mpsc;

pub async fn init(db: DB, window_snd: UISender) {
    iron_sync_anvil::init(db.clone(), window_snd.clone());
    iron_sync_alchemy::init(db, window_snd).await;

    let (snd, rcv) = mpsc::unbounded_channel();
    tokio::spawn(async { receiver(snd).await });
    tokio::spawn(async { worker(rcv).await });
}

#[derive(Debug)]
enum Msg {
    Track(ChecksummedAddress),
    Untrack(ChecksummedAddress),
}

async fn receiver(snd: mpsc::UnboundedSender<Msg>) -> ! {
    let mut rx = iron_broadcast::subscribe().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            match msg {
                TrackAddress(addr) => {
                    snd.send(Msg::Track(addr)).unwrap();
                }
                UntrackAddress(addr) => {
                    snd.send(Msg::Untrack(addr)).unwrap();
                }
                _ => {}
            };
        }
    }
}

async fn worker(rcv: mpsc::UnboundedReceiver<Msg>) -> ! {
    loop {}
}
