---
title: Welcome
description: "What WolOS is, what it runs on, and how these docs are organised."
---

WolOS is an open source desktop operating system for ordinary PCs. It is built on Arch Linux packages, with a Rust system API, a GTK 4 shell (menu bar, Dock, Search, Control Center, Settings, Store, Setup Assistant), a Hyprland-based window server, and WolKernel, a Linux kernel tuned for the app in front and for Steam and Proton games.

Updates land in a second copy of the system, so the version you had before is one restart away. See [Updates, slots and rollback](/docs/using/updates/).

:::caution[Active development]
The image installs offline and boots. The full desktop is still being proven on real hardware. Expect rough edges, and keep a backup of anything important.
:::

## What it runs on

- Ordinary x86-64 PCs and laptops, booting with UEFI or BIOS.
- At least 16 GB of disk for an install. The installer refuses smaller disks.
- Support is widened step by step, starting with Intel graphics. NVIDIA cards use the open driver.

## What runs on it

Anything that runs on Arch Linux's stock kernel runs on WolKernel: 32-bit software and Steam, Wine and Proton, Flatpak, AppImage and Snap, Docker and Podman, KVM, QEMU and VirtualBox, browser sandboxes, and DKMS modules such as NVIDIA, ZFS and v4l2loopback.

## How these docs are organised

| Section | For |
|---|---|
| Getting started | Trying WolOS from a USB stick, installing it, Secure Boot |
| Using WolOS | The Store, the AUR tab, ClamAV, Memory Saver, updates and rollback |
| Developers | libwol, wopkg and `.wol` packages, building the image |
| Advanced | What WolKernel changes in Linux, and how to turn each change off |
| Legal | Licenses and where the source lives |
