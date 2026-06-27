{
  pkgs,
}:

let
  buildInputs = with pkgs; [
    openssl
    webkitgtk_4_1
    gtk3
    cairo
    gdk-pixbuf
    glib
    dbus
    libsoup_3
    pkg-config
    at-spi2-atk
    atkmm
    gobject-introspection
    harfbuzz
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
  inherit buildInputs;

  shellHook = ''
    export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH

    export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS

    # Both variables needed for GIO TLS modules (glib-networking)
    export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules/"
    export GIO_EXTRA_MODULES="${pkgs.glib-networking}/lib/gio/modules/"
  '';
}
