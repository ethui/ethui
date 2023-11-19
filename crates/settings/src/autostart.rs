use crate::Result;
use auto_launch::{AutoLaunch, AutoLaunchBuilder};

pub fn update(v: bool) -> Result<()> {
    let handle = handle()?;

    if handle.is_enabled()? == v {
        return Ok(());
    }

    if v {
        dbg!("enabling");
        handle.enable()?
    } else {
        dbg!("disabling");
        handle.disable()?
    }

    Ok(())
}

fn handle() -> Result<AutoLaunch> {
    let app_path = std::env::current_exe()?
        .into_os_string()
        .to_str()
        .unwrap()
        .to_owned();

    Ok(AutoLaunchBuilder::new()
        .set_app_name("iron")
        .set_app_path(&app_path)
        .set_use_launch_agent(true)
        .set_args(&["--hidden"])
        .build()?)
}
