---
title: The AUR tab
description: "Installing from the Arch User Repository in WolOS, with its warning, administrator password and checks."
---

The Arch User Repository (AUR) holds community build recipes for software that is not in the regular repositories. Anyone can publish to it, so it has the most to check. WolOS keeps it apart from the rest of the Store.

:::danger[Read the warning]
AUR packages are written by other users, not by WolOS or Arch Linux. A recipe can run any command while it builds. Only install what you trust, and read what you are shown before you continue.
:::

## Opening the tab

The AUR is a separate tab in the Store. Opening it shows a warning and asks for an administrator password. Without it the tab stays closed. Installs from the AUR still happen in Terminal, where you see every step.

## What happens when you install

Installs go through `wopkg`:

1. **You see what you are getting.** You are shown a reviewed commit of the recipe, and that commit is pinned. When an update comes, you see the diff before anything runs.
2. **The package is read, then watched.** An analyser reads the package's code as a graph and watches what the build does, down to its system calls, and checks both against written rules.
3. **The build is boxed in.** It runs in a sandbox with no network and no access to your home folder.
4. **A flag shows its work.** If a rule is broken, the flag names the exact path that caused it.
5. **An optional scan can stop it.** If you turned on [ClamAV scanning](/docs/using/clamav/) and it finds something, the install stops. Continuing needs a typed `yes`.

:::caution
A pass is not a promise. Passing means no rule was broken. It does not mean the package is safe.
:::
