{
  inputs = {
    nixpkgs.url = "github:nixos/nixpks/nixos-unstable";
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
          inherit system overlay;
        };
      in
      {
        devShells.default = mkShell {
          buildInputs = [ rust-bin.stable.latest.default ];
        };
      }
    );
}
