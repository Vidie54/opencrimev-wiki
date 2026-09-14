---
title: Jobs Overview
description: How jobs work, and what each one pays.
icon: briefcase
---
## Taking a job

Open the job list with `/jobs` or from **Interaction Menu → Jobs & Missions**, or walk to the job's marker on the map. **Side jobs** can be picked up and dropped freely; the two **full-time services** — Police and Paramedic — are careers with ranks and a cooldown after quitting.

Except for Police and Paramedic, a shift starts by **getting into the job vehicle at the depot and pressing {key:INPUT_PICKUP}**. The vehicle gets a blip while you are away from it. `/quitjob` leaves the job, `/cancelmission` drops the current run.

Payouts go through the [bonus system](wiki:economy/bonuses-and-events): events and VIP multiply them. Every finished run also pays XP.

## The jobs

| Job | Type | Salary | XP | Where |
|---|---|---|---|---|
| [Pizza delivery](wiki:jobs/side-jobs#pizza-delivery) | side | {money:jobs.pizzaboy.salary} | {var:jobs.pizzaboy.xp} | Pizza This! (three shops) — a `pizzaboy` scooter |
| [Taco seller](wiki:jobs/side-jobs#taco-seller) | side | per taco | — | the depot; sell wherever you park |
| [Bus driver](wiki:jobs/side-jobs#bus-driver) | side | {money:jobs.busdriver.salary} | {var:jobs.busdriver.xp} | Dashound depot |
| [Truck driver](wiki:jobs/side-jobs#truck-driver) | side | {money:jobs.truckdriver.salary} | {var:jobs.truckdriver.xp} | Port of Los Santos |
| [Tow truck](wiki:jobs/side-jobs#tow-truck) | side | {money:jobs.towtruck.salary} | {var:jobs.towtruck.xp} | the impound lot |
| [Firefighter](wiki:jobs/side-jobs#firefighter) | side | {money:jobs.firefighter.salary} | {var:jobs.firefighter.xp} | fire station |
| [Taxi driver](wiki:jobs/taxi) | full-time | {money:jobs.taxidriver.salary} | {var:jobs.taxidriver.xp} | Downtown Cab Co. |
| [Police officer](wiki:jobs/police) | full-time | {money:jobs.police.salary} × rank | {var:jobs.police.xp} | four stations · level {var:jobs.police.level}, no wanted level |
| [Paramedic](wiki:jobs/paramedic) | full-time | per treatment | per treatment | the duty nurse in any hospital |

Salary is the base for one completed run; the police multiply it by rank, the paramedic and taco seller are paid per action. [Gangs](wiki:jobs/gangs) are jobs too, with no salary.
