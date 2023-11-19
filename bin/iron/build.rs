fn main() {
    if cfg!(target_os = "macos") {
        // statically link libusb on macos
        println!("cargo:rustc-link-lib=static=usb-1.0");
    }

    tauri_build::build();
}
