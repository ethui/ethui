use auto_launch::{AutoLaunch, AutoLaunchBuilder, MacOSLaunchMode};

pub fn update(v: bool) -> color_eyre::Result<()> {
    let handle = handle()?;

    if handle.is_enabled()? == v {
        return Ok(());
    }

    if v {
        handle.enable()?
    } else {
        handle.disable()?
    }

    Ok(())
}

fn handle() -> color_eyre::Result<AutoLaunch> {
    let app_path = std::env::current_exe()?
        .into_os_string()
        .to_str()
        .unwrap()
        .to_owned();

    Ok(AutoLaunchBuilder::new()
        .set_app_name("ethui")
        .set_app_path(&app_path)
        .set_macos_launch_mode(MacOSLaunchMode::LaunchAgent)
        .set_args(&["--hidden"])
        .build()?)
}
