---
title: Taxi Driver
description: Downtown Cab Co., fares, NPC and player customers.
icon: briefcase
---
Start at **Downtown Cab Co.** by getting into a cab and pressing {key:INPUT_PICKUP}. Customers are both NPCs waiting around the city and real players who called with `/taxi`.

- `/fare <amount>` sets your price per kilometre, up to a maximum.
- Each completed ride pays the fare plus the job salary of {money:jobs.taxidriver.salary} and {var:jobs.taxidriver.xp} XP.

## AI taxis

Cabs wait on the ranks (the airport, the city) for everybody. Walk up to a passenger door and press {key:INPUT_PICKUP}, pick a destination, and you are driven there for a distance-based fare. `/taxi` calls one to you.
