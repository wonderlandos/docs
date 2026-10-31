---
title: License and source
description: "WolOS licenses, GPL-2.0-or-later for the code, BSD-2-Clause for libwol, GPL-2.0-only for the kernel patches, and where to find every source."
---

WolOS is free software. Here is what each part is licensed under, and where its source lives.

## Licenses

| Part | License |
|---|---|
| WolOS code: system API, daemons, `wol` tools, shell, installer, image recipes | **GPL-2.0-or-later** |
| libwol (`libwol.so.1` and `wol.h`), the app API | **BSD-2-Clause** |
| WolKernel patches | **GPL-2.0-only**, the same as Linux |
| Third-party code shipped in the tree | Its own license, kept with it |
| This documentation | GPL-2.0-or-later, like the rest of WolOS |

### Why libwol is BSD-2-Clause

libwol is what apps link against. A permissive license means an app of any license, open or closed, can use the WolOS API without the GPL applying to the app. The shell's Kit is not linked into apps: an app sends its view tree to the shell as data over a socket, and the shell draws it. See [libwol](/docs/developers/libwol/).

### Why the kernel patches are GPL-2.0-only

They are changes to Linux, which is GPL-2.0-only. They are published with the configuration and the package recipe used to build WolKernel.

### Name and logo

The WolOS name and logo are trademarks. Forks are welcome to use the code, and should use their own name and art.

## Where the source is

| Source | Where |
|---|---|
| WolOS: system, shell, installer, image, kernel packaging | [github.com/wonderlandos/wolos](https://github.com/wonderlandos/wolos) |
| WolKernel: upstream Linux plus the WolOS patches | [github.com/wonderlandos/linux](https://github.com/wonderlandos/linux), branch `wolos` (release) and `wolos-*` (development) |
| The exact kernel commit of a release | [`kernel/linux-wolos/ref`](https://github.com/wonderlandos/wolos/blob/main/kernel/linux-wolos/ref) in the WolOS repository |
| Images and the `[wolos]` package repository | [WolOS releases](https://github.com/wonderlandos/wolos/releases) |
| This documentation | [github.com/wonderlandos/docs](https://github.com/wonderlandos/docs) |


## Not affiliated

WolOS can read and write APFS disks as a compatibility matter. WolOS is an independent project and is not affiliated with, endorsed by, or sponsored by Apple Inc.
