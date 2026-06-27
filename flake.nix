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

        # `minimal` (rustc + cargo + rust-std) keeps the build working while
        # dropping rust-docs/clippy/rustfmt, which otherwise leak ~570MB of
        # rust-docs into the runtime closure. Add only what the build needs.
        rustToolchain = pkgs.rust-bin.nightly.latest.minimal.override {
          extensions = [ "rust-src" ];
        };
        rustNightly = pkgs.makeRustPlatform {
          cargo = rustToolchain;
          rustc = rustToolchain;
        };
      in
      with pkgs;
      {
        packages =
          let
            packageSet = import ./nix/package.nix {
              rust = rustNightly;
              inherit pkgs;
            };
          in
          {
            default = packageSet.package;
            pnpmDeps = packageSet.pnpmDeps;
          };

        devShells.default = import ./nix/devshell.nix {
          inherit pkgs;
        };
      }
    );
}
