# SurakshChain Backend

Prototype backend for SurakshChain — a micro-insurance settlement platform for
Stellar Testnet. See `/Users/ahir/Projects/arakis/plam.md` for the full plan.

## Status

Initial scaffold: Fastify + TypeScript + Prisma, `/health` and `/ready`
endpoints, Postgres schema for the full claim/policy/payout lifecycle.
Domain services (policy, claims, oracle, funding, Stellar) are not yet
implemented — this is the Hour 0-1 foundation only.

## Setup

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL etc.
npm install
docker compose up -d db   # or point DATABASE_URL at your own Postgres
npx prisma migrate dev --name init
npm run dev
```

Then `curl http://localhost:3000/health`.

## Environment variables

See `.env.example`. `FUNDING_PROVIDER=mock` keeps the backend runnable
without Previ credentials.

## Prototype vs production

Registry checks, weather/disaster feeds, and (until credentials exist)
funding are mocked/simulated. Settlement runs on Stellar Testnet. None of
this is a licensed insurer or production funding rail — see plam.md §47.
