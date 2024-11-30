{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    utils.url = "github:numtide/flake-utils";
    rust.url = "github:oxalica/rust-overlay";
  };
  outputs =
    {
      self,
      nixpkgs,
      utils,
      rust,
    }:
    utils.lib.eachDefaultSystem (
      system:

      let
        overlays = [ (import rust) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };
        buildInputs = with pkgs; [
          pkg-config
          dbus
          glib
          gtk3
          bacon
          at-spi2-atk
          atkmm
          gdk-pixbuf
          gobject-introspection
          harfbuzz
          webkitgtk_4_1
          openssl
          watchexec
        ];
        libraries = with pkgs; [
          cargo-tauri
          pango
          cairo
          librsvg
          atk.dev
          libappindicator
          glib-networking
        ];
      in
      with pkgs;
      {
        devShells.default = mkShell {
          inherit buildInputs;

          shellHook = ''
            export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH

            export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS

            export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules/";
          '';
        };
      }
    );
}
