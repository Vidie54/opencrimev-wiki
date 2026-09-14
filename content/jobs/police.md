---
title: Police Officer
description: Joining, duty, arrests, the MDT, ranks and the Chief.
icon: briefcase
---
The LSPD is the server's biggest job. You need **level {var:jobs.police.level}** and a **clean record** (no wanted level) to join.

## Joining and duty

Join at any of the four stations: **Rancho**, **Mission Row**, **Vinewood** and **Rockford Hills** — the station menu has *Join Police Force*. Off duty you are a civilian; go on duty from the station menu, or by getting into an emergency vehicle.

- **Duty vehicle** — sign one out from the station motor pool (Interaction Menu or station menu) for a small fee. Hand it back by standing next to it and returning it from the menu; a unit left alone for ten minutes is collected.
- **Armoury** — issues your loadout. Everything goes back in the rack when the shift ends.
- **Locker** — the uniforms: the Cadet kit at the start, better kits by grade. A kit you have earned stays yours after leaving the job — see [Wardrobe & storage](wiki:properties/wardrobe-and-storage).

## Arrests

Get within arm's reach of a suspect and cuff them with {key:INPUT_PICKUP}. A **clean arrest** — taser first, then cuffs, nothing else laid on the suspect — pays **1.5× cash and extra XP** and counts towards promotion.

| Reward | Amount |
|---|---|
| Cash per wanted star | {money:police.cashPerStar} |
| XP per arrest | {var:jobs.police.xp}, plus {var:police.xpPerStar} per star |
| Assists | officers within 80 m share 40 %, up to four of them |
| Suspect's sentence | {var:jail.baseSeconds} s plus {var:jail.secondsPerStar} s per star |

Drive the suspect to a station cell block for the full payout — the transport rule cuts it when the suspect is jailed on the spot. An arrest impounds the cars around it; the owner pays **{money:police.bail}** bail to get one out, or **{money:police.retrieve}** for a retrieve.

## Dispatch

Crimes reach you as dispatch calls: ATM hacks, the security truck, pickpockets caught in the act, drunk drivers, store robberies. A call shows a GPS prompt for fifteen seconds — accept it and the route is set.

## AI criminals

While at least one officer is on duty, AI suspects spawn around the city. They pay less than a real arrest, **never count towards promotion**, and killing one costs a fine.

## The MDT

Press {key:vehiclecontrolsmenu} inside an emergency vehicle: warrants, plate lookups, the unit roster, and the **COMMAND** tab for the Chief. `/wanted` (also `/cops`, `/police`) shows who is on duty.

## Ranks

Rank is earned, never given. Your career XP, arrests and clean arrests are kept on the character and the grade falls out of them:

| Grade | XP | Arrests | Clean | Salary |
|---|---|---|---|---|
| Cadet | 0 | 0 | 0 | ×1.00 |
| Officer | 750 | 5 | 1 | ×1.05 |
| Senior Officer | 2 500 | 20 | 6 | ×1.12 |
| Corporal | 6 000 | 45 | 18 | ×1.20 |
| Sergeant | 12 000 | 85 | 40 | ×1.30 |
| Lieutenant | 22 000 | 150 | 80 | ×1.45 |
| Captain | 40 000 | 250 | 150 | ×1.60 |
| Chief of Police | 70 000 | 400 | 260 | ×1.80 |

All three columns must be met. Career stats survive quitting and rejoining.

## Chief of Police

One post, not a rank: the highest-scoring officer **online** who has reached the top grade. It is recomputed as officers come and go, so the Chief can change mid-shift. The Chief gets +15 % salary, a free duty vehicle, the unmarked cruiser and SWAT transport, a sniper in the armoury, and the COMMAND tab — where the only power over other officers is a **kick or ban from the force, each with a reason, each logged**. An officer at the top grade while somebody else holds the office is a Deputy Chief.

> [!POLICE] Rules
> Lethal force on a suspect who is not shooting at you is *Excessive Force* and puts stars on **you**. The rest is on [Police rules](wiki:rules/police).

Police-only commands: `/jail <id> <minutes>`, `/unjail <id>`, `/policeunban <id>` (Chief).
