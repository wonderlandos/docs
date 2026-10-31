---
title: wopkg and .wol packages
description: "How software gets onto WolOS: pacman, wopkg for third-party sources, the .wol package format, and how changes land on the sealed system."
---

WolOS uses three layers for software:

| Tool | For |
|---|---|
| `pacman` | The package manager, used directly. `pacman -S ...` works as on Arch, against the release's pinned repositories. |
| `wopkg` | Third-party sources: the AUR, AppImages, recipes and third-party `.wol` packages, each checked on the way in |
| `wol` | `.wol` app metadata and the Store, the pinned `pacman.conf`, and system releases |

There is no second package database: what pacman installed is the source of truth.

## wopkg

`wopkg install` is the way in for software from outside WolOS's repositories. Each install is checked before it lands:

- **AUR recipes** are pinned to a reviewed commit, analysed, and built in a sandbox with no network and no access to your home folder. See [The AUR tab](/docs/using/aur/).
- **`.wol` packages** are verified against their hashes and signature.
- **Optional ClamAV scan:** when [ClamAV scanning](/docs/using/clamav/) is on, a finding stops the install, and continuing needs a typed `yes`.

## The .wol format

A `.wol` is one file around a pacman package. It is a ustar archive of regular files only (mode 0644, owner 0:0), with exactly these members in this order:

| Member | Required | Content |
|---|---|---|
| `Info.json` | yes | App metadata (below) |
| `icon.png` | no | 256x256 icon for the install sheet |
| `payload.pkg` | yes | A pacman package (`makepkg` output, `.pkg.tar.zst` bytes), prefix `/usr` |
| `SHA256` | yes | `SHA256 (<member>) = <64 lowercase hex>` for every member above, sorted by name |
| `SHA256.sig` | no | Raw 64-byte Ed25519 signature of the `SHA256` bytes |

Verification checks the order and names exactly, no duplicates, every hash, that `SHA256` lists nothing else, and that `Info.json` is valid. A signature from a trusted key means signed; no signature means unsigned; anything else is refused.

### Info.json

```json
{"id":"org.example.Notes","version":"1.2.0-1","name":"Notes",
 "summary":"Quick notes","icon":"org.example.Notes",
 "categories":["Work"],"capabilities":["files"],"package":"example-notes",
 "targets":[{"arch":"x86_64","entry":"bin/example-notes"}]}
```

- `version` is the pacman version of `payload.pkg` (`pkgver-pkgrel`); `package` is its pkgname; `icon` is an icon theme name.
- `categories`: `Create`, `Work`, `Play`, `Develop`.
- `capabilities` are declared and shown before install. They are not enforced yet.
- Entries are relative to `/usr`. The payload installs the same `Info.json` at `/usr/share/wolos/packages/<id>/Info.json`, so pacman owns the record.

### Signing keys

```sh
openssl genpkey -algorithm ed25519 -out my-packages.key          # private, keep it secret
openssl pkey -in my-packages.key -pubout -out my-packages.pub    # public
```

Trusted public keys live in the system's WolOS keys folder.

## On the sealed system

The installed system is read-only and sealed. `pacman -S`, `-R` and `-U` still work:

- The change goes into a layer (systemd-sysext) merged over `/usr` at once, live, with no restart. `/etc` and the package database stay live.
- Kernel, initramfs and systemd packages, and `-Syu`, go to the pending slot instead, and take effect at the next restart. A second change stacks on it.
- The next system update folds the layers into the new slot.
- A failed change leaves nothing behind.

For development, `wol seal off` (as root) makes the running system writable and stops the boot check until the next update. `wol base verify` lists base files that changed or are missing.
