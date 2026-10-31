---
title: Entry, graphics and filesystems
description: "WolKernel's changes to syscall entry and exit, audit, Spectre-class mitigation defaults, the TSC, i915 frame-deadline and waitboost, the DRM scheduler, Btrfs and APFS, compared with upstream Linux."
---

## Syscall exit: leave `thread_info.status` alone

**Development (`wolos-bend`)**, experimental.

- **Upstream:** every return to user space clears `TS_COMPAT` with a read-modify-write, which dirties the first cache line of `task_struct` on every 64-bit syscall. That line also holds `__state`, `on_cpu` and `thread_info.cpu`, which wakers and mutex owner spinners read.
- **WolKernel:** the field is written only when a bit is set.
- **Measured:** `perf c2c` with `perf bench epoll wait` on a 48-core host: 976 of 14741 cache-line contention hits landed on this line before; after, it leaves the top lines. epoll, pipe, futex and syscall throughput did not change beyond noise.
- **Off switch:** none at runtime; the change has no behaviour of its own to turn off. Revert the commit.

## Syscall numbers out of range under ptrace

**Development (`wolos-bend`)**, experimental.

- **Upstream:** with `CONFIG_X86_X32_ABI` off, an invalid syscall number leaves `regs->ax` untouched, so a tracer that wrote `ax` at the entry stop gets its own value back instead of `-ENOSYS`. The `syscall_numbering_64` selftest failed 37800 calls on such kernels.
- **WolKernel:** out-of-range numbers return `-ENOSYS`. Number -1 keeps its old behaviour, since that is how a tracer skips a syscall.
- **Why:** WolKernel builds without x32, so it needs this to keep tracers correct.

## Audit: no syscall slow path without syscall rules

**Released.**

- **Upstream:** with audit enabled and no syscall rules, every task still takes the syscall entry and exit audit work to build an unused context.
- **WolKernel:** tasks drop the audit work while there are no syscall rules. The first syscall rule puts every task with a context back on it. Only a task clears its own flag, at the end of its exit work, so the entry and exit hooks always pair.
- A follow-up fix in WolKernel 1:1.0+7.3-2 made the entry hook build a syscall context only when the task has the audit work. Before it, a service with a seccomp filter could leave a context that no exit hook reset, and log an audit warning on every boot.
- **Off switch:** `CONFIG_WOLOS_AUDIT_LAZY=n`. WolOS also boots with `audit=0`; it ships no audit tools or audit-based security module.

## int $0x80 from 64-bit code

**Released.**

- **Upstream:** a 64-bit task can reach the 32-bit compat syscall table through `int $0x80`.
- **WolKernel:** it returns `-ENOSYS` for 64-bit tasks. 32-bit programs keep `int $0x80`.
- **Why:** 64-bit code only uses it from hand-written assembly or exploits.
- **Off switch:** sysctl `abi.int80_64=1`, or `CONFIG_WOLOS_NO_INT80_64=n`.

## Retbleed: call-depth stuffing on older Intel

**Released.**

- **Upstream:** `retbleed=auto` picks IBRS on every kernel entry on Intel CPUs without enhanced IBRS (the Skylake family, 6th to 9th generation Core). That slows syscall-heavy work by 10-30%.
- **WolKernel:** `retbleed=auto` picks call-depth stuffing there, which is already compiled in.
- **Off switch:** `retbleed=ibrs` at boot, or `CONFIG_WOLOS_RETBLEED_STUFF=n`.

## Defaults in the kernel

**Released.** `vm.max_map_count` is 1048576 (for game engines that map many regions) and `kernel.watchdog_thresh` 30, set in the kernel under `CONFIG_WOLOS_HINTS` so early boot and containers see the same values as the session. Change either with sysctl.

## TSC trust on single-socket machines

**Development**, experimental.

- **Upstream:** the TSC is trusted without the clocksource watchdog only when the CPU has `TSC_ADJUST`. Many AMD desktops do not, so the watchdog keeps reading the HPET twice a second and can demote the clock to HPET under load.
- **WolKernel:** on bare metal with one package and an invariant TSC, the TSC is trusted. Boot and hotplug sync checks stay.
- **Off switch:** `tsc=watchdog`.

## VT keyboard bypass

**Development**, experimental. When a graphical session owns the keyboard, the window server reads input directly, yet upstream still runs the console keymap, LED work and console handling for every key. WolKernel returns early in that case and keeps only what is needed to switch back.

## i915: frame-deadline boost and foreground waitboost

**Released.**

- **Upstream:** i915 raises GPU clocks through its own RPS autotuning, and a blocking wait from any process can "waitboost" the GPU to high clocks.
- **WolKernel:**
  - i915 fences implement `.set_deadline`. When the window server's atomic commit (or `SYNC_IOC_SET_DEADLINE`) sets the next vblank as the deadline, a request still running is boosted at once instead of waiting for autotuning.
  - Waitboost on a blocking wait applies only to the frontmost app (`foreground_pid`), so background GPU work stops raising clocks.
- **Why:** a frame about to be late gets help; apps behind you no longer raise power use and heat.
- **Off switch:** `i915.wol_deadline_boost=0`; `i915.wol_waitboost=1` restores upstream's waitboost for everyone, `0` turns waitboost off.

## DRM scheduler: optional high-priority submit queue

**Development (`wolos-gpu`)**, experimental, **off by default**.

- **Upstream:** every GPU job reaches the driver through an ordered workqueue at normal priority, so with every CPU busy a frame can wait a scheduler slice before it reaches the GPU ring.
- **WolKernel:** `drm_sched.submit_highpri=1` makes that workqueue high-priority, for every driver that leaves the default submit queue (amdgpu among them).
- **Measured** on the mock scheduler, every CPU busy at nice 0, 2000 jobs, 9 runs: the 99.9th percentile ranged from 8 us to 2.5 ms across runs by default, and from 5 to 12 us with the high-priority queue. The mock has no hardware, so this proves the workqueue hop only; no real driver was run with it.
- **Switch:** `drm_sched.submit_highpri=0` (default).

## Btrfs: keep the extent map for compressed reads

**Development (`wolos-btrfs`)**, experimental. A fix posted upstream by its author, ported to this tree.

- **Upstream:** when reading a compressed extent, Btrfs drops its reference on the extent map once the blocks are in the bio, and looks the map up again at submit time. The extent-map shrinker can remove it in between, and then the whole bio fails with `-EIO`. Under memory pressure, especially in a memory cgroup at its limit, this shows as spurious read errors on compressed files, and on buffered writes that read a partial page.
- **WolKernel:** the read keeps a reference on the extent map until the bio is submitted, and passes it on instead of looking it up again.
- **Why:** the WolOS root file system is Btrfs, and the error shows up under memory pressure.
- **Off switch:** none; it is a correctness fix.

## Lazy unmount without waiting for RCU

**Development (`wolos-forks-umount`)**, experimental. An upstream proposal ported to this tree: `umount -l` (`MNT_DETACH`) queues the detached mount to be released after an RCU grace period instead of waiting for one, so the call returns at once.

## APFS

**Released as a module**, experimental.

WolKernel includes an APFS file system module with read and write support, so APFS-formatted disks can be opened. A development branch (`wolos-apfs`) adds compressed small files (`chattr +c`), bounds checks on compressed data, listing a volume's snapshots, and fuzzing and corruption tests.

WolOS is an independent project and is not affiliated with, endorsed by, or sponsored by Apple Inc.
