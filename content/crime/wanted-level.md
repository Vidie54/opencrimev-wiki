---
title: Wanted Level
description: How stars are earned, how they go away, and what self-defence means.
icon: skull
---
## Earning stars

| Crime | Stars |
|---|---|
| Assault on a player | 1 — only if an on-duty officer is within 50 m |
| Murder | 2 |
| Assault on / murder of a police officer | 2 / 3 |
| ATM: shooting it open · hacking it | 1 · {var:atm.hackWanted} |
| Store robbery | 1 |
| Carjacking | 80 % chance of a star |
| Pickpocket caught | 40 % chance the police are called |
| Drunk driving | when an officer sees you |
| NPC killing spree | {var:wanted.spreeKills} kills in {var:wanted.spreeWindow} s = 1 star, up to {var:wanted.spreeMaxStars} |
| Armoured truck | on the alarm |
| Metro fare evasion | 1 |

## Losing stars

- **Evade**: {var:wanted.evasionSeconds} seconds with no on-duty officer within {var:wanted.evasionRadius} m drops one star. The clock cannot start until {var:wanted.crimeCooldown} s after your last crime, and **dying resets it** — a body is not evading.
- **Wanted wash**: a purchase at a clothing store or a barber drops a star. Each shop has its own cooldown.
- **Arrest**: jail clears the record — see [Prison & impound](wiki:crime/prison-and-impound).
- Death does **not** clear your stars. You respawn wanted.

## Self-defence

Being shot first lets you shoot back without a star. The game tracks who started it, and the killfeed says so.

## Turning yourself in

Every police station menu has *Turn Yourself In* — shorter than being chased, and it ends with a clean record.
