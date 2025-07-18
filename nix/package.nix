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
    hash = "sha256-Kj4UeoaPiU53VTDQPso+AC/eGg9+LzXtv91OaIK3rSM=";
  };

  pnpmDeps = pkgs.pnpm.fetchDeps {
    inherit (finalAttrs) pname version src;
    fetcherVersion = 1;
    hash = "sha256-+nxjnDBojs1xrxmPJ+10q5vk7AhK2mXx5L50gy3EHQE=";
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

