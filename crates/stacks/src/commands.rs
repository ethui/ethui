use ethui_types::TauriResult;
use tauri::command;

use crate::actor::{CreateStack, ListStracks, RemoveStack};

#[command]
pub async fn stacks_create(slug: String) -> TauriResult<()> {
    crate::actor::ask(CreateStack(slug)).await?;
    Ok(())
}

#[command]
pub async fn stacks_list() -> TauriResult<Vec<String>> {
    let stacks = crate::actor::ask(ListStracks()).await?;
    Ok(stacks)
}

#[command]
pub async fn stacks_remove(slug: String) -> TauriResult<()> {
    println!("{slug}");
    let a = crate::actor::ask(RemoveStack(slug)).await;
    match a {
        Ok(_) => println!("ok"),
        Err(e) => println!("{e}"),
    }
    Ok(())
}
