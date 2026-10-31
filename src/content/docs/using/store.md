---
title: The Store
description: "Finding and installing apps in the WolOS Store, what gets checked, and when you are asked for a password."
---

The Store is where you find, install and remove apps. Open it from its tile in the Dock or **App Store…** in the WolOS menu. Double-clicking a `.wol` file also opens it, on that app's install sheet.

## Where apps come from

| Source | What | Checked on the way in |
|---|---|---|
| WolOS repositories | WolOS's own packages and the Arch Linux packages of your release | Signed packages; no ClamAV scan |
| Flatpak | Flatpak apps | Flatpak's own checks; no ClamAV scan |
| `.wol` packages | Apps packed as signed `.wol` files | Signature and hashes; optional [ClamAV scan](/docs/using/clamav/) |
| The AUR | Community build recipes | Its own tab with a warning; see [The AUR tab](/docs/using/aur/) |

## Installing an app

1. Find the app by name, or browse the categories: Create, Work, Play and Develop.
2. The install sheet shows the app's name, summary, icon and the capabilities it declares, such as access to your files.
3. Choose **Install** and confirm with your administrator password.

:::note
Declared capabilities are shown so you know what an app says it needs. They are not enforced yet.
:::

### Signed and unsigned `.wol` files

- **Signed by a trusted key:** installs after your administrator password.
- **Unsigned:** installs only after a fresh password, every time.
- **A wrong hash, an unknown file inside, or a signature no trusted key verifies:** refused.

## Removing an app

Choose **Remove** on the app's page. Its dependencies go too, unless something else still uses them.

## Updating apps

System and app updates are found in the background. See [Updates, slots and rollback](/docs/using/updates/).

## From the terminal

The same actions are available as `wol` commands:

```sh
wol search <term>          # Store catalogue and the .wol index
wol install <file.wol|id>  # verify, then install
wol remove <id>
wol list                   # installed .wol apps
wol update apps [--yes]    # .wol apps with a newer version
```

`pacman` also works as on Arch. See [wopkg and .wol packages](/docs/developers/wopkg/) for how changes land on the sealed system.
