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

        cargoToml = builtins.fromTOML (builtins.readFile ./bin/Cargo.toml);
        workspaceToml = builtins.fromTOML (builtins.readFile ./Cargo.toml);
        rustToolchain = pkgs.rust-bin.nightly.latest.default.override {
          extensions = [ "rust-src" ];
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
        packages.default = rustPlatform.buildRustPackage {
          pname = cargoToml.package.name;
          version = workspaceToml.workspace.package.version;
          src = ./.;
          cargoLock = {
            lockFile = ./Cargo.lock;
            allowBuiltinFetchGit = true;
          };

          nativeBuildInputs = [
            rustToolchain
            pkg-config
            wrapGAppsHook
            nodejs
          ];

          buildInputs = commonDeps ++ buildDeps;

          doCheck = false;

          # Allow network access for npm install
          __noChroot = true;

          configurePhase = ''
            export HOME=$(mktemp -d)
            export NPM_CONFIG_AUDIT=false
            export NPM_CONFIG_FUND=false
          '';

          buildPhase = ''
            npm install --frozen-lockfile
            npm run tauri build
          '';

          installPhase = ''
            mkdir -p $out/bin
            cp target/release/${cargoToml.package.name} $out/bin/${cargoToml.package.name}
          '';

          meta = with pkgs.lib; {
            description = "A desktop wallet for Ethereum and other EVM-compatible networks";
            homepage = workspaceToml.workspace.package.homepage;
            licence = licenses.mit;
          };
        };

        devShells.default = mkShell {
          buildInputs = commonDeps ++ devDeps;

          shellHook = ''
            export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH

            export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS

            export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules/";
          '';
        };
      }
    );
}
