---
title: Chat & Voice
description: Text chat, private messages, proximity voice and the player board.
icon: flag
---
## Text chat

{key:openChat} opens the chat, {key:toggleChatVis} hides and shows the window, {key:chatScrollUp} / {key:chatScrollDown} scroll it.

| Command | What it does |
|---|---|
| `/local <text>` | heard by players within 20 m only |
| `/pm <id> <text>` (`/msg`) | private message; `/r` replies to the last one |
| `/timestamp` | show or hide the time in front of messages |
| `/id` · `/ping` | your server id · your latency |
| `/admins` | who on staff is online |
| `/report [id] <reason>` | report a player or a bug to the staff |
| `/welcome` | greet a new player (helpers) |

Chat is English; take other languages to `/local`. The [rules](wiki:rules/general#4-chat-and-voice) apply to everything you type.

## Voice

Voice is **proximity**: players within about **{var:voice.range} m** hear you. Use your GTA push-to-talk key, or switch to voice activation in GTA **Settings → Voice Chat**. There is no radio.

## Player board

Hold {key:+scoreboard} for the player board: everyone online with their id, job, level and staff tag. That is where you find the id for `/pm`, `/report` or a [bounty](wiki:crime/bounties).
