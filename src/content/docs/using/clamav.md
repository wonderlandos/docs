---
title: ClamAV scanning
description: "Optional ClamAV scanning in WolOS: off by default, signatures fetched only when you turn it on, Analyze with ClamAV in Files, and checks on third-party installs."
---

WolOS can check files with ClamAV, the open source antivirus engine. It is optional and **off by default**, and the image carries no ClamAV signature data.

## Turn it on

Open **Settings > Privacy & Security** and turn on the ClamAV switch.

- Turning it on starts a daily update timer. `freshclam` fetches the signatures straight from the ClamAV project to this computer. By turning it on you accept the ClamAV project's terms for that data.
- Turning it off stops the timer and **deletes the data**.
- Settings shows the state: whether the data is there and how old it is.

## Analyze with ClamAV

In Files, right-click one or more files on this computer and choose **Analyze with ClamAV** ("Check the selected files with ClamAV"). The answer is one of:

| Result | Means |
|---|---|
| Clean | Every file was read, ClamAV answered, nothing matched |
| Found | A signature matched; the result names it and the file |
| Incomplete | Nothing matched, but something was not checked, with the reason for each. A missing answer is never reported as clean. |

## Checks on third-party installs

When it is on, `wopkg` asks ClamAV about what comes from outside the WolOS repositories: AUR sources and built packages, AppImages, recipes and third-party `.wol` files. A hit stops the install with one sentence; continuing needs a typed `yes`. Missing data, or data more than 7 days old, says so and is never reported as clean. Signed repository packages are not scanned this way.

## How it runs

- **In its own process.** `wol-xguard-clam` is the only program that links libclamav. Other programs pass it an open file over a socket and read back one line: `clean`, `found NAME` or `error WHY`. It has no network and no write access.
- **On demand.** It starts when asked and exits after 120 idle seconds, so at rest it uses no memory.
- **Only for deep candidates:** tagged downloads, removable disks, Windows programs, AppImages, `.wol` files and installers.
- **Asked once per file.** A clean file is not asked again until it or the signatures change.
- After each signature update, a lean signature file is built on the computer, so everyday first-use checks use the same data without ClamAV running.

Measured by the project in a 16 vCPU test VM with 3,628,245 signatures:

| What | Result |
|---|---|
| ClamAV load | 6.5 s warm, 7.0 s cold |
| Memory while loaded | 1.0 GB (peak 1.1 GB); 0 once it exits |
| First use of an 857 KB `.exe`, ClamAV loaded | 58 ms |
| First use, ClamAV not loaded yet | 5.7 s, while it loads |
| Second run of that file | 1.4 ms |
| App launch from cache, off / on | 5.04 / 5.01 ms |
| False positives | 0 across 113,213 files under `/usr` and 559 Arch packages |

So a file that needs ClamAV after two idle minutes waits about 6 seconds. ClamAV's own limits apply: by default it skips files over 100 MB and stops at 400 MB per scan.

## What it cannot do

Signatures catch known malware only. A clean result does not mean a file is safe. Treat it as one layer, together with installing from sources you trust.
