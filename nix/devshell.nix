{
  pkgs,
}:

let
  buildInputs = with pkgs; [
    openssl
    zlib
    webkitgtk_4_1
    gtk3
    cairo
    gdk-pixbuf
    glib
    dbus
    libsoup_3
    at-spi2-atk
    atkmm
    harfbuzz
  ];

  nativeBuildInputs = with pkgs; [
    pkg-config
    gobject-introspection
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
pkgs.mkShell {
  inherit buildInputs nativeBuildInputs;

  shellHook = ''
    export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH

    export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS

    # Both variables needed for GIO TLS modules (glib-networking)
    export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules/"
    export GIO_EXTRA_MODULES="${pkgs.glib-networking}/lib/gio/modules/"
  '';
}
