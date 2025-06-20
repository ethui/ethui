use kameo::{
    actor::ActorRef, error::BoxError, mailbox::bounded::BoundedMailbox, message::Message,
    request::TryMessageSend as _, Actor,
};
use ethui_types::UINotify;
use tracing::info;

#[derive(Default)]
pub struct Worker {
    pub stacks: bool,
}

pub enum Msg {
    SetStacks(bool),
}

impl Message<Msg> for Worker {
    type Reply = ();

    async fn handle(
        &mut self,
        msg: Msg,
        _ctx: kameo::message::Context<'_, Self, Self::Reply>,
    ) -> Self::Reply {
        match msg {
            Msg::SetStacks(enabled) => {
                self.stacks = enabled;
                if enabled {
                    info!("Starting stacks docker image...");

                } else {
                    
                    info!("Stopping stacks docker image...");
                }
            }
        }
    }

}

impl Actor for Worker {
    type Mailbox = BoundedMailbox<Self>;

    async fn on_start(
        &mut self,
        _actor_ref: ActorRef<Self>,
    ) -> std::result::Result<(), BoxError> {
        Ok(())
    }
}
