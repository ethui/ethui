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

        cargoToml = builtins.fromTOML (builtins.readFile ./Cargo.toml);
        rustToolchain = pkgs.rust-bin.nightly.latest.default.override {
          extensions = [ "rust-src" ];
        };
        rustNightly = pkgs.makeRustPlatform {
          cargo = rustToolchain;
          rustc = rustToolchain;
        };

        commonDeps = with pkgs; [
          openssl
          webkitgtk_4_1
          gtk3
          cairo
          gdk-pixbuf
          glib
          dbus
          libsoup_2_4
        ];

        devDeps = with pkgs; [
          pkg-config
          bacon
          at-spi2-atk
          atkmm
          gobject-introspection
          harfbuzz
          webkitgtk_4_1
        ];

        buildDeps = with pkgs; [
          nodejs
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

        languages.javascript.package = pkgs.nodejs_24;
        languages.javascript.corepack.enable = true;

      in
      with pkgs;
      {
        packages.default = rustNightly.buildRustPackage (finalAttrs: {
          pname = "ethui";
          version = cargoToml.workspace.package.version;

          src = ./.;

          cargoRoot = ".";
          buildAndtestSubdir = ".";

          postPatch = ''
            substituteInPlace $cargoDepsCopy/libappindicator-sys-*/src/lib.rs \
              --replace-fail "libayatana-appindicator3.so.1" "${libayatana-appindicator}/lib/libayatana-appindicator3.so.1"
          '';

          cargoDeps = rustPlatform.fetchCargoVendor {
            inherit (finalAttrs)
              pname
              version
              src
              cargoRoot
              ;
            hash = "sha256-BJMvQNx1KVHvS7s5Y35j/aW2ZdbGotHcebuPgyaGn0c=";
          };

          pnpmDeps = pnpm.fetchDeps {
            inherit (finalAttrs) pname version src;
            fetcherVersion = 1;
            hash = "sha256-+nxjnDBojs1xrxmPJ+10q5vk7AhK2mXx5L50gy3EHQE=";
          };

          nativeBuildInputs = [
            cargo-tauri.hook
            nodejs
            pnpm.configHook
            pkg-config
            wrapGAppsHook3
          ];

          preBuild = ''
            chmod +x scripts/postbuild.sh
            substituteInPlace scripts/postbuild.sh \
              --replace "#!/usr/bin/env bash" "#!${bash}/bin/bash"
          '';

          buildInputs = commonDeps ++ buildDeps ++ libraries;

        });

        devShells.default = mkShell {
          buildInputs = commonDeps ++ devDeps ++ [ rustToolchain ];

          shellHook = ''
            export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH

            export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS

            export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules/";
          '';
        };
      }
    );
}
