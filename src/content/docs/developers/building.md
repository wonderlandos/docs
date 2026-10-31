---
title: Building the image
description: "Building WolOS from source, the [wolos] package repository and the live and installer ISO, and testing it in a VM."
---

WolOS is built from the [wonderlandos/wolos](https://github.com/wonderlandos/wolos) repository into a signed `[wolos]` package repository and a live and installer ISO, on Arch Linux packages pinned to one Arch Linux Archive date.

## Develop

```sh
cargo test --workspace
```

Run it before you send a change, keep changes focused, and say what you tested.

## Build the ISO

You need a host with archiso (any Arch host, or an `archlinux` container with podman) and about 20 GB free.

```sh
WOLOS_UNSIGNED=1 image/vm/build.sh       # local test repo and ISO
# or, signed:
WOLOS_SIGN_KEY=<gpg id> image/vm/build.sh
```

`image/build.sh` builds the `[wolos]` repo if missing, stages the profile and runs `mkarchiso`, then writes the ISO and its release manifest.

## Test it in a VM

The VM scripts use QEMU/KVM with OVMF and virtio-gpu, so the window server runs in the VM.

```sh
WOLOS_KEEP_DISK=1 image/vm/test-install.sh   # unattended install, checks, BOOT PASS|FAIL
image/vm/run-installed.sh                    # boot the installed disk
image/vm/run.sh                              # boot the live image
```

`test-install.sh` adds a bystander disk to prove the installer touches only the disk it was given.

## What is in the image tree

| Path | What |
|---|---|
| `image/arch/` | mkarchiso profile: `snapshot`, `pacman.conf` (`[wolos]` first, then core, extra and multilib at the snapshot), package list, boot entries |
| `image/repo/packages` | One line per package with its recipe, local dependencies and watched paths: the build order |
| `image/repo/build.sh` | The signed `[wolos]` repo, in that order: `linux-wolos`, `hyprland-wolos`, `wolos-system`, `wolos-base` |
| `image/files/` | systemd units and presets, sysctl.d, udev rules, the boot splash theme, the installer |
| `image/release-manifest.sh` | `release.json`: version, snapshot, repo, kernel, image, sha256, size |
| `image/sign-release.sh` | `release.json.sig`: raw Ed25519 with the package key |

## Build the kernel

WolKernel is packaged as `linux-wolos` from the fork at the commit in `kernel/linux-wolos/ref`:

```sh
cd kernel/linux-wolos
makepkg -s        # linux-wolos and linux-wolos-headers (for DKMS)
```

| Variable | Effect |
|---|---|
| `_march=generic\|v3\|v4\|native` | CPU level. `v3` and `v4` build `linux-wolos-v3` and `-v4`; `generic` stays the default for every x86-64 PC. |
| `_cc_o3=y` | `-O3` instead of `-O2` |
| `_use_llvm_lto=thin\|full` | Clang/LLVM build with ThinLTO or full LTO |
| `_localmodcfg=y` | Developer build of only the modules you use |

In the fork itself:

```sh
make wolos_defconfig     # or: make <your config>; make wolos.config
make -j"$(nproc)"
```

See [WolKernel vs upstream Linux](/docs/advanced/wolkernel/) for what the patches change.

## Move to a newer Arch snapshot

Change `image/arch/snapshot`, the dates in both `pacman.conf` files and in `repo/wolos-mirrorlist/` (file and pkgver), rebuild, and run `test-install.sh`.

## CI

| Workflow | Does |
|---|---|
| `packages.yml` (push to `main`) | Rebuilds changed packages in an Arch container and publishes the repo as release assets |
| `iso.yml` (tag `v*` or manual) | Builds the ISO; the release carries the ISO, `.sha256`, `release.json` and `release.json.sig` |
| `kernel.yml` | `generic` and `v3` kernel packages; a `wolkernel-*` tag publishes a release |
