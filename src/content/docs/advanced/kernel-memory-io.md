---
title: Memory and I/O
description: "WolKernel's changes to SLUB sheaves, zswap, readahead, exit teardown, page clearing and out-of-memory policy, compared with upstream Linux, with off switches and status."
---

## SLUB: bigger per-CPU sheaves

**Development (`wolos-futex`, `wolos-perf`)**, experimental.

- **Upstream:** each CPU keeps a "sheaf" of free objects per cache, sized 60, 26, 12 or 4 by object size. When it runs dry, the CPU refills from the node's shared barn, behind a spinlock every CPU shares.
- **WolKernel:** `slub_sheaf_scale` multiplies the base size, 1 to 4, default 2.
- **Why:** desktop churn drains a 26-object sheaf in a few hundred syscalls and then queues on the shared lock.
- **Off switch:** `slub_sheaf_scale=1` (the upstream size).

## zram and zswap

**Configuration.** Swap is zram, compressed RAM with zstd, sized at half of RAM and at most 8 GiB. zswap is built with zstd but left off, or pages would be compressed twice. The image sets `vm.swappiness=100` and `vm.page-cluster=0`, so idle pages move to zram early and come back one page at a time (on zram, each extra read-ahead page is a decompression the faulting task waits for).

## zswap: compress large folios on idle CPUs

**Development (`wolos-plan-mm`)**, experimental, **off by default**.

- **Upstream:** zswap compresses a large folio serially on the reclaiming CPU.
- **WolKernel:** large folios are compressed in pieces on idle CPUs, through the `wolos_bend` fork/join helpers described below.
- **Measured:** `memory.reclaim` of hugepage-backed anonymous memory went from 267 MiB/s to 1024-1073 MiB/s on the first pass. Folios that come back as 4 KiB pages are unchanged at about 240 MiB/s.
- **Why off:** reclaim waits for helpers on a workqueue that has no rescuer thread yet, so under memory pressure a helper might need a new worker. It is to be turned on (`16`) once that workqueue can run during reclaim.
- **Switch:** `zswap.wolos_par_min_pages=0` (off, the default).

## Readahead: 2 MiB on SSDs

**Development (`wolos-plan-mm`)**, experimental.

- **Upstream:** 128 KiB readahead by default, a value from the days of slow disks.
- **WolKernel:** 2 MiB by default on non-rotational disks. RAM-backed and rotational disks keep upstream's rule. `read_ahead_kb` in sysfs still overrides it.
- **Measured:** ext4 on NVMe, buffered 128 KiB sequential reads through virtio: 2256-2302 MB/s at 128 KiB, 2650-2793 MB/s at 1 MiB, 2786-2803 MB/s at 2 MiB, with random mmap IOPS, page cache use and a small file tree unchanged.
- **Off switch:** `wolos_mm.ssd_ra_kb=0` restores 128 KiB.

## Exit teardown: free large address spaces in parallel

**Development (`wolos-plan-mm`)**, experimental.

- **Upstream:** when a process exits, its whole address space is unmapped serially by the exiting thread, and its parent's `wait(2)` returns only after that.
- **WolKernel:**
  - Anonymous mappings of at least 64 MiB are zapped in pieces in parallel before the serial walk, which then finds them empty. A piece that cannot take the lock is left to the serial path, which stays the fallback.
  - For a process with at least 512 MiB of anonymous memory, the last thread unmaps what user space can observe (files, shared memory, device mappings) and hands the anonymous rest to a teardown worker, so `wait(2)` returns sooner. The out-of-memory killer waits for that worker; notifier users, out-of-memory victims and strict overcommit stay synchronous.
- **Why:** closing a large game or browser should not stall the machine.
- **Off switch:** `wolos_mm.exit_par_min_mb=0` and `wolos_mm.exit_async_min_mb=0`, one per part. Selftest: `exit_teardown`.

## Clearing large folios on idle CPUs, and wolos_bend

**Development (`wolos-bend`, `wolos-memsaver`)**, experimental.

- **Upstream:** a large page is cleared serially by the faulting CPU.
- **WolKernel:** folios of at least 4 MiB (1 GiB hugetlb pages, large hugetlbfs and memfd fills) are cleared in 512 KiB pieces on the faulting CPU and idle CPUs. Smaller folios keep the serial loop and pay one compare.
- The helpers are `wolos_bend`: small parallel primitives with no runtime of their own (a work-stealing deque, a fork/join that splits work to idle CPUs on the same cache first, lock-free pools). It is safe to call from reclaim.
- **Off switch:** `wolos_bend.enable=0` makes every fork/join serial.

## Out of memory: background work first

**Development**, experimental.

- **Upstream:** the out-of-memory killer ranks processes by memory use and `oom_score_adj` only.
- **WolKernel:** the frontmost app's badness is divided by 4, and `SCHED_IDLE` (background QoS) tasks gain an eighth of total pages. `oom_score_adj` still applies on top.
- **Why:** the app you are using should be the last to go.
- **Off switch:** there is no separate knob. The frontmost part follows `foreground_pid` (write 0 to `/sys/kernel/wolos/foreground_pid` to clear it); building with `CONFIG_WOLOS_HINTS=n` removes the bias entirely. `oom_score_adj` keeps working as upstream either way.

**Configuration (released):** independently of this patch, the session marks the window server and the shell with `oom_score_adj` -900, and background QoS processes with +300.

## PSI

PSI is on. Its lazy cgroup accounting is on [Scheduling and QoS](/docs/advanced/kernel-scheduling/#psi-lazy-cgroup-accounting).
