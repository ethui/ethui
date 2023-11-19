use crate::Result;
use auto_launch::AutoLaunch;

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
    let app_name = "iron";
    let app_path = std::env::current_exe()?
        .into_os_string()
        .to_str()
        .unwrap()
        .to_owned();
    let args = &["--hidden"];

    Ok(AutoLaunch::new(app_name, &app_path, args))
}
