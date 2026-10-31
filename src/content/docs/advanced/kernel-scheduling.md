---
title: Scheduling and QoS
description: "WolKernel's QoS classes, the scx_wolos scheduler and its slices, proxy execution, the shield, lazy PSI, and the frontmost-app hints, compared with upstream Linux."
---

Upstream Linux schedules a game and a background backup by the same rules unless someone sets priorities by hand. WolKernel gives the WolOS session one way to say what each thread is for, and a scheduler that acts on it. Every change below has an off switch, and the stock scheduler is always the fallback.

## QoS classes

**Released.** No new syscall. A QoS class is applied per thread with the existing `sched_setattr(2)`, as a policy, a nice value and a utilisation clamp range. The constants are in `<linux/wolos.h>`.

| Class | Used for | Policy | Nice | uclamp min..max |
|---|---|---|---|---|
| 0 `WOLOS_QOS_USER_INTERACTIVE` | Window server, shell, input | `SCHED_OTHER` | -10 | 768..1024 |
| 1 `WOLOS_QOS_USER_INITIATED` | The frontmost app | `SCHED_OTHER` | -5 | 384..1024 |
| 2 `WOLOS_QOS_DEFAULT` | Everything else | `SCHED_OTHER` | 0 | 0..1024 |
| 3 `WOLOS_QOS_UTILITY` | Long-running work you asked for | `SCHED_OTHER` | 10 | 0..512 |
| 4 `WOLOS_QOS_BACKGROUND` | Work nobody is waiting for | `SCHED_IDLE` | 19 | 0..256 |

- **Upstream:** nice and uclamp exist, but nothing assigns them by role.
- **WolKernel:** the classes are a fixed encoding of those same values. The stock EEVDF scheduler honours nice and uclamp, so the classes keep their meaning with or without a BPF scheduler loaded.
- **Off switch:** do not set a class; threads stay at the defaults.

## scx_wolos

A `sched_ext` scheduler, in `tools/sched_ext/scx_wolos.bpf.c` on the fork, that reads the QoS class of each thread.

**Released (1.0):**

- Interactive threads get a strict-priority queue with **1 ms slices** and kick an idle CPU.
- Frontmost, default and utility threads share one weighted virtual-time queue: frontmost counts four times, utility half.
- Background threads run when nothing else is runnable, and at least every 100 ms, so they are never starved.
- While a thread runs, its class sets the CPU performance target for schedutil.
- If the scheduler exits, stalls (5 s watchdog) or is killed, the kernel moves every task back to EEVDF.
- A systemd unit runs it, restarting on failure at most 5 times a minute.

**Development (`wolos-next`), experimental:**

- **Slices follow the class:** interactive 1 ms, frontmost 2 ms, the rest 4 ms.
- **Per-CPU queues.** A thread queues on the CPU it last ran on. An idle CPU drains its own queue, then steals from CPUs sharing its last-level cache, then from any CPU, so caches stay warm without leaving CPUs idle.
- **Frontmost boost without a class.** The loader copies `foreground_pid` into the scheduler every second, so the frontmost app gets its weight even if it never set a QoS class.

**Off switch:** stop the service (`scx_wolos.service`), and EEVDF takes over. On the development version, `scx_wolos -g` goes back to one global queue for A/B runs.

```sh
cat /sys/kernel/sched_ext/root/ops    # "wolos" while attached
sudo scx_wolos -s                     # print enqueues per class each second
```

## Frontmost-app CPU floor and timer slack

**Development (`wolos-next`), experimental.** Three files under `/sys/kernel/wolos`:

| File | Upstream | WolKernel | Off switch |
|---|---|---|---|
| `foreground_uclamp_min` (0..1024) | Each thread's clamp is set one by one from user space | Raises the effective `uclamp_min` of every thread of `foreground_pid`, so schedutil and energy-aware scheduling run the app at a higher frequency and on big cores. Never lowers a per-thread clamp. | `echo 0` (default) |
| `foreground_timerslack_ns` (-1, or 0..1 s) | Timers of normal threads expire with 50 us of slack | Sets the frontmost app's thread slack, restored when it leaves. With 0, frame limiters and `Sleep(1)`-style waits under Wine and Proton expire on time. | `echo -1` (default) |
| `background_timerslack_ns` | Same 50 us slack for everyone | Threads entering `SCHED_IDLE` get at least this slack, so background wakeups coalesce and the CPU stays idle longer | `echo 0` (default) |

The session writes `foreground_uclamp_min=512` and `foreground_timerslack_ns=0` on AC power, and `256` and `-1` on battery.

## Input boost

**Development**, experimental. An input handler on keyboards and buttons opens a 100 ms window per event, at most one per 50 ms. While it is open, schedutil keeps every CPU at least at 60% of capacity, and GPU drivers that register get a call. So your first keystroke never meets a CPU at its lowest clock.

- **Upstream:** the CPU ramps up only after load appears.
- **Off switch:** `wolos_input_boost.ms=0`.

## Proxy execution

**Development (`wolos-plan-sched`)**, experimental.

- **Upstream:** proxy execution (`CONFIG_SCHED_PROXY_EXEC`) is in the kernel but builds only with `CONFIG_EXPERT`. When a high-priority task waits on a mutex held by a low-priority one, the holder can be stuck behind other work: priority inversion.
- **WolKernel:** proxy execution builds under `CONFIG_WOLOS_HINTS` without `EXPERT`. A mutex waiter lends its time slice to the holder, so the holder finishes and releases the lock. The fork also carries the proxy-execution series' patch for owners that are asleep: the waiter is parked on the sleeping owner and woken with it. A KUnit test, `wolos_proxy`, runs a `SCHED_IDLE` holder, a nice 0 hog and a nice -10 waiter on one CPU, across CPUs and with an owner that sleeps first, and logs the waiter's latency.
- **Why:** a background thread holding a lock the game needs should not decide the game's frame time.
- **Off switch:** `sched_proxy_exec=0` at boot; `wolos_sched.proxy_sleeping_owner=0` for the sleeping-owner part.

## Shield

**Development (`wolos-plan-sched`)**, experimental, off by default.

- **Upstream:** isolating a core takes boot parameters or manual cpusets.
- **WolKernel:** every 250 ms the busiest thread of the frontmost app gets the best core. Other normal tasks, unbound workqueues, and interrupts other than GPU and input stay off that core and its SMT sibling. A static key means it adds no overhead while off. The `shield_frame` selftest measures frame work time under load.
- **Why:** a game's main thread keeps a quiet core while the rest of the system is busy.
- **Off switch:** write 0 to `/sys/kernel/wolos/shield` (the default). `shield_status` reports the state.

## PSI: lazy cgroup accounting

**Development (`wolos-plan-sched`)**, experimental.

- **Upstream:** with PSI on, every sleep and wakeup walks the whole cgroup chain and updates pressure states, even for groups nothing ever reads.
- **WolKernel:** a new cgroup starts dormant. Task counts stay exact; states and averages start at the first read or trigger of a pressure file. Groups whose state did not change skip the time flush, and IRQ time under 10 us waits for the next switch.
- **Why:** WolOS reads pressure for a few groups, not for every cgroup on the system.
- **Off switch:** `wolos_sched.psi_lazy=0`, `psi_lean=0`, `psi_irq_batch_ns=0`, one per part.

## HWP IO boost

**Development (`wolos-plan-sched`)**, experimental.

- **Upstream:** `intel_pstate` raises the hardware performance floor after an IO wakeup only on systems with a server ACPI profile.
- **WolKernel:** it does so on desktops and laptops too.
- **Off switch:** write 0 to `/sys/devices/system/cpu/intel_pstate/hwp_dynamic_boost`.
