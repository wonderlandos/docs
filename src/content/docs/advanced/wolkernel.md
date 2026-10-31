---
title: WolKernel vs upstream Linux
description: "What WolKernel is, how it differs from upstream Linux, how each change is switched off, and which changes are released or still in development."
---

WolKernel is the Linux kernel of WolOS, packaged as `linux-wolos`. It is upstream Linux with a small set of desktop and gaming patches, a tuned configuration, a QoS interface for the WolOS session, a short list of removed interfaces, and a stable module ABI per release line.

The current release is **WolKernel 1.0 (7.3)**: WolKernel release 1.0 on Linux 7.3. `uname -r` ends in `-wolos`, and `uname -v` names the release.

## How the fork is kept

- Source: [wonderlandos/linux](https://github.com/wonderlandos/linux). `master` mirrors upstream. The `wolos` branch sits on a pinned upstream ref and carries the WolOS commits, each explained on these pages.
- The WolOS package builds the commit pinned in [`kernel/linux-wolos/ref`](https://github.com/wonderlandos/wolos/blob/main/kernel/linux-wolos/ref) over Arch Linux's x86_64 config, then applies the WolOS config fragment.
- Each WolOS change is one small commit **with a runtime off switch**, so a rebase stays cheap. A change that upstream gains is dropped.
- On each stable bump the commits are rebased, the config is re-run with `make olddefconfig`, and every changed option is reviewed.

## Status labels used in these pages

| Label | Means |
|---|---|
| **Released** | In WolKernel 1.0: on the `wolos` branch at the pinned release commit |
| **Development** | On a `wolos-*` development branch of the fork. Not in a release. Experimental: it may change, move or be dropped before it ships. |
| **Configuration** | Not a patch: a config or sysctl choice, with its own off switch |

Measured numbers on these pages come from the project's own test runs, with the machine and test named. They are development measurements, not guarantees for your machine.

## Configuration choices

The fragment `kernel/configs/wolos.config` sits over Arch Linux's x86_64 config:

| Area | Choice |
|---|---|
| Latency | Full preemption, 1000 Hz, tickless only when idle |
| Scheduling | `sched_ext` with BPF JIT and BTF. With no BPF scheduler loaded, the stock EEVDF scheduler runs. |
| Memory | Transparent hugepages on request (`madvise`), MGLRU, zram and zswap with zstd (zswap built but off, since zram is the swap), PSI on |
| Games | `ntsync` as a module; `futex_waitv` is always built |
| Root file system | btrfs built in; fs-verity and overlayfs for the sealed system; dm-crypt and TPM drivers for encrypted disks |
| Not built | Datacenter-only hardware: InfiniBand, Fibre Channel, storage targets, legacy RAID cards, telecom links, cluster file systems |

Measured on 7.3.0 with `make olddefconfig`, before the 1.0 trim: Arch's config builds 6332 modules and 3247 built-in options; WolKernel 6154 and 3164 (178 fewer modules, 83 fewer built-in options). 1.0 itself has not been re-measured.

## Removed interfaces

`wol doctor` checks for each of them. Among them: the x32 ABI, the vsyscall page (boot with `vsyscall=xonly` for static binaries from before 2011), `int $0x80` from 64-bit code (the `abi.int80_64=1` sysctl restores it), pre-ACPI MP tables, floppy, parallel port, PCMCIA and CardBus, RxRPC, TIPC, RDS, Phonet and IEEE 802.15.4 sockets, and the unused security modules Smack, TOMOYO, IPE, SafeSetID and LoadPin.

The promise: anything that runs on Arch Linux's stock kernel runs on WolKernel, including 32-bit software and Steam, Wine and Proton, Flatpak, AppImage, Snap, Docker, Podman, KVM, QEMU, VirtualBox, browser sandboxes and DKMS modules.

## Stable module ABI

`CONFIG_MODVERSIONS` is on. Within a release line (one kernel major version), exported symbols and their CRCs do not change, so out-of-tree modules built once keep loading. A new line may change them, and DKMS rebuilds once.

## The changes, by area

| Area | Page |
|---|---|
| Scheduler: QoS classes, `scx_wolos`, slices, proxy execution, shield, PSI | [Scheduling and QoS](/docs/advanced/kernel-scheduling/) |
| Futex, `futex_waitv`, ntsync, SysV semaphores, pipes, epoll, busy poll | [Locks and waits](/docs/advanced/kernel-locks/) |
| SLUB sheaves, zswap, readahead, exit teardown, out-of-memory policy | [Memory and I/O](/docs/advanced/kernel-memory-io/) |
| Syscall entry and exit, audit, Btrfs, i915 boosts, APFS | [Entry, graphics and filesystems](/docs/advanced/kernel-entry-gpu-fs/) |
| fs-verity sealed system, encryption, kernel lockdown | [Sealed boot and lockdown](/docs/advanced/sealed-boot/) |

## The /sys/kernel/wolos interface

**Released.** `CONFIG_WOLOS_HINTS` adds `/sys/kernel/wolos`:

| File | Means |
|---|---|
| `abi_version` | Read only. Increments on any change; fields are never repurposed. |
| `foreground_pid` | Root writes the thread group id of the frontmost app; 0 means none. Drivers read it with `wolos_foreground_tgid()`. |

The session daemon `wold` writes `foreground_pid` on every app switch. Off switch: `CONFIG_WOLOS_HINTS=n`.

## Build it

```sh
make wolos_defconfig     # or: make <your config>; make wolos.config
make -j"$(nproc)"
```

The release package is built by `kernel/linux-wolos/PKGBUILD` in the WolOS repository. See [Building the image](/docs/developers/building/#build-the-kernel).
