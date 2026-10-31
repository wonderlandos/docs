---
title: Secure Boot and the WolOS shim
description: "How WolOS starts with Secure Boot on: the boot chain, the wolos-shim package, this computer's own keys, the one-time blue key screen, and how it ties to the seal, lockdown and the TPM."
---

Secure Boot lets a PC's firmware start only boot code signed by a key it trusts. WolOS keeps Secure Boot on wherever the firmware allows it, with **keys made on your own computer at install**. No image carries a key, and no two computers share one.

:::caution[Experimental]
Signed boot is new in WolOS and is being proven on real hardware. The live USB image itself is unsigned: start it with Secure Boot off, or with the firmware in Setup Mode, then let the installer turn protection on for the installed system.
:::

## The boot chain

On most PCs (the `mok` tier below) the chain is:

```text
 UEFI firmware
   |  trusts its db, which holds the Microsoft UEFI CA for third-party loaders
   v
 shimx64.efi  (wolos-shim: a signed, unmodified upstream shim)
   |  checks the next stage against db and the MOK list
   v
 MOK list  <-- this computer's WolOS key, accepted once on the blue screen
   |
   v
 systemd-boot  (as grubx64.efi, signed with this computer's key)
   |  counts tries, picks the newest good slot
   v
 EFI/wolos/<slot>.efi  (unified kernel image, signed with this computer's key)
   |  kernel + initramfs + command line in one signed file
   v
 WolKernel  lockdown=integrity  module.sig_enforce=1  wolos.seal=<digest>
   |
   v
 initramfs: the TPM opens the disk only for a signed kernel; the seal is checked
```

## What the WolOS shim is

Firmware on most PCs only trusts loaders signed through the Microsoft UEFI CA. A new key cannot be added to that firmware from the running system, so a first stage the firmware already trusts is needed. That first stage is shim, the standard open source first-stage loader ([rhboot/shim](https://github.com/rhboot/shim)).

`wolos-shim` is the WolOS shim package for its Arch Linux based system:

- It packages an **upstream signed shim build, byte for byte**: `shimx64.efi` and its key screen `mmx64.efi` (MokManager). Nothing is rebuilt or altered, so the signatures it carries stay valid.
- It is **pinned by hash**: the download and both binaries are checked against fixed SHA-256 values before the package is built.
- It installs both files to `/usr/share/wolos/shim`, with shim's license.

shim starts the next stage only if that stage is signed by a key in the firmware's `db`, by the certificate built into that shim build, or by a key in the **MOK list** (Machine Owner Keys), which the person at the computer controls. WolOS uses the MOK list: your computer's own key goes there.

The installer copies shim, MokManager and the signed systemd-boot (under the name shim looks for, `grubx64.efi`) to `EFI/wolos/` and to the fallback path `EFI/BOOT/`, and adds a firmware boot entry named **WolOS**.

## Your computer's own keys

At install, `boot-keys` makes this computer's keys:

| Key | Signs |
|---|---|
| `db` | The boot loader and the unified kernel images |
| TPM policy key | The policy that lets the TPM open the disk |
| `PK`, `KEK` | Ownership of the firmware's key database, used only in Setup Mode |

With a TPM 2.0 chip, the private keys rest encrypted to the TPM and exist in clear only in RAM while signing. Without one, they rest in a root-only folder, on the encrypted volume when the disk is encrypted. Because updates are signed on the computer, the key lives on it; the TPM and disk encryption guard it.

## The four tiers

The installer picks the strongest chain the firmware allows:

| Tier | When | What starts first |
|---|---|---|
| `own-keys` | The firmware is in Setup Mode | systemd-boot, signed with this computer's key, which is enrolled in the firmware next to Microsoft's keys so Windows and add-in cards keep working |
| `mok` | The firmware's `db` holds Microsoft's third-party UEFI CA | `wolos-shim`, then systemd-boot. One key screen at the first start. |
| `off` | Neither, or you turned protection off | Unsigned. WolOS starts, and says that changes made while it is off will not be noticed. |
| `firmware` | Secure Boot is on and nothing above fits | Nothing yet: in the firmware settings, allow third-party certificates or clear the Secure Boot keys, then install again |

Before the restart the installer tells you which tier applies, in one sentence.

## The blue key screen (first start)

On the `mok` tier the installer has already queued your computer's key with `mokutil --import` and set the key screen to wait for you. A copy of the key also sits on the EFI partition as `EFI/wolos/wolos-key.cer`.

After the restart a blue screen appears. It comes from your computer's firmware, not from WolOS, and it waits for you.

1. Press a key.
2. Choose **Enroll MOK**, then **Continue**, then **Yes**.
3. When it asks for a password, type **`boot`**. Nothing shows while you type.
4. Choose **Reboot**. You will not see this screen again.

The password is not a secret. It only proves that a person is at the keyboard, and its letters sit on the same keys on QWERTY, QWERTZ and AZERTY keyboards.

**Missed it?** Run `wol boot enroll` and restart. `wolos-mok-enroll.service` also queues the key again at every start until it is enrolled.

## How the kernel is signed

Each slot boots one **unified kernel image**, `EFI/wolos/<slot>.efi`, built by `ukify`: the kernel, the initramfs and the command line in one file with one signature from this computer's `db` key. The boot menu cannot edit the command line (`editor no`), and these words are added inside the signed image:

| Word | Means |
|---|---|
| `lockdown=integrity` | Kernel lockdown: user space cannot change the running kernel (on `own-keys` and `mok`) |
| `module.sig_enforce=1` | Only signed kernel modules load (on `own-keys` and `mok`) |
| `wolos.seal=` | The digest of the system's fs-verity seal, so the signature covers it |
| `wolos.epoch=` | The image's generation, for anti-rollback |

Kernel modules: keys in the firmware's `db` reach only the kernel's `.platform` keyring, while MOK keys reach `.machine`. So drivers built on the computer, such as NVIDIA's, need the key screen once even on `own-keys`.

`lockdown=integrity` also blocks hibernation and raw MSR writes.

## How it ties to the seal, rollback and the TPM

- **Seal:** the installed system's programs and libraries carry fs-verity, and the seal's digest is inside the signed command line. A changed file fails the check at start, and the other slot starts. See [Sealed boot and lockdown](/docs/advanced/sealed-boot/).
- **Anti-rollback:** the signed `wolos.epoch=` must not be below the floor in `/var/lib/wolos/secureboot/floor`. The floor rises only once an older generation is gone, so an older signed image restored by hand does not stay running.
- **TPM:** the disk key is enrolled at install against a **signed PCR 11 policy**, which follows signed kernels. The first start adds the firmware state (PCR 7, plus PCR 14, which holds the enrolled MOK keys, when shim is in the chain) and removes the install key. An update re-signs and the disk still opens; a changed kernel, command line or initramfs does not unseal it. The recovery key keeps working.

## Check the state

```sh
wol boot status                       # the JSON that Settings reads
cat /sys/kernel/security/lockdown     # [integrity] when lockdown is on
```

`wol boot status` reports whether Secure Boot is on, Setup Mode, the tier, lockdown, TPM 2.0, measured boot, the seal, the epoch and its floor.

## Turn protection on later, or off

- **On later:** if you installed with protection off, `sudo /usr/lib/wolos/boot-setup / /efi --enroll` picks a tier on the running system and signs it.
- **Off:** turn Secure Boot off in the firmware settings (often F2, Del or F10 right after power-on, under Boot or Security). The firmware then stops checking signatures.

## Troubleshooting

| What you see | What to do |
|---|---|
| The live USB will not start with Secure Boot on | Expected: the live image is unsigned. Turn Secure Boot off, or put the firmware in Setup Mode, to install. |
| The installer says Secure Boot is on and this computer only trusts Windows | That is the `firmware` tier. In the firmware settings, allow third-party certificates or clear the Secure Boot keys, then install again. |
| The blue screen went by before you pressed a key | Run `wol boot enroll` and restart. |
| The password is refused on the blue screen | Type `boot`; nothing shows while you type. Choose **Reboot** to try again at the next start. |
| A driver built on the computer (NVIDIA) does not load | Its key needs the key screen once. Run `wol boot enroll` and restart. |
| A notice says an older copy of WolOS was refused | The anti-rollback floor stopped an older image; the newer slot starts instead. |

## Other boot managers

rEFInd finds `EFI/systemd/systemd-bootx64.efi` and `EFI/wolos/*.efi` on its own; pick the first, which keeps try counting and rollback. For another system's GRUB, copy `/usr/share/wolos/boot/41_wolos` to its `/etc/grub.d/` and run its config update.
