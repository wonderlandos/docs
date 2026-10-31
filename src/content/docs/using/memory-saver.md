---
title: Memory Saver
description: "How WolOS keeps the app in front smooth when memory runs low, by pausing apps in the background and swapping to compressed RAM."
---

When memory runs low, most systems slow down everywhere at once. WolOS protects what you are using: the app in front and your desktop keep running, and work you are not looking at gives way first.

:::caution[Experimental]
Memory Saver is experimental. It is being tuned on real machines, and its behaviour may change between releases.
:::

## What it does

- **Pauses apps in the background under memory pressure.** WolOS watches the kernel's memory pressure (PSI). When pressure builds, the session pauses background apps with the cgroup v2 freezer. A paused app keeps its windows and its state; it just does not run. It continues the moment you switch back to it.
- **Swaps to compressed RAM first.** Swap is zram: compressed memory, with zstd, up to half your RAM and at most 8 GiB. Swapping to it is cheap, so idle pages move there early, and they are read back one page at a time.
- **Keeps what you use in memory.** The kernel's MGLRU page reclaim keeps the pages you are using and gives up the ones you are not.
- **Spares your desktop if memory runs out.** The window server and the shell are marked to be spared by the out-of-memory killer (`oom_score_adj` -900), and background work is marked to go first (+300). You keep a working screen and can save your work.

## What you notice

- Switching back to a paused app can take a moment while it wakes.
- A background download or sync may pause under pressure and continue after.

## Under the hood

The kernel side is documented in [Memory and I/O](/docs/advanced/kernel-memory-io/): PSI, zram and zswap, and the out-of-memory policy.
