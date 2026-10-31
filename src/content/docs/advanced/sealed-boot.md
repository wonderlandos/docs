---
title: Sealed boot and lockdown
description: "How WolOS seals the installed system with fs-verity, checks it at every start and falls back to the other slot, how disk encryption works, and where kernel lockdown stands."
---

The system you start should be the one that was installed or updated, byte for byte. WolOS checks that at every start, and starts the previous copy if it does not match.

## The seal

**Released.** When the installer finishes a slot, and when an update builds a new one, it runs `wol seal apply`:

1. fs-verity is enabled on every executable and library in the slot. fs-verity is upstream Linux: the kernel builds a Merkle tree for each file and checks every page read against it, so a changed byte fails the read.
2. A manifest of those files and their fs-verity digests is written inside the slot.
3. The manifest's own root digest goes into the slot's signed kernel command line as `wolos.seal=`.
4. The slot's subvolume is made read-only. The root is mounted `ro`, and an overlay keeps `/etc` writable.

Kernel options used: `CONFIG_FS_VERITY` and `CONFIG_OVERLAY_FS`, both built in.

## The check at every start

`wolos-verity-check.service` runs early, before `sysinit.target`, and calls `wol seal check`:

- It measures every file in the manifest and compares the result with the root digest in the signed command line.
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

## Kernel lockdown and module signatures

**Released** on the protected Secure Boot tiers. WolKernel does not patch lockdown; it uses upstream's.

- The lockdown security module is built in and listed in `CONFIG_LSM` (`landlock,lockdown,yama,integrity,bpf`), and not forced at build time.
- On the `own-keys` and `mok` tiers, the signed command line inside each kernel image carries `lockdown=integrity module.sig_enforce=1`. User space then cannot change the running kernel (no writing kernel memory, no unsigned modules), and only signed modules load. The words are inside the signed image, so they cannot be removed at the boot menu.
- On the `off` tier neither word is set, and modules load as on a stock kernel.
- `lockdown=integrity` also blocks hibernation and raw MSR writes.
- Drivers built on the computer (DKMS, such as NVIDIA) are signed with a key the kernel trusts only through the MOK list, so they need the key screen once.

Check it with `cat /sys/kernel/security/lockdown`.

## Secure Boot and the TPM

The seal's digest travels inside the signed command line (`wolos.seal=`), so the boot signature covers the seal too; systems sealed before signed boot keep a copy on the EFI partition. The disk key follows a signed PCR 11 policy, so updates keep unlocking and a changed kernel, command line or initramfs does not. **Experimental.** The whole chain, the WolOS shim and the one-time key screen are on [Secure Boot and the shim](/docs/getting-started/secure-boot/).

## One-copy installs

When the system partition is not Btrfs, WolOS installs one copy instead of two: there is no seal, and updates go in place.

## Other hardening defaults

Set by sysctl in the image, each with its reason: `kernel.kptr_restrict=2`, `kernel.dmesg_restrict=1`, `kernel.yama.ptrace_scope=1` (a process may trace only its own children), `kernel.unprivileged_bpf_disabled`, protected hard links and symlinks, and TCP SYN cookies. `wol security` shows each one as read from the running system.
