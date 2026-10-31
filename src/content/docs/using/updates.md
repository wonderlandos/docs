---
title: Updates, slots and rollback
description: "How WolOS finds updates, installs a new release into a second copy of the system, and goes back if the new one does not start."
---

WolOS keeps two copies of the system, called slots: `@wolos-a` and `@wolos-b`. You run one. A new release is built in the other, and the one you ran stays as it was, as your restore point.

## How updates are found

- A timer checks hourly, and at most every 20 hours actually looks: packages in your release, known vulnerabilities, installed kernels, and the signed release manifest.
- Findings are only reported. Nothing installs without you.
- **Updates Available** tells you when security fixes are included.

## Two kinds of update

| Kind | What moves | How |
|---|---|---|
| **Update Now** in Software Update | WolOS's own packages within your release | Installs in place on the running system |
| **A new release** | Everything: the Arch snapshot date, WolOS packages, the base system, the kernel | Built in the other slot, starts at the next restart |

Each release pins every package to one tested Arch Linux Archive date, so nothing rolls in between releases.

## How a new release is installed

1. The running system is copied into the other slot (the older restore point there is deleted first).
2. That copy moves to the new release date and is upgraded, with the base system as one unit.
3. The kernel, initramfs and command line are built into one unified kernel image, signed with this computer's key, with a boot entry that gets three tries.
4. Entries sort by generation, so the new one starts next. There is no fixed default to go stale.

If any step fails, the new slot is deleted and nothing changes. Packages you installed yourself come along, because the slot is a copy, not a fresh image. From the terminal, the same is `sudo wol update apply`; `wol update status` shows what is pending.

## Rollback

**Automatic.** A start counts as good when the login window comes up. If the new release fails to start three times, its entry sorts behind the other one and the boot loader starts the other slot: the system you had before. Once a start is good, the other slot's menu entry is marked as the previous version.

**By hand.** Hold a key while the computer starts to show the boot menu, and pick the entry for the other slot. From a running system, `wopkg rollback system` does the same. A copy older than both kept slots is refused at start, so a retired version cannot be brought back by copying an old image.

**After a failed seal check.** If system files do not match their seal at start, WolOS starts the other copy of the system. See [Sealed boot and lockdown](/docs/advanced/sealed-boot/).

Your files in `@home` and the state in `@var` are shared by both slots, so going back does not lose your documents.

## Other kernels

You can install other kernels with pacman. Each gets its own boot entry and is never made the default; `linux-wolos` stays the default. `wol update status` reports them.
