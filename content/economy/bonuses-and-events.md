---
title: Bonuses & Events
description: Event multipliers, VIP, and how they stack.
icon: dollar
---
`/events` shows what is active and what is coming. Every multiplier goes through one engine, so the maths is the same everywhere.

## Global events

Date-driven, server-wide. Examples: **Weekend** (×1.5 on payouts), **Easter** (×1.2), **Christmas**. They apply to every reward category they name.

## World events

One at a time, announced when they start:

- **Airdrop** — a military crate drops somewhere on the map with a large cash prize; the map shows where.
- **Security truck** — see [Robberies](wiki:crime/robberies#security-truck).

## VIP

Bought on the website ({website}) for an account, not a character:

- **+{var:vip.rewardBonus} %** on every payout
- **−{var:vip.shopDiscount} %** on every purchase

Delivered to the game automatically; `/refreshrewards` claims anything pending if it has not arrived. The website store also sells other things — cars, garages, warehouses — through the same delivery.

## Stacking

Multipliers multiply: a ×1.5 event and VIP pay 1.5 × 1.1 = ×1.65. Discounts only ever apply to what you **pay** — never to what a shop pays you for something.
