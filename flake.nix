{
  description = "job-hunting monorepo development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.flake-utils.follows = "flake-utils";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ rust-overlay.overlays.default ];
        };

        rustToolchain = pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml;

        nodeMajor = builtins.head (builtins.match "([0-9]+)\\..*" (
          pkgs.lib.trim (builtins.readFile ./.node-version)
        ));
        nodejs = pkgs."nodejs_${nodeMajor}";

        # moonrepo CLI v2 — prebuilt binary from GitHub releases
        moonVersion = "2.3.2";
        moonTarget = {
          x86_64-linux   = "x86_64-unknown-linux-gnu";
          aarch64-linux  = "aarch64-unknown-linux-gnu";
          x86_64-darwin  = "x86_64-apple-darwin";
          aarch64-darwin = "aarch64-apple-darwin";
        }.${system};
        moonSha256 = {
          x86_64-linux   = "ed7a7b67c3afa5ab47bfda360dfb27dd47e82e4b3847d0e9de711c3f05292ac9";
          aarch64-linux  = "22930ff68775fd515fee39e4eea19ea5775e46151bf54368eccfbcf645b59f12";
          x86_64-darwin  = "e48a47f56e8333879cbf18f3c871ae8a85515c0733091d7a27608cdeedd2bfa4";
          aarch64-darwin = "5e7994592f46cb3b044296be64839a1017ce38f16748f0ab893d83d3ef192c7a";
        }.${system};
        moon = pkgs.stdenv.mkDerivation {
          name = "moon-${moonVersion}";
          src = pkgs.fetchurl {
            url = "https://github.com/moonrepo/moon/releases/download/v${moonVersion}/moon_cli-${moonTarget}.tar.xz";
            sha256 = moonSha256;
          };
          sourceRoot = "moon_cli-${moonTarget}";
          installPhase = ''
            install -m755 -D moon "$out/bin/moon"
            install -m755 -D moonx "$out/bin/moonx"
          '';
          meta.mainProgram = "moon";
        };
      in {
        packages.moon = moon;

        devShells = {
          default = pkgs.mkShell {
            packages = with pkgs; [
              rustToolchain
              nodejs
              pnpm
              just
              pkg-config
              moon
            ];

            buildInputs = with pkgs; [
              openssl
              sqlite
              postgresql_16
            ] ++ pkgs.lib.optionals pkgs.stdenv.isDarwin [
              pkgs.libiconv
              pkgs.darwin.apple_sdk.frameworks.Security
              pkgs.darwin.apple_sdk.frameworks.SystemConfiguration
              pkgs.darwin.apple_sdk.frameworks.CoreFoundation
            ];

            shellHook = ''
              echo "✦ job-hunting devShell (${system})"
              echo "  Rust: $(rustc --version)"
              echo "  Node: $(node --version)"
              echo "  pnpm: $(pnpm --version)"
              echo ""
              echo "  Run: moon run <task>"
            '';
          };

          server = pkgs.mkShell {
            packages = with pkgs; [
              rustToolchain
              pkg-config
            ];
            buildInputs = with pkgs; [
              openssl
              sqlite
              postgresql_16
            ] ++ pkgs.lib.optionals pkgs.stdenv.isDarwin [
              pkgs.libiconv
              pkgs.darwin.apple_sdk.frameworks.Security
              pkgs.darwin.apple_sdk.frameworks.SystemConfiguration
              pkgs.darwin.apple_sdk.frameworks.CoreFoundation
            ];
          };

          frontend = pkgs.mkShell {
            packages = with pkgs; [
              nodejs
              pnpm
            ];
          };
        };
      });
}
