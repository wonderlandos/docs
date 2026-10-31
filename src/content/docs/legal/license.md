---
title: License and source
description: "WolOS licenses as set in COPYRIGHT: GPL-2.0-or-later for the code, BSD-2-Clause for libwol, GPL-2.0-only for the kernel patches, and where to find every source."
---

WolOS is free software. The `COPYRIGHT` file in the WolOS repository is the source of truth; this page explains it.

## Licenses

| Part | License |
|---|---|
| Everything not listed below: system daemons, `wol` tools, installer, image recipes, wopkg | **GPL-2.0-or-later** |
| The shell (`crates/shell/`) | GPL-2.0-or-later |
| libwol: `crates/wol-abi/` (`libwol.so.1`, `wol.h`), with `crates/shared/` and `crates/core/` that it links | **BSD-2-Clause** |
| WolKernel patches (`kernel/linux/patches/`), `scx_wolos` (`kernel/scx_wolos/`), `kernel/freebsd/` | **GPL-2.0-only**, the same as Linux |
| `design/` (except `design/tools/` and `design/icons/store/`) and `assets/` | CC BY-NC-ND 4.0 |
| `design/tools/` | GPL-2.0-or-later |
| `design/icons/store/` | Each icon's own license |
| Other `*.patch` files | The license of the files each patch changes (the window server patches: BSD-3-Clause) |
| `crates/shell/protocols/` | BSD-3-Clause, notice kept in each file |
| `third_party/blocking/` | Apache-2.0 OR MIT |
| This documentation | GPL-2.0-or-later |

Each source file names its license in an `SPDX-License-Identifier` line, and the license texts are in `LICENSES/`.

### Why libwol is BSD-2-Clause

libwol is what apps link against. A permissive license means an app of any license, open or closed, can use the WolOS API. The code libwol links (`crates/shared/` and `crates/core/`) is BSD-2-Clause for the same reason. The shell's Kit is not linked into apps: an app sends its view tree to the shell as data over a socket, and the shell draws it. See [libwol](/docs/developers/libwol/).

### Why ClamAV runs in its own process

libclamav is GPL-2.0-only. It is linked only by `wol-xguard-clam`, a separate program that other parts talk to over a socket, so no WolOS library links it. See [ClamAV scanning](/docs/using/clamav/).

### The shim

`wolos-shim` ships an upstream signed shim binary unmodified, under shim's own license, which the package installs with it. See [Secure Boot and the shim](/docs/getting-started/secure-boot/).

### Name and logo

"WolOS", the WolOS logo, wordmark and glyph are trademarks of Julia Klee. Talking about WolOS with them is welcome (non-commercial, credited). Forks and products need written permission to use them; otherwise build with your own name and art.

## Where the source is

| Source | Where |
|---|---|
| WolOS: system, shell, installer, image, kernel packaging, wopkg | [github.com/wonderlandos/wolos](https://github.com/wonderlandos/wolos) |
| WolKernel: upstream Linux plus the WolOS patches | [github.com/wonderlandos/linux](https://github.com/wonderlandos/linux), branch `wolos` (release) and `wolos-*` (development) |
| The exact kernel commit of a release | `kernel/linux-wolos/ref` in the WolOS repository |
| Images and the `[wolos]` package repository | [wolos-packages releases](https://github.com/wonderlandos/wolos-packages/releases) |
| This documentation | [github.com/wonderlandos/docs](https://github.com/wonderlandos/docs) |

## Not affiliated

WolOS can read and write APFS disks as a compatibility matter. WolOS is an independent project and is not affiliated with, endorsed by, or sponsored by Apple Inc.
