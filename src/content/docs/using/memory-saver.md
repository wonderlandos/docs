---
title: Memory Saver
description: "How Memory Saver gives a background app's memory back to compressed RAM, what it never touches, how to turn it off, and how WolOS keeps one app from taking the desktop down."
---

Some apps hold hundreds of megabytes while hidden. Memory Saver gives that memory back while you are not using the app, and the app is usable again as soon as you return to it. It is **on by default**.

## What it does

- Each app with a window, with its whole process tree, gets its own systemd scope, so the session daemon `wold` can see what belongs to it.
- **30 seconds after an app stops being in use**, its memory is given back once, to zram (compressed RAM), by a low-priority worker. Pages charged to the app's scope are reclaimed with `memory.reclaim`; pages charged before the app was adopted are paged out with `process_madvise(MADV_PAGEOUT)`.
- Switching back cancels the worker. Pages come back by normal page faults, as the app touches them.
- Changed (dirty) pages are compressed or swapped, **never discarded**. The app resumes unchanged.

## What it never touches

The window server, the shell, audio, the app in front, apps playing sound or video, games, other users' processes, and apps you excluded.

## Settings

| Setting | Default |
|---|---|
| Memory Saver | On. Turning it off stops it at once. |
| Excluded apps | None. Excluded apps keep their memory. |
| Nap: pause an app that has been hidden and idle for 10 minutes | Off (experimental) |

The choices are kept in `~/.config/wolos/memory-saver.json`.

:::caution[Nap is experimental]
A paused app stops answering the window server, which then shows its not-responding dialog over it, so Nap stays off by default until that is solved. A browser with busy tabs never counts as idle.
:::

## What to expect

Measured by the project with four everyday desktop apps (a code editor, a browser with 20 tabs and two chat apps), on zram with zstd, medians of three cycles:

| | Off | Just after saving |
|---|---|---|
| Memory held by the four apps (PSS) | 3618 MiB | 1450 MiB |
| Memory available to the system | 10452 MiB | 11993 MiB |
| Focus to first frame, code editor | 88 ms | 197 ms |

- 2433 MiB of pages fit in 720 MiB of zram. Audio apps had nothing swapped in any run.
- Background tabs keep running, so a browser pulls pages back: after 4 minutes the four apps held about 2400 MiB, and available memory sat about 750 MiB above Off. That is the honest steady number.
- The first switch back after saving can take up to about 110 ms longer.
- These numbers come from a VM with software rendering. Restore on real hardware has not been measured.

## One app cannot take the desktop with it

Alongside Memory Saver, each app window's scope gets limits, so a runaway app (a fork bomb, a memory bomb, a full file table) cannot freeze the desktop:

- Each app: at most 8192 tasks, 80% of RAM and 25% of swap.
- The desktop session keeps CPU weight 1000 and 256 MB of protected memory; system services keep 128 MB, so login and Force Quit work under pressure.
- Fork storms die on their own: an app refused at least 2000 forks per tick, two ticks running, is ended. A program that backs off is never touched.
- An app killed for memory 4 times within 5 ticks is ended too, so one lost tab does not become a loop. This part is unit tested but not yet run in a test VM.
- Open files are charged to the app's memory instead of a shared system-wide count. `/tmp` and `/dev/shm` hold 25% of RAM each.

Measured in a throwaway 8 vCPU, 8 GB test VM: a fork bomb in an app window was dead in 7.1 s with 5 ms worst input latency for the desktop; under a memory bomb, starting a program took a median of 3.5 ms instead of 3.7 s. Recovery took 1.0 s or less in every run.

## Under the hood

Swap is zram with zstd, and the kernel's memory pressure information (PSI) is on. The kernel side is in [Memory and I/O](/docs/advanced/kernel-memory-io/).
