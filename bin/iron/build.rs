fn main() {
    println!("cargo:rerun-if-changed=bin/iron/token_list.json");
    iron_token_list::build();

    tauri_build::build();
}
