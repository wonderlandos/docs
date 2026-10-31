---
title: Install WolOS
description: "Before you install, what the install does to your disk, and what you get."
---

Installing WolOS erases one disk and puts WolOS on it. Read this page once before you start.

## Before you start

- **Back up.** The disk you pick is erased completely, every partition on it.
- **Disk:** at least 16 GB. The installer never offers the USB stick it started from, CDs, or disks that are read-only or in use.
- **Power:** plug a laptop in. The installer keeps the screen on and closing the lid does not sleep the machine while it works.
- **Secure Boot:** see [Secure Boot and MOK](/docs/getting-started/secure-boot/).

## Start the installer

Either pick **Install WolOS** in the USB stick's boot menu, or start [Try](/docs/getting-started/try/) and open **Install WolOS** from the Dock. Both run the same installer. [The installer, step by step](/docs/getting-started/installer/) shows each screen.

## What ends up on the disk

| Part | What |
|---|---|
| EFI system partition | 1 GiB, FAT32, label `WOLOS`, mounted at `/efi`. Holds the boot loader (systemd-boot), kernels and boot entries. |
| System partition | btrfs, label `WolOS`, optionally encrypted with LUKS2 |
| `@wolos-a` | The installed system (slot A). The first update creates `@wolos-b`. |
| `@home` | Your files, shared by both slots |
| `@var` | Logs, caches and state, shared by both slots |

The installed system is sealed: its programs and libraries are checked at every start. See [Sealed boot and lockdown](/docs/advanced/sealed-boot/).

## Disk encryption

The installer can encrypt the system partition with LUKS2:

- With a TPM 2.0 chip, the disk unlocks itself at start.
- Without one, you choose a passphrase of 8 or more characters.
- A recovery key is shown once. Write it down and keep it somewhere safe; WolOS does not keep a copy you can see later.

## After the install

Restart, take the USB stick out, and the [Setup Assistant](/docs/getting-started/installer/#after-the-restart-setup-assistant) asks four questions. Then you are on your desktop.
