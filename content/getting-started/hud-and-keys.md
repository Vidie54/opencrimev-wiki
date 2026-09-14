---
title: HUD & Keys
description: What is on the screen, the keys that matter, needs, XP and the AFK kick.
icon: flag
---
## The keys you need on day one

| Action | Key |
|---|---|
| Interaction menu | {key:interactionmenu} (or middle mouse) |
| Inventory | {key:open_inventory} |
| Interact / pick up / enter as passenger | {key:INPUT_PICKUP} |
| Vehicle controls · MDT (police) | {key:vehiclecontrolsmenu} |
| Lock / unlock your vehicle | {key:togglevehiclelock} |
| Map | {key:map} |
| Player board (hold) | {key:+scoreboard} |
| This wiki | {key:open_help} |
| Chat · hide chat | {key:openChat} · {key:toggleChatVis} |
| Toggle HUD | {key:+openHud} |

Everything is rebindable in GTA **Settings → Key Bindings → FiveM**. The full list is on [Keybinds](wiki:controls/keybinds).

## What is on screen

- **Cash / bank** top right, with your level and XP bar.
- **Wanted stars** appear when you are wanted — see [Wanted level](wiki:crime/wanted-level).
- **Needs bars** (hunger, thirst, and the alcohol / drugs meters when they are above zero) — bottom of the HUD.
- **Hints** — the rotating help box. Turn it off under Options → Show Hints; "Press E" prompts are never affected.
- **Radar** — Options → Mini-map Radar toggles it; Options → Map Blips filters what the map shows.
- **Units** — km/h or mph, metres or feet: Options → Units.

## Needs

Hunger and thirst decay a little every two minutes. Below a threshold you stop regenerating and start taking damage, so keep something to eat and drink in the [inventory](wiki:economy/inventory) — 24/7s, liquor stores and vending machines sell it. Alcohol and drugs are the other two meters: they go up when you drink or smoke and fade on their own.

## Levels and XP

Jobs, arrests, missions, races and the range all pay XP. Each level pays **{money:level.cash}** cash, and level **{var:jobs.police.level}** opens the police job. Details on [Levels & XP](wiki:economy/levels-and-xp).

## AFK

Stand still for **{var:afk.minutes} minutes** and the server kicks you to free the slot. You get a warning every couple of minutes before that.
