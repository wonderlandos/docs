---
title: Sealed boot and lockdown
description: "How WolOS seals the installed system with fs-verity, checks it at every start and falls back to the other slot, how disk encryption works, and where kernel lockdown stands."
---

The system you start should be the one that was installed or updated, byte for byte. WolOS checks that at every start, and starts the previous copy if it does not match.

## The seal

**Released.** When the installer finishes a slot, and when an update builds a new one, it runs `wol seal apply`:

1. fs-verity is enabled on every executable and library in the slot. fs-verity is upstream Linux: the kernel builds a Merkle tree for each file and checks every page read against it, so a changed byte fails the read.
2. A manifest of those files and their fs-verity digests is written inside the slot.
3. The manifest's own root digest is written to the EFI partition, next to the slot's kernel.
4. The slot's subvolume is made read-only. The root is mounted `ro`, and an overlay keeps `/etc` writable.

Kernel options used: `CONFIG_FS_VERITY` and `CONFIG_OVERLAY_FS`, both built in.

## The check at every start

`wolos-verity-check.service` runs early, before `sysinit.target`, and calls `wol seal check`:

- It measures every file in the manifest and compares the result with the root digest stored on the EFI partition.
- **On a match**, the start goes on.
- **On a mismatch**, the slot is marked failed, a notice says what did not match, and if the other slot has a working boot entry and has not failed itself, the computer restarts into it. That is the system as it was before the last update. See [Updates, slots and rollback](/docs/using/updates/).
- A system from before sealing existed has no stored digest and is not checked.

## Changing a sealed system

The seal does not stop you from installing software. `pacman` changes go into a systemd-sysext layer over `/usr`, or to the pending slot for kernel, initramfs and systemd packages, and the next update folds them in. See [wopkg and .wol packages](/docs/developers/wopkg/#on-the-sealed-system).

For development, `wol seal off` (as root) makes the running system writable and stops the boot check until the next update.

## Disk encryption

**Released**, chosen at install.

- LUKS2 under Btrfs, with dm-crypt built into the kernel.
- With a TPM 2.0 chip, the disk unlocks itself at start. Without one, a passphrase of 8 or more characters.
- A recovery key is shown once by the installer.

Kernel options used: `CONFIG_DM_CRYPT`, `CONFIG_TCG_TPM`, `CONFIG_TCG_TIS`, `CONFIG_TCG_CRB`.

## Kernel lockdown

**Configuration, unchanged from the base config.** WolKernel does not patch lockdown.

- The lockdown security module is built in and listed in `CONFIG_LSM` (`landlock,lockdown,yama,integrity,bpf`), and it is not forced at build time (`CONFIG_LOCK_DOWN_KERNEL_FORCE_NONE`).
- WolOS does not turn it on by default. You can turn it on with the upstream boot parameter `lockdown=integrity` (blocks changes to the running kernel from user space, such as writing kernel memory or loading unsigned modules) or `lockdown=confidentiality` (also blocks reading kernel memory). Both can break tools that read or change the kernel, such as some tracing and DKMS module setups.
- Module signing is built (`CONFIG_MODULE_SIG`) but not enforced (`CONFIG_MODULE_SIG_FORCE` off), so DKMS modules such as NVIDIA and ZFS keep loading.

## Secure Boot

Starting with Secure Boot on needs the WolOS key enrolled once through the MOK screen. **Experimental.** See [Secure Boot and MOK](/docs/getting-started/secure-boot/).

## Other hardening defaults

Set by sysctl in the image, each with its reason: `kernel.kptr_restrict=2`, `kernel.dmesg_restrict=1`, `kernel.yama.ptrace_scope=1` (a process may trace only its own children), `kernel.unprivileged_bpf_disabled`, protected hard links and symlinks, and TCP SYN cookies. `wol security` shows each one as read from the running system.
