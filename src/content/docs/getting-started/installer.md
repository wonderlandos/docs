---
title: The installer, step by step
description: "Each screen of Install WolOS and the Setup Assistant, and what happens behind it."
---

Install WolOS is an app with one card per step. You never need a terminal.

## 1. Choose the disk

The list shows each disk by name and size. Only disks the installer may erase are listed: never the USB stick it started from, CDs, loop or RAM disks, read-only disks or disks smaller than 16 GB.

When you pick a disk, the installer checks it without writing anything, and names the other systems it finds on it (Windows, Linux and others).

## 2. Erase and Install

A warning names the disk and what is on it. **Erase and Install** checks the disk again before the first write. A refused disk says why, and is left exactly as it was.

Before the restart, the installer says in one sentence how this computer will use Secure Boot: its own keys, one blue key screen at the first start, off, or a firmware setting to change first. See [Secure Boot and the shim](/docs/getting-started/secure-boot/).

## 3. Progress

The Pocket Watch shows the step the installer is on and the time left. In order, it:

1. lays out the disk with `systemd-repart` (EFI partition and btrfs with `@wolos-a`, `@home`, `@var`), encrypted if you chose that,
2. copies the system from the USB stick, offline,
3. seals the new system,
4. makes this computer's boot keys, signs the boot loader and one unified kernel image for the slot, and writes a boot entry that gets three tries,
5. checks that the boot entry, the kernel image and the file system table are all in place.

The window does not close mid-install, and the machine does not sleep.

## 4. WolOS Is Installed

**Restart** and take the USB stick out.

If the install stops, it says where it stopped, cleans up and offers **Try Again** (back to the disk) or **Restart**.

## After the restart: Setup Assistant

1. **Welcome**, then **Continue**.
2. **Language & Region**: language and keyboard on one page, guessed for you. The keyboard applies at once, so your password is typed on it.
3. **Wi-Fi**: skipped on a wired machine. A wrong password says so.
4. **Create Your Account**: your full name fills the account name. The first account is an administrator.
5. **Appearance**: Light, Dark or Auto, and a look.
6. **You're All Set**: **Get Started** fades into the desktop.

Return continues and Escape goes back.

## Unattended installs

For test machines, `wolos.autoinstall=<disk>` on the live boot command line installs to that disk without questions, then powers off.
