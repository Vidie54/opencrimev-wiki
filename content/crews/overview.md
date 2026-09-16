---
title: Crews
description: Found a crew with friends — a CEO, ranks and permissions, a shared office, a garage, a bank that pays rewards and buys cars, and crew levels.
icon: tag
---
A **crew** is your own organisation: a name, a tag in brackets in front of your name on the scoreboard, a CEO, up to {var:crews.memberCap.max} members, a level, a bank and a shared office with a garage. It sits **on top of** jobs and gangs — you keep whatever job you have.

## Founding a crew

Walk into the **office building lobby** (the office blip) and use the desk. Founding costs {money:crews.createPrice} and needs player level {var:crews.createMinLevel}. Pick a name (4–20 characters) and a tag (3–4 letters or digits) — the menu tells you at once whether they are free. The founder is the **CEO**.

## Ranks and permissions

| Rank | Is |
|---|---|
| **CEO** | runs the crew: ranks, permissions, settings, leadership, disband — and holds every permission |
| **Co-Leader** (up to {var:crews.maxCoLeaders}) | a member who starts with the *Invite*, *Kick*, *Garage slots* and *Invest* permissions |
| **Member** | uses the office and the garage, deposits to the bank |

On top of the rank every member carries **permissions** the CEO switches on and off per person at the CEO computer (Members → the member → Permissions):

| Permission | Lets you |
|---|---|
| Invite | invite players into the crew |
| Kick | kick members below your own rank (never a co-leader as a co-leader, never the CEO) |
| Garage slots | change parking slots in the crew garage |
| Invest | buy investments from the crew bank |
| Rewards | pay personal and crew bonuses from the crew bank |
| Buy vehicles | buy showroom vehicles with crew money |

A promotion to co-leader brings the co-leader defaults with it, a demotion takes them away; anything the CEO granted on top stays yours. There is always exactly one CEO. The CEO leaves by transferring leadership first (or disbanding). If the CEO has been gone for a month, the longest-serving co-leader can claim the crew from the computer.

## Joining and leaving

Somebody with the *Invite* permission invites you with `/crewinvite <id>` or from the reception desk. You have two minutes to `/acceptinvite` (or use the **Crew** entry of the interaction menu). One crew per player. Leaving (`/crewleave`, or the lobby menu) starts a **{var:crews.leaveCooldown} hour** cooldown before you can join another.

## Levels

Everything the crew does earns crew XP: every job payout gives a share, Simeon contracts give more — and finishing one with a crew-mate in the same group pays a bonus. Levelling up raises the member cap (from {var:crews.memberCap.base}) and the garage slots (from {var:crews.garageSlots.base}). Max level is {var:crews.maxLevel}. `/crews` lists every crew by level.

## Office

Your crew's office is behind the lobby. Every member shares it and you meet each other inside; a member can invite guests with `/invite` like any property. Two points inside run the crew: the **reception desk** (everybody: overview, roster, invites, the bank) and the **CEO computer** (CEO and co-leaders: ranks and permissions, investments, rewards, crew vehicles, settings). The **lift** leaves the building or goes down to the crew garage. `/crew` shows your crew card anywhere.

## Garage

Every member parks **their own** vehicles in the crew garage; the slot count is the crew's. The street door parks and releases cars, the lift inside the office walks you in. **Driving is the only way in and out** — nothing is moved into or out of the crew garage from a garage menu or *My Vehicles*. Changing parking slots at the management point needs the *Garage slots* permission. Leave the crew and those cars are unreachable until you are in a crew based at that building again — fetch them from *My Vehicles* like a car in a garage you no longer own.

## Bank

Any member deposits **cash** at the reception desk; deposits are final. **Nobody withdraws** — the bank only ever pays for what the crew buys, at the CEO computer:

- **investments** — extra garage slots and an extra member slot, permanent;
- **rewards** — see below;
- **crew vehicles** — see below.

Every movement is logged with a name. Disbanding the crew **forfeits** whatever is in the bank.

## Rewards

The CEO, or a member with the *Rewards* permission, pays bonuses from the crew bank to a member's bank account:

- **Personal bonus** — one member, never yourself, up to {money:crews.rewards.personalMax}. Each member can receive one every {var:crews.rewards.personalHours} hours, whoever pays it.
- **Crew bonus** — everyone online gets the same amount (up to {money:crews.rewards.perMemberMax} each), once per crew every {var:crews.rewards.crewHours} hours.
- **Level-up bonus** — switched on by the CEO in the Rewards menu: every member online gets {money:crews.rewards.levelUp} each time the crew levels up. If the bank cannot cover everyone, nobody is paid.

## Crew vehicles

At a showroom, a member with the *Buy vehicles* permission sees a second button, **Buy for crew** — the car is paid from the crew bank and delivered to the crew garage. It belongs to the crew: it cannot be sold at a dealer, it parks only in the crew garage, and it follows the CEO post when leadership changes. Until the crew garage gets its shared floor, **the CEO drives it**. The CEO computer's Vehicles list sells a crew vehicle back into the crew bank.

## Settings

The CEO changes the tag colour for free, the tag itself for {money:crews.renameTagPrice}, and can relocate the office for {money:crews.relocatePrice} when more buildings exist. Disbanding forfeits the bank (and sells the crew's vehicles into it first) and is confirmed by typing the tag.
