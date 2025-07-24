{
  pkgs,
  rust,
}:

let
  cargoToml = builtins.fromTOML (builtins.readFile ../Cargo.toml);

  desktopItem = pkgs.makeDesktopItem {
    name = "ethui";
    exec = "ethui";
    desktopName = "ethui";
    comment = "Ethereum Toolkit";
    icon = "ethui";
    terminal = false;
    type = "Application";
  };
in
rust.buildRustPackage (finalAttrs: {
  pname = "ethui";
  version = cargoToml.workspace.package.version;

  src = ../.;
  NIX_BUILD = "1";

  cargoRoot = ".";

  buildInputs = with pkgs; [
    openssl
    webkitgtk_4_1
    gtk3
    cairo
    gdk-pixbuf
    glib
    dbus
    libsoup_2_4
    pango
    cairo
    librsvg
    libappindicator
  ];

  nativeBuildInputs = with pkgs; [
    atk.dev
    glib-networking
    cargo-tauri.hook
    nodejs
    pnpm.configHook
    pkg-config
    wrapGAppsHook3
  ];

  # necessary for tauri apps apparently
  # taken from https://github.com/NixOS/nixpkgs/blob/nixos-unstable/pkgs/by-name/po/pot/package.nix
  postPatch = ''
    substituteInPlace $cargoDepsCopy/libappindicator-sys-*/src/lib.rs \
      --replace-fail "libayatana-appindicator3.so.1" "${pkgs.libayatana-appindicator}/lib/libayatana-appindicator3.so.1"
  '';

  cargoDeps = rust.fetchCargoVendor {
    inherit (finalAttrs)
      pname
      version
      src
      cargoRoot
      ;
    hash = "sha256-M837aunkz5TegtmtA+IODV5B5IykLijSweNsL8mrilY=";
  };

  pnpmDeps = pkgs.pnpm.fetchDeps {
    inherit (finalAttrs) pname version src;
    fetcherVersion = 1;
    hash = "sha256-0nqmKRiQN6f6sEzY9hcGzY9mg3kLZgAFM2He55souOc=";
  };

  preBuild = ''
    chmod +x scripts/postbuild.sh
    substituteInPlace scripts/postbuild.sh \
      --replace "#!/usr/bin/env bash" "#!${pkgs.bash}/bin/bash"
  '';

  postInstall = ''
    mkdir -p $out/share/applications
    cp ${desktopItem}/share/applications/* $out/share/applications/

    mkdir -p $out/share/pixmaps
    cp ${finalAttrs.src}/bin/icons/icon.png $out/share/pixmaps/ethui.png
  '';
})
