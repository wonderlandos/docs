---
title: The AUR tab
description: "Installing from the Arch User Repository in WolOS: off by default, a warning and a password, a reviewed and pinned recipe, a sandboxed build, and an analyser that shows its evidence."
---

The Arch User Repository (AUR) holds community build recipes (PKGBUILDs) for software outside the regular repositories. Anyone can publish there, and nobody reviews it. WolOS treats every PKGBUILD and `.install` script as hostile until it has been read.

:::danger[Read the warning]
AUR packages are written by other users, not by WolOS or Arch Linux. No check catches everything. WolOS raises flags in plain words and never says a package is safe.
:::

## In the Store

The AUR is **off by default** in the App Store, in a tab of its own with a warning. Installing from it needs a separate permission, **packages-unreviewed** (Settings > Privacy & Security > Software), and the same administrator password as other administrator actions.

From the terminal:

```sh
wopkg install --from aur <name>   # build and install
wopkg audit <name>                # read it with the analyser, without building
wopkg aur review <name>           # see the recipe before anything runs
wopkg aur update [name]           # updates, with the diff since the installed commit
```

## What happens on an install

1. **You see what you are getting.** The PKGBUILD, and its diff against the last reviewed copy, are shown before a build. The reviewed commit is recorded, and the checkout must still be exactly that commit, unedited, before the fetch and before the build. Checkouts with symbolic links are refused.
2. **Signals come first.** Before the question you see: a new or young package, an orphan, few votes, a maintainer change (needs `yes`), a source host unrelated to the project, link shorteners, paste sites, numeric addresses, `curl | sh`, base64, `eval`, writes outside the package folder, `sudo`, home folder access, systemd units, setuid, and `.install` scripts that run as administrator. Package metadata comes from the AUR's RPC over TLS.
3. **Checksums.** `SKIP` on a downloaded source is refused unless you type `yes`. md5 or sha1 only, plain http, and signing keys without a signature file are flagged.
4. **The build is boxed in.** Sources are fetched in a sandbox with network. `build()` and `package()` run in a second sandbox **without network**, as an unprivileged user in a throwaway namespace: never root, never you, no home folder, no session bus, no ssh agent, all capabilities dropped. The `.SRCINFO` is regenerated inside; the one the AUR serves is not used.
5. **The built package is read before pacman sees it.** Setuid and setgid files, device files and files outside `/usr`, `/etc`, `/opt` and `/var` are refused. Hooks and units are flagged. The `.INSTALL` script is shown and needs `yes`.
6. **The analyser shows its work.** `wopkg-aurlaws` turns the recipe into a graph of what it fetches, writes, reads, executes, decodes and sends, without running it, and compares that with a system-call trace of the real build. Laws over those graphs return pass, flag or block, with the exact path as evidence. Without the analyser the result is "not checked", never "pass".
7. **Optional ClamAV.** If [ClamAV scanning](/docs/using/clamav/) is on, sources and the built package are scanned. A hit stops the install and needs a typed `yes`.

Updates show the diff of `PKGBUILD` and `*.install` since the installed commit. A new maintainer or a new install script needs `yes`. `wopkg update` never builds AUR packages, and `-y` never answers an AUR question.

## What the analyser found in testing

On packages held back until the rules were frozen: 30 of 40 new malicious test packages were flagged, and 59 of 300 popular packages were flagged for review.

:::caution
A broken law means "needs review". No broken law means only that, never "safe". The sandbox remains the main defence.
:::
