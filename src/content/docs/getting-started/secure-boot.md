---
title: Secure Boot and MOK
description: "How WolOS starts with Secure Boot on, enrolling the WolOS key on the blue MOK screen, and what to do if you would rather turn Secure Boot off."
---

Secure Boot lets your PC's firmware start only boot loaders and kernels signed by a key it trusts. Firmware ships trusting the keys of PC makers, not WolOS's. To start WolOS with Secure Boot on, you add the WolOS key once, through a Machine Owner Key (MOK) screen.

:::caution[Experimental]
Secure Boot support with MOK enrollment is experimental. Preview images may not be signed yet: the installer checks whether Secure Boot is on and, if the image cannot start with it, says so before it erases anything. In that case use [Turn Secure Boot off](#turn-secure-boot-off-instead) below.
:::

## What the installer tells you

The installer reads the firmware's `SecureBoot` setting. When it is on, a page explains it before anything is erased, with **Back**, **Install Anyway** and **Restart**.

## Enroll the WolOS key on the blue screen

After the install, on the first restart, the firmware shows a blue screen titled **Perform MOK management** before WolOS starts. It waits for a key press for a few seconds only, so watch for it.

1. Press any key to enter MOK management.
2. Choose **Enroll MOK**.
3. Optionally choose **View key** to see the key's details, then go back.
4. Choose **Continue**.
5. At **Enroll the key(s)?** choose **Yes**.
6. Type the enrollment password when asked. It is a one-time password for this screen only, not your account password. Nothing is shown while you type.
7. Choose **Reboot**.

WolOS now starts with Secure Boot on. You only do this once per computer.

### If you missed the screen

If the timeout passed, the computer starts without enrolling, and the blue screen comes back at the next restart while the enrollment is still pending. Restart and watch for it.

### If you typed the wrong password

MOK management lets you try again a few times, then returns to the menu. Choose **Reboot** and the request stays pending for the next start.

## Turn Secure Boot off instead

You can also run WolOS with Secure Boot off:

1. Restart and open the firmware setup (often F2, Del or F10 right after power-on).
2. Find **Secure Boot**, usually under Boot or Security, and set it to **Disabled**.
3. Save and exit.

You can turn it back on later, after enrolling the key as above.
