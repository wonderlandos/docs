---
title: Locks and waits
description: "WolKernel's changes to futex and futex_waitv, ntsync, SysV semaphores, pipes, epoll and UDP busy poll, compared with upstream Linux, with off switches and status."
---

Games under Wine and Proton spend much of their time handing work between threads: one thread wakes another, which wakes a third. Each hand-off in upstream Linux pays for locks, a sleep and a wakeup interrupt. These changes make the common cases cheaper. `futex_waitv` and ntsync themselves are upstream and used as is; the changes below are to how they wait.

Measurements quoted here were taken by the project on a 16-vCPU x86 test VM unless noted.

## Futex: bounded spin before sleeping

**Released.**

- **Upstream:** `FUTEX_WAIT` queues the waiter and sleeps at once. The waker then pays for a wakeup and, across CPUs, an interrupt.
- **WolKernel:** a waiter spins for up to `futex.spin_ns` (default 4000 ns) before sleeping. A wake during the spin skips the sleep and the wakeup interrupt. It stops early when the CPU has other work (`need_resched`) or on a signal.
- **Why:** most lock hand-offs between game threads finish within microseconds.
- **Off switch:** `futex.spin_ns=0` at boot, or write 0 to `/sys/module/futex/parameters/spin_ns`.

## Futex: adaptive spin, spin before queuing, and futex_waitv

**Development (`wolos-futex`, `wolos-perf`)**, experimental. A series of changes that build on the spin above:

| Change | Upstream | WolKernel | Off switch |
|---|---|---|---|
| Adaptive spin | n/a (no spin) | Spins only when nothing else is runnable on the CPU, with a budget scaled by a score: a wake during the spin raises it, a timeout halves it. Long waits stop burning the budget; quick hand-offs keep spinning. | `futex.spin_ns=0` |
| Spin before queuing | n/a | The spin polls the futex words before the waiter queues. A word that changes returns `-EWOULDBLOCK`, so the waker finds no waiter and pays no lock and no interrupt. A wake without a value change is still seen once the budget runs out. | `futex.prespin=0` |
| Early mismatch | `FUTEX_WAIT` and `futex_waitv` hash the key and take the bucket lock before reading the word, even when it already differs | The word is read first, with page faults off; a mismatch returns at once. A match or a fault takes the unchanged locked path, which reads again under the lock, so no wakeup can be lost. | `futex.precheck=0` |
| One-pass `futex_waitv` check | One copy and one user access per entry | One pass reads the array, the timeout and every word inside a single user-access window. Any unusual entry or fault takes the full path, so error codes stay exactly as upstream. | `futex.precheck=0` |
| On-stack vectors | `futex_waitv` allocates and frees its vector on every call | Up to 4 entries live on the stack; 5 to 64 reuse an array kept with the task | `futex.waitv_inline=0` |
| `futex_waitv` spin | Sleeps at once | Uses the same spin budget, and stops when any futex in the vector is woken | `futex.waitv_spin=0` |
| Shared-key cache | Every wait and wake on a shared futex looks up its page | 16 keys per task, emptied when the address space changes, freed at exit and exec | `futex.key_cache=0` |
| Hand-over only when contended | n/a | A task that wakes one waiter and then sleeps runs the wakee on its own CPU only when another task wants that CPU | `futex.sync_wake=0` |
| Fewer clock reads | n/a | The spin reads the clock every 16 polls | `futex.spin_polls=1` |

Measured, with context:

- Non-blocking `futex_waitv` on 64 futexes: 2222 ns to 151 ns; on one futex, 118 ns to 80 ns (minimum of 31 batches; a `getuid` call is 64 ns on the same machine).
- Hand-off round trip between two threads: 4284 ns to 350-470 ns. With 1, 2 and 3 us of work per side: 6.5 to 2.5 us, 8.5 to 4.5 us, 18 to 7.4 us. From 5 us of work up, equal within noise.
- One partner under 16 CPU hogs: 27.5 us to 7.1 us per round trip.
- Shared-key cache, one CPU, always sleeping: one shared word 2395 ns to 2162 ns.

## ntsync: on-stack wait queue

**Development (`wolos-futex`, `wolos-perf`)**, experimental.

- **Upstream:** each `NTSYNC_IOC_WAIT_ANY` or `WAIT_ALL` allocates and frees its wait queue.
- **WolKernel:** waits on up to four objects (alert included) use a buffer on the waiter's stack. The waiter unqueues every entry before it returns, so nothing outlives it.
- **Why:** Wine waits on one to three objects almost always.
- **Off switch:** write 0 to `/sys/module/ntsync/parameters/inline_wait`.

## SysV semaphores: one-semaphore reads

**Development (`wolos-futex`, `wolos-perf`)**, experimental.

- **Upstream:** `semctl` `GETVAL`, `GETPID`, `GETNCNT` and `GETZCNT` take the whole set's lock, walk every semaphore's lock, and force the next ten simple operations onto the global lock.
- **WolKernel:** these reads take only that semaphore's lock, like a single-operation `semop`.
- **Off switch:** write 0 to `/sys/module/sem/parameters/read_one_lock`.

## Pipes: no wait-queue lock when nobody sleeps

**Development (`wolos-futex`, `wolos-perf`)**, experimental.

- **Upstream:** every pipe read and write wakes the other side's wait queue, so a writer to an empty pipe takes the reader's wait-queue lock on every write even while the reader is running, and that lock's cache line bounces between the two CPUs.
- **WolKernel:** the wake checks first whether anyone sleeps. `pipe_poll()` gets the memory barrier that keeps this ordering correct.
- **Off switch:** write 0 to `/sys/module/pipe/parameters/wake_check`.

## epoll: per-CPU lists under contention

**Development (`wolos-plan-mm`)**, experimental.

- **Upstream:** the ready list is behind one spinlock, so event producers spin behind each other and behind the reader.
- **WolKernel:** the callback tries the lock; if it is taken, it pushes the event onto a per-CPU list and takes the lock only if a waiter must be woken. Scans drain the lists under the lock, so the uncontended path is unchanged. `EPOLLEXCLUSIVE`, `POLLFREE` and wakeup sources keep the locked path. The `epoll_mp` selftest checks that every write is seen once under producers, consumers and add/remove churn.
- **Off switch:** `eventpoll.wolos_pend=0`.

## UDP busy poll for the app in front

**Development (`wolos-plan-sched`)**, experimental.

- **Upstream:** busy polling is per socket or system-wide, with no notion of the app in front.
- **WolKernel:** a UDP socket of the frontmost app that sets `SO_BUSY_POLL` spins for 2000 us in `recv`. Sockets that do not opt in are untouched.
- **Why:** lower latency for game network traffic. 50 us measured worse; 2000 us cut the median round trip from 675 us to 475 us in the `udp_pingpong` test.
- **Off switch:** `wolos_net.fg_busy_us=0`.

The same branch adds `xhci_pci.imod_ns`, which overrides the USB controller's 40 us interrupt moderation at probe. Default `-1` keeps upstream's value.
