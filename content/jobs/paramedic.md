---
title: Paramedic
description: Healing, reviving, calls, injured civilians and the ambulance.
icon: briefcase
---
## Signing on

Sign on at the **duty nurse** inside any hospital — Pillbox Hill, Central Los Santos, Mount Zonah, Sandy Shores or Paleto Bay. The nurse menu works off duty too: it shows the call list, but says "sign on to see calls" until you do. On/off duty is a toggle in that menu.

## Treating players

| | Pays | How |
|---|---|---|
| **Heal** | {money:paramedic.healCash} · {var:paramedic.healXp} XP | instant, within {var:paramedic.treatRadius} m |
| **Revive** | {money:paramedic.reviveCash} · {var:paramedic.reviveXp} XP | nine seconds at the body; the patient gets up where they fell, keeps what the death took, pays no hospital fee |

- **Cooldowns are on the patient**, not on you — two players cannot farm each other by taking turns.
- You **cannot treat somebody you attacked** in the last {var:paramedic.attackerMinutes} minutes. Killing them does not reset it. Another medic can.
- Treating yourself never pays.

## Calls

A dying player can call a medic while their death timer fills, if one is on duty within {var:respawn.medicRadius} m. Every on-duty paramedic gets a blip on the body until somebody answers, the caller cancels, or they respawn.

## Injured civilians

While medics are on duty, injured NPCs appear around the map and on your markers. Treat them the same way — a two-phase treatment — for a payout by severity. **Park an ambulance at the scene** or the reward is cut.

## The ambulance

One at a time, like the police duty vehicle: request it from the nurse menu and it is brought to the bay or dropped on the road beside you; hand it back by standing next to it. A second request is refused while you hold one, and refused when an ambulance is already parked at the bay.

The **locker** at the nurse issues the medical uniform. Payouts go through [bonuses](wiki:economy/bonuses-and-events) like every job.
