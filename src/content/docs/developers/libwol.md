---
title: libwol, the app API
description: "libwol and wol.h, the WolOS app API with a stable C ABI for apps in any language. BSD-2-Clause."
---

libwol is one native API for WolOS apps, from any language: `wol.h` and `libwol.so.1`. It is Rust inside with a C ABI at the edge, because a C ABI is the one every language can call. It is licensed **BSD-2-Clause**, so apps of any license can use it.

Source: [`crates/wol-abi`](https://github.com/wonderlandos/wolos/tree/main/crates/wol-abi) in the WolOS repository.

## What is in it

| Version | Adds |
|---|---|
| 1.0 | Version, errors, strings, a context with an event loop and subscriptions to system events, system facts (OS, kernel, appearance, accent), posting notifications, windows built from stacks, labels and buttons with click callbacks |
| 1.1 | Rows, lists, spacers, text fields, toggles, sliders and images; changing a part's text or value redraws its window; edit, toggle, slide and close callbacks; notifications with up to three buttons |

Apps built for 1.0 keep working unchanged on 1.1.

## Rules

| Rule | Means |
|---|---|
| Opaque handles | No struct layout is public, ever |
| `_create` / `_copy` | You own a reference: `_release` it |
| `_get_` | Borrowed, lives as long as its argument |
| Strings | UTF-8 with a length in; NUL-terminated with a length out |
| Errors | Calls return a `wol_status`; a `wol_error **` is filled only on failure, with a sentence to show |
| Threads | Retain and release from any thread; everything else on a context one thread at a time |
| Callbacks | Take `void *user_data`; run only inside `wol_context_dispatch`; must not unwind |
| Event loop | Poll `wol_context_get_fd`, then call `wol_context_dispatch(ctx, 0, &err)`. Any loop (GLib, a language runtime, your own) can drive it. |

## Stability

Symbols are versioned by `abi/wol.map` (`WOL_1.0`, `WOL_1.1`, ...). A shipped symbol or declaration never changes or goes away; new ones are added in a new node. A test fails on any removal or change, against the exported symbols and against a snapshot of the header for each release. The soname is the major version.

## A first app in C

```c
#include <stdio.h>
#include <string.h>
#include "wol.h"

#define S(x) (x), strlen(x)

int main(void) {
    wol_error *err = NULL;
    wol_context *ctx = NULL;
    if (wol_context_create(S("org.example.hello"), &ctx, &err) != WOL_OK)
        return 1;
    if (wol_notification_post(ctx, S("Hello"), S("from C"), &err) != WOL_OK)
        return 1;
    printf("posted\n");
    return 0;
}
```

The full example, with system facts, a window, a button and an event subscription, is [`tests/c/hello.c`](https://github.com/wonderlandos/wolos/blob/main/crates/wol-abi/tests/c/hello.c).

## Build

```sh
cargo build --release -p wol-abi
crates/wol-abi/link.sh target/release/libwol.a <dir>   # the map alone decides exports
cargo test -p wol-abi                                  # ABI checks and the C examples
```

Install `libwol.so.1` and `wol.h`.

## Security and privacy

- libwol holds no privilege. It reads the person's own settings (appearance, accent) in the app. Everything else is a call to the `wold` daemon, which takes the caller's identity from the kernel, never from the message, and checks the grant the person controls in **Settings > Privacy & Security**.
- No telemetry. libwol opens the `wold` socket and the Kit host socket and nothing else. Nothing goes to the network.
- Every argument is checked. Decoders are fuzzed. Panics stop at the boundary as `WOL_ERR_INTERNAL`.

## How apps get the WolOS look

Apps do not link the shell's Kit. An app sends a view tree as data to the Kit host (the shell) over a socket; the host draws it with Kit parts and sends clicks back. Apps get the Kit's look and behaviour without linking it.

:::note
Windows and notifications from apps answer `WOL_ERR_UNAVAILABLE` until the desktop side that shows them ships.
:::

## Other languages

All call the same `wol.h`. Crystal: `@[Link("wol")] lib LibWol` with the prototypes. .NET languages: P/Invoke on `libwol.so.1`. Strings go as pointer plus byte length, so no language needs NUL-terminated buffers.

## Desktop widgets in Lua

A desktop widget is one `.lua` file in `~/.config/wolos/widgets/`, reloaded when it changes:

```lua
return wol.widget {
  name = "Counter", refresh = 0, permissions = { "notifications" },
  render = function()
    return wol.row { spacing = 8, wol.label { "Hello" }, wol.spacer(),
      wol.button { label = "Ping", on_click = function() wol.notify("Ping", "from Lua") end } }
  end,
}
```

Scripts run sandboxed: `string`, `table`, `math` and `utf8` only, no files, programs or network, 16 MiB of memory and an instruction budget per call. Services exist only for the permissions a widget declares.
