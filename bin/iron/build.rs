fn main() {
    // Specify the path to the static libusb library
    // println!("cargo:rustc-link-search=native=/usr/lib");
    // Instruct to link statically
    println!("cargo:rustc-link-lib=static=usb");

    tauri_build::build();
}
