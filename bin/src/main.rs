use ethui_lib::error::AppResult;

fn main() -> AppResult<()> {
    dbg!("main");
    ethui_lib::run()?;

    Ok(())
}
