---
title: ClamAV scanning
description: "Optional ClamAV scanning in WolOS, off by default, for third-party installs and for files you choose with Analyze."
---

WolOS can scan with ClamAV, an open source antivirus engine. It is optional and **off by default**.

## What it covers when on

- **Third-party installs:** packages from the AUR, AppImages, recipes and third-party `.wol` packages are scanned as part of `wopkg install`. If ClamAV finds something, the install stops, and continuing needs a typed `yes`.
- **Files you choose:** right-click a file in Files and choose **Analyze** to scan it on demand.

Installs from WolOS's repositories and from Flatpak are not scanned this way.

## Turning it on

Turn on ClamAV scanning in Settings. Its virus signatures download only after you turn it on: no signatures come with the image, so nothing is downloaded or updated while it is off.

## What it can and cannot do

ClamAV recognises known malware from its signatures. It cannot catch everything, and a clean result does not mean a file is safe. Treat it as one layer, together with installing from sources you trust.
