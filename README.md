# Community People Finder - Devcon 7 Problem 2

This project queries an index of ENS profiles on Sepolia to match users with community members who can help them based on a natural language question.

## Community ENS Index
We seeded the following 8 community members on Sepolia:
- `alice-builder.eth`
- `bob-rust-expert.eth`
- `carol-designer.eth`
- `dave-adversarial.eth`
- `eve-mentor.eth`
- `frank-dev.eth`
- `grace-frontend.eth`
- `heidi-solidity.eth`

These profiles contain the text records:
- `community.bio`: A description of their skills.
- `community.available`: `yes` or `no`.

## Recorded Test Queries
See `recorded-queries.json` for sample queries and expected member arrays.

## Setup
1. `pnpm install`
2. Create `.env` from `.env.example`
3. `pnpm run dev`
