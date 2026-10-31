---
title: Try WolOS
description: "Download the image, write it to a USB stick and run WolOS without touching your disk."
---

You can run WolOS straight from a USB stick before you install anything. Nothing on your computer's disk changes while you try it.

## 1. Download the image

Release images are published on the [wolos-packages releases page](https://github.com/wonderlandos/wolos-packages/releases), next to the `[wolos]` package repository. Earlier preview images are on the [WolOS releases page](https://github.com/wonderlandos/wolos/releases). Each image comes with three files:

| File | What |
|---|---|
| `wolos-<date>-x86_64.iso` | The image: live desktop and installer, UEFI and BIOS |
| `wolos-<date>-x86_64.iso.sha256` | Its checksum |
| `wolos-<date>-x86_64.json` | The release manifest: version, Arch snapshot, kernel, size, SHA-256 |

:::note
Today's images are preview builds, marked as pre-releases. They are tested by build, not on every machine.
:::

Check the download before you use it:

```sh
sha256sum -c wolos-<date>-x86_64.iso.sha256
```

## 2. Write it to a USB stick

Use any tool that writes an image to a USB stick as is (a raw or "DD" write). The stick is erased. On Linux:

```sh
sudo dd if=wolos-<date>-x86_64.iso of=/dev/sdX bs=4M status=progress oflag=sync
```

Replace `/dev/sdX` with the stick, not your internal disk.

## 3. Start from the stick

Restart, open your firmware's boot menu (often F12, F11, F8 or Esc right after power-on) and pick the USB stick. The WolOS boot menu has two entries:

| Entry | Does |
|---|---|
| **WolOS** | Starts the live desktop. This is Try. |
| **Install WolOS** | Starts the same system with the installer |

The live image is unsigned: turn Secure Boot off (or put the firmware in Setup Mode) to start it. The installed system turns protection back on with its own keys; see [Secure Boot and the shim](/docs/getting-started/secure-boot/).

## While you try

- The desktop, the Store and Settings work as they will after an install.
- Everything you change lives in memory. Restart, and it is gone.
- **Install WolOS** in the Dock opens the [installer](/docs/getting-started/installer/) whenever you are ready.
