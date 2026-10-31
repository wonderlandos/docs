---
title: wopkg and .wol packages
description: "wopkg, the WolOS package tool for every source: commands, sources and trust, how system changes go through wold, libwopkg's stable C ABI, recipes, and the .wol package format."
---

`wopkg` is one tool for every place apps come from: the WolOS and Arch repositories, Flathub, AppImages, recipes, the AUR and `.wol` files. One search, one install command, one update, one history. `pacman` still works as on Arch.

## Commands

```text
wopkg search <words>      (-Ss)  find apps in WolOS, Arch, Flathub, AppImage, recipes, AUR
wopkg info <name>         (-Si)  versions and sources of one app
wopkg install <name>...   (-S)   install from the best source
                                 (--from flatpak|aur|appimage|recipe|<repo>)
wopkg remove <name>...    (-R)   remove it
wopkg update              (-Syu) WolOS, system packages, Flatpaks, AppImages, .wol apps, recipes
      --check (-Qu)              only list what would change
      --to <version>             move to a WolOS release
      --only <kinds>             e.g. --only flatpak,appimage
wopkg sync                (-Sy)  refresh the search index
wopkg list                (-Q)   what is installed
wopkg history | rollback <id|system>
wopkg pin|unpin <name>           keep a package at its version through updates
wopkg channel [stable|beta|nightly] | pause [days] | resume
wopkg appimage add <url|file>
wopkg aur review|update <pkg> | wopkg audit <pkg>
wopkg recipe build|install|remove <name>
wopkg completions zsh|bash|fish
```

Options: `-y` (do not ask), `--json` (for tools). `wopkg install` also takes `.AppImage`, `.wol` and `.pkg.tar.zst` files.

Exit codes: 0 done, 1 usage or bad input, 3 an installer failed, 5 refused for trust (unsigned remote), 6 not found or not available from that source.

## Sources and trust

Each source keeps a trust model never weaker than its own tool's:

| Source | Installs as | Trust | Updates |
|---|---|---|---|
| WolOS and Arch repositories | System change through wold | pacman's keyring | `wopkg update` |
| `.wol` | System change (a pacman package) | Ed25519 signature and hashes | With the system |
| Flatpak | `flatpak --user` | Remotes must verify GPG | `flatpak update` |
| AppImage | `~/Applications` | Embedded signature against the key pinned at first install; otherwise the zsync checksum over TLS, marked `unsigned` | zsync delta, else full download |
| Recipes | `~/.local` | Ed25519-signed recipe index, pinned SHA-256 sources | Rebuilt when the version changes |
| AUR | Sandboxed build, then a system change | Always marked `unreviewed` | Rebuilt; see [The AUR tab](/docs/using/aur/) |

Flathub is added for your account the first time you install an app from it. Search ranks exact name, prefix, word and summary, and shows one result per app listing every source that has it.

Downloads are HTTPS only, parallel, resumable, and checked against the expected size and SHA-256 before use. When [ClamAV scanning](/docs/using/clamav/) is on, AUR builds, AppImages, recipes and third-party `.wol` files are scanned too.

## No sudo for apps

wopkg runs as you. User installs (Flatpak, AppImages, recipes) need nothing. A system change is one call to the session daemon `wold`, which takes the caller's identity from the kernel and checks a permission you control in **Settings > Privacy & Security > Software**: `packages-install`, `packages-remove`, `packages-update`, and a separate `packages-unreviewed` for packages built on the computer (AUR, recipes). wold runs the change through the sealed-system pacman described below.

## History and rollback

Every change is a line in `~/.local/state/wopkg/history.jsonl`. AppImages keep the previous file, Flatpak the previous commit, and the system its restore slot, so `wopkg rollback <id>` or `wopkg rollback system` can go back.

## Recipes

A recipe is a `recipe.toml`: `name`, `version`, `summary`, `license`, `homepage`, `needs` (tools the sandbox must have), `[[source]]` entries (`url`, `sha256`, `file`), an optional `[fetch]` step with network for lockfiles, and `[build]` and `[install]` steps that run in the offline sandbox. `$TARGET_PREFIX` is the final prefix and `/work/out` the staging one. Built output is cached by the recipe's hash and installed into `~/.local`.

## libwopkg

The fast, safety-critical parts (search index, downloader, signature and hash checks, AppImage delta updates, the transaction journal, the bridge to wold) live in `libwopkg`, written in Rust, behind a stable C ABI: `libwopkg.so.1`, header `wopkg.h`, prefix `wopkg_`. It follows the same rules as [libwol](/docs/developers/libwol/): opaque handles, UTF-8 with lengths, a status plus an optional error, callbacks on the calling thread, symbols versioned so nothing shipped ever changes. Requests and results are JSON documents that only gain fields. The `wopkg` command line is written in Crystal on top of it, and the App Store links the Rust library directly.

The search index is one memory-mapped segment file per source in `~/.cache/wopkg/index/`, rebuilt only when that source changed. Measured by the project on a 16 vCPU test VM with 142,075 records from 6 sources: `wopkg search` answers in 7 to 9 ms, and a refresh when nothing changed takes about 0.31 s.

## The .wol format

A `.wol` is one file around a pacman package: a ustar archive of regular files only (mode 0644, owner 0:0), with exactly these members in this order:

| Member | Required | Content |
|---|---|---|
| `Info.json` | yes | App metadata (below) |
| `icon.png` | no | 256x256 icon for the install sheet |
| `payload.pkg` | yes | A pacman package (`makepkg` output), prefix `/usr` |
| `SHA256` | yes | `SHA256 (<member>) = <64 lowercase hex>` for every member above, sorted by name |
| `SHA256.sig` | no | Raw 64-byte Ed25519 signature of the `SHA256` bytes |

Verification checks order and names exactly, no duplicates, every hash, that `SHA256` lists nothing else, and that `Info.json` is valid. Signed by a trusted key means signed; no signature means unsigned; anything else is refused.

```json
{"id":"org.example.Notes","version":"1.2.0-1","name":"Notes",
 "summary":"Quick notes","icon":"org.example.Notes",
 "categories":["Work"],"capabilities":["files"],"package":"example-notes",
 "targets":[{"arch":"x86_64","entry":"bin/example-notes"}]}
```

- `version` is the pacman version of `payload.pkg`; `package` is its pkgname; `icon` is an icon theme name.
- `categories`: `Create`, `Work`, `Play`, `Develop`. `capabilities` are declared and shown before install, not enforced yet.
- The payload installs the same `Info.json` at `/usr/share/wolos/packages/<id>/Info.json`, so pacman owns the record.

Signing keys are Ed25519:

```sh
openssl genpkey -algorithm ed25519 -out my-packages.key          # private, keep it secret
openssl pkey -in my-packages.key -pubout -out my-packages.pub    # public
```

## On the sealed system

The installed system is read-only and sealed. Package changes still work:

- A change goes into a layer (systemd-sysext) merged over `/usr` at once, live, with no restart. `/etc` and the package database stay live.
- Kernel, initramfs and systemd packages, and full upgrades, go to the pending slot instead and take effect at the next restart.
- The next system update folds the layers into the new slot. A failed change leaves nothing behind.

For development, `wol seal off` (as root) makes the running system writable and stops the boot check until the next update.
