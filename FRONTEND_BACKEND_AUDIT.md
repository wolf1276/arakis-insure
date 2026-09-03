# SurakshChain Backend Capability Audit

Audited: `/Users/ahir/Projects/arakis/backend` (read-only, 2026-09-03)

## 1. Architecture Summary

- **Framework**: Fastify 4 (`@fastify/jwt`, `@fastify/swagger` + `swagger-ui` at `/docs`), TypeScript, ESM (`"type": "module"`).
- **Entry point**: `src/server.ts` calls `buildApp()` from `src/app.ts` and listens on `config.port` (default 3000, host `0.0.0.0`).
- **Route mounting**: `src/app.ts` registers each route module as a Fastify plugin: `health`, `users`, `policies`, `claims`, `oracle`, `funding`, `stellar`, `disaster`, `demo`, `dashboard`, `auth`. No global prefix beyond each route's own `/api/...` path.
- **DB**: Prisma (`@prisma/client`) against Postgres, `src/database/prisma.ts` exports a singleton `prisma` client. Schema at `backend/prisma/schema.prisma`.
- **Auth**: JWT via `@fastify/jwt`, signed in `auth.routes.ts` on register/login (`app.jwt.sign({userId, role}, {expiresIn:'24h'})`). Middleware `src/middleware/auth.ts` (`authenticate`) calls `request.jwtVerify()`; `src/middleware/rbac.ts` (`authorize(...roles)`) checks `request.user.role`.
  - **Only `/api/auth/me` and all of `dashboard.routes.ts`** (via `app.addHook('preHandler', authenticate)`) actually require a valid JWT.
  - `authorize`/RBAC middleware exists but **is never imported or wired into any route** — no route enforces role-based access.
  - Passwords: PBKDF2 (sha512, 100k iterations) via `node:crypto`, stored as `salt:hash` in `User.passwordHash`.
- **Validation**: Zod schemas exist for `auth` (register/login), `claim.service.createClaimSchema`, `policy.service.createPolicySchema`, `user.service.createUserSchema`/`createNomineeSchema`, `disaster.service.simulateDisasterSchema`. However **most routes never call these schemas** — only `auth.routes.ts` and `disaster.routes.ts` actually run `.safeParse()` before calling the service; `users.routes.ts`, `policies.routes.ts`, `claims.routes.ts`, `funding.routes.ts` cast `request.body as any` directly into the service, so a malformed body reaches Prisma raw (Prisma itself will then throw a `P...` error, caught generically as 400 `DATABASE_ERROR`).
- **Error handling**: Centralized in `app.ts`'s `setErrorHandler` (there is also an unused `src/middleware/error-handler.ts` with identical logic, not registered). Custom `AppError` class (`src/types/errors.ts`) carries a `code` + `statusCode`; unknown errors → 500 `INTERNAL_ERROR`; Prisma error codes (`P...`) → 400 `DATABASE_ERROR`.
- **Env vars** (from `.env.example`): `DATABASE_URL`, `PORT`, `JWT_SECRET`, `STELLAR_NETWORK`, `STELLAR_RPC_URL`, `STELLAR_HORIZON_URL` (default testnet horizon), `STELLAR_TREASURY_PUBLIC_KEY`, `STELLAR_TREASURY_SECRET_KEY`, `ORACLE_PRIVATE_KEY`, `ORACLE_PUBLIC_KEY`, `FUNDING_PROVIDER` (`mock`|`previ`), `PREVI_API_URL`/`_API_KEY`/`_API_SECRET`, `MOCK_MODE`.
- **Key modules**: `oracle/` (3-source verification engine + attestation signing/verification), `funding/` (pluggable treasury funding provider: mock in-memory vs. real Previ HTTP API), `stellar/` (Horizon SDK client + payment/tx-status), `notifications/` (SMS + WhatsApp, both mock), `disaster/` service (parametric flood/drought/cyclone/earthquake simulation + payout fan-out), `demo/` routes (fully scripted end-to-end flows for hackathon demos), `dashboard/` (aggregate stats for an ops view).

## 2. Feature Matrix

| Feature | Backend Exists? | Endpoint | Method | Request shape | Response shape | Notes |
|---|---|---|---|---|---|---|
| User registration | IMPLEMENTED | `/api/auth/register` | POST | `{name, phone, email?, password(min6), role?}` (zod `registerSchema`) | `{success, data:{user:{id,name,phone,email,role}, token}}` | Password hashed via PBKDF2; JWT issued (24h). |
| User login | IMPLEMENTED | `/api/auth/login` | POST | `{phone, password}` (zod `loginSchema`) | `{success, data:{user, token}}` | 401 `INVALID_CREDENTIALS` on mismatch. |
| Get current user | IMPLEMENTED | `/api/auth/me` | GET | none (Bearer JWT) | `{success, data:{userId, role}}` | Only returns JWT claims, not full profile. |
| User profile/detail | PARTIALLY IMPLEMENTED | `/api/users/:id` | GET | none | `{success, data: User}` | No auth guard — any caller can fetch any user by id. No "my profile" convenience route; `id` must be known. |
| Create user (non-auth path) | IMPLEMENTED | `/api/users` | POST | `{externalId?, name, phone, language?}` (schema defined but **not enforced** in route) | `{success, data: User}` | Separate from `/api/auth/register` — no password/role, legacy/internal path. |
| Nominee add | IMPLEMENTED | `/api/users/:id/nominee` | POST | `{name, phone, relationship}` | `{success, data: Nominee}` | No auth guard. |
| Nominee list | IMPLEMENTED | `/api/users/:id/nominees` | GET | none | `{success, data: Nominee[]}` | |
| Policies list (per user) | IMPLEMENTED | `/api/users/:id/policies` | GET | none | `{success, data: Policy[]}` (includes `nominee`) | This is the "my policies" list endpoint. |
| Policy detail | IMPLEMENTED | `/api/policies/:id` | GET | none | `{success, data: Policy}` (includes `user`, `nominee`, `claims`) | No auth guard — no ownership check. |
| Create policy | IMPLEMENTED | `/api/policies` | POST | `{userId, nomineeId?, coverageAmount, premium, disasterCoverage?, accidentCoverage?, deathCoverage?, startDate, endDate}` | `{success, data: Policy}` (status `DRAFT`) | |
| Activate policy | IMPLEMENTED | `/api/policies/:id/activate` | POST | none | `{success, data: Policy}` | Requires nominee set and `endDate` in future; DRAFT→ACTIVE only. |
| Claim list | IMPLEMENTED | `/api/claims` | GET | query `?status=&type=` | `{success, data: Claim[]}` (includes `policy.user`) | Also duplicated per-user at `/api/users/:id/claims`. |
| Create claim | IMPLEMENTED | `/api/claims` | POST | `{policyId, type(ACCIDENT/DEATH/FLOOD/DROUGHT), description?, requestedAmount}` | `{success, data: Claim}` (status `SUBMITTED`) | Requires policy `ACTIVE`. |
| Claim status/detail | IMPLEMENTED | `/api/claims/:id` | GET | none | `{success, data: Claim}` (includes `policy.user/nominee`, `verifications`, `payouts`) | |
| Start verification | IMPLEMENTED | `/api/claims/:id/start-verification` | POST | none | `{success, data: Claim}` | Manual status transition helper (SUBMITTED→VERIFYING, or ADVANCE_PAID→FULL_VERIFICATION). |
| Record single verification | IMPLEMENTED | `/api/claims/:id/verify` | POST | `{source: HOSPITAL/POLICE/CIVIL_REGISTRY, verified, metadata?}` | `{success, data: Verification}` | Manual/admin path parallel to the automated oracle engine. |
| Evaluate verification (quorum) | IMPLEMENTED | `/api/claims/:id/evaluate` | POST | none | `{success, data: Claim}` | Counts `verified=true` rows; if ≥2 of the (up to 3) sources verified, transitions VERIFYING→PRELIMINARILY_VERIFIED — this is the "2-of-3" quorum. |
| Oracle verification (automated, 3 adapters) | MOCKED (deterministic stub logic, real orchestration/DB code) | `/api/oracle/verify/:claimId` | POST | none | `{success, data:{results:[{source,verified,referenceHash,metadata}], verifiedCount, passed}}` | Runs Hospital/Police/CivilRegistry adapters in parallel; Hospital & Police "verify" `true` for ACCIDENT/DEATH claims, CivilRegistry only for DEATH — pure hardcoded boolean logic (`metadata.mock:true`), no external calls. `passed = verifiedCount>=2` (2-of-3 quorum), auto-transitions claim to PRELIMINARILY_VERIFIED. |
| Oracle attestation create | IMPLEMENTED (crypto real, but falls back to sha256 mock signature if no key configured) | `/api/oracle/attest/:claimId` | POST | none | `{success, data:{hash, signature, publicKey, timestamp}}` | Requires claim `PRELIMINARILY_VERIFIED`. Uses `ORACLE_PRIVATE_KEY` if set (real `crypto.sign`), else a sha256-based mock signature. |
| Oracle attestation verify | IMPLEMENTED | `/api/oracle/attestation/:claimId` | GET | none | `{success, data:{valid, hash, publicKey}}` | Verifies hash always; verifies real signature only if not mock format. |
| Claim verifications list | IMPLEMENTED | `/api/claims/:id/verifications` | GET | none | `{success, data: Verification[]}` | |
| Emergency/advance authorization | IMPLEMENTED | `/api/claims/:id/authorize-advance` | POST | none | `{success, data:{claimId, advanceAmount, advancePercent}}` | Requires PRELIMINARILY_VERIFIED. 20% of coverage for DEATH, 10% for all others (ACCIDENT/FLOOD/DROUGHT); sets claim ADVANCE_ELIGIBLE. |
| Approve claim (final) | IMPLEMENTED | `/api/claims/:id/approve` | POST | none | `{success, data: Claim}` | Requires FULL_VERIFICATION; `finalAmount = coverage - advanceAmount`. |
| Create payout (advance or final) | IMPLEMENTED | `/api/claims/:id/payout` | POST | `{type: ADVANCE/FINAL, amount}` | `{success, data: Payout}` | ADVANCE requires ADVANCE_ELIGIBLE (→ADVANCE_PAID); FINAL requires APPROVED (→FINAL_PAID). `amount` is accepted from the body and NOT validated against the previously computed `advanceAmount`/`finalAmount` — caller can pass any number. |
| Fund payout (treasury draw) | IMPLEMENTED | `/api/funding/payout/:payoutId` | POST | none | `{success, data:{payoutId, funded, source:'provider'|'treasury', fundingTransactionId}}` | Pulls from mock or Previ provider if treasury balance insufficient, else marks funded from "treasury" directly; sets Payout status FUNDING or FUNDED. |
| Treasury/balance | IMPLEMENTED | `/api/funding/balance` | GET | none | `{success, data:{available, reserved, asset}}` | From active `FundingProvider` (mock: in-memory 1,000,000 XLM default, no DB `Treasury` row read at runtime despite `Treasury` model existing). |
| Funding transactions list/detail | IMPLEMENTED | `/api/funding/transactions`, `/api/funding/transactions/:id` | GET | query `?status&provider` / none | `{success, data: FundingTransaction[]}` / `{...status}` | |
| Stellar payout execution (settlement) | IMPLEMENTED, testnet only | `/api/stellar/payout/:payoutId` | POST | none | `{success, data:{payoutId, stellarTransactionHash, amount, status, ledger}}` | Requires Payout `FUNDED`. Sends a real native-XLM `Operation.payment` via Horizon testnet SDK to nominee's `accountReference` or user's `stellarAccount`; fails with `STELLAR_TRANSACTION_FAILED` if neither Stellar address is set. |
| Stellar transaction lookup | IMPLEMENTED | `/api/stellar/transaction/:hash` | GET | none | `{success, data:{hash, successful, ledger, created_at}}` | Real Horizon testnet lookup; 404 `STELLAR_TRANSACTION_FAILED` if not found. |
| Disaster/flood simulation (raw) | IMPLEMENTED | `/api/disasters/simulate` | POST | `{type: FLOOD/DROUGHT/CYCLONE/EARTHQUAKE, location, measurement, threshold, secondaryConfirmation}` (zod) | `{success, data: DisasterEvent}` (200 if unverified/rejected, 201 if created & verified) | Verified iff `measurement > threshold AND secondaryConfirmation===true`; creates sha256 hash+mock signature "oracle attestation" — not real external sensor data, purely client-supplied numbers. |
| Trigger parametric payouts for event | IMPLEMENTED | `/api/disasters/:eventId/trigger` | POST | none | `{success, data:{eventId, type, location, measurement, threshold, verified, policiesAffected, payoutsExecuted, funded, stellared, transactions[]}}` | Fans out to all `ACTIVE` policies with `disasterCoverage=true`, creates one `PARAMETRIC` Payout per policy for full `coverageAmount`, then attempts fund+Stellar-settle each (partial failures swallowed and just excluded from counts). |
| Eligible policies for disaster | PARTIALLY IMPLEMENTED (internal only) | — no dedicated endpoint — | — | — | — | `findAffectedPolicies()` in `disaster.service.ts` computes this (all ACTIVE + `disasterCoverage=true`) but is not exposed via any route; frontend cannot preview affected policies before triggering. |
| Disaster event detail/list | IMPLEMENTED | `/api/disasters/:eventId`, `/api/disasters` | GET | none | `{success, data: DisasterEvent}` / `DisasterEvent[]` (includes `payouts`) | |
| Full canned demo: accident claim | IMPLEMENTED (scripted) | `/api/demo/accident` | POST | none | `{success, data:{claimId, claimNumber, status:'FINAL_PAID', verification:{hospital,police,civilRegistry,passed}, advance:{amount,status,stellarTransactionHash}, finalPayout:{amount,status,stellarTransactionHash}}}` | Requires seed data (`prisma/seed.ts`, user named "Demo"... **but seed.ts actually creates "Ramesh Kumar", not a "Demo"-named user** — see Gaps). Runs the full lifecycle server-side in one call: create claim→oracle verify→attest→authorize advance→advance payout→fund→Stellar settle→approve→final payout→fund→Stellar settle→notify→audit log. |
| Full canned demo: flood | IMPLEMENTED (scripted) | `/api/demo/flood` | POST | none | `{success, data:{eventId, type, measurement, threshold, verified, policiesAffected, payoutsExecuted, transactions[]}}` | Hardcodes `measurement:412 > threshold:350`, `location:'Village-A'`, always verified; runs simulate→parametric payouts→notify all affected users→fund+settle each. |
| Notifications (SMS) | MOCKED | — (internal service, no direct HTTP route) | — | — | — | `MockSMSProvider` just pushes to an in-memory array and returns `{sent:true, provider:'mock-sms'}` — no real Twilio/SMS gateway integration. No IVR/USSD provider exists at all. |
| Notifications (WhatsApp) | MOCKED | — (internal service, no direct HTTP route) | — | — | — | `MockWhatsAppProvider`, same pattern, no real WhatsApp Business API. |
| Notification history/inbox endpoint | NOT IMPLEMENTED | — | — | — | — | No route lists sent notifications; only the in-process mock providers keep an unqueryable in-memory `sent[]` array (also not exposed, and reset on restart). |
| KPIs/admin stats dashboard | IMPLEMENTED (auth required) | `/api/dashboard/stats` | GET | Bearer JWT | `{success, data:{claims:{byStatus}, payouts:{byStatus, totalPaid}, disasters:{total, verified}, policies:{byStatus}}}` | Only route group requiring `authenticate`; no role check (any authenticated user, including plain USER role, can view). |
| Dashboard claims/payouts/disasters/treasury summaries | IMPLEMENTED (auth required) | `/api/dashboard/claims`, `/api/dashboard/payouts`, `/api/dashboard/disasters`, `/api/dashboard/treasury` | GET | Bearer JWT, query `?status&type` on first two | `{success, data:[...]}` / treasury `{available, reserved, asset, totalFunded}` | |
| Health/readiness | IMPLEMENTED | `/health`, `/ready` | GET | none | `{status, database, stellar:'connected' (hardcoded, not actually checked), fundingProvider}` | `stellar: 'connected'` is a hardcoded literal, not a live Horizon ping — misleading if Stellar network is down. |
| API docs | IMPLEMENTED | `/docs` | GET | — | Swagger UI | Only `auth.routes.ts` has full OpenAPI `schema` blocks; every other route is undocumented in Swagger. |

## 3. Real end-to-end demo flow (accident claim)

Two ways to reach the same outcome:

**A. One-shot canned demo** (requires `npm run seed` first, which creates policy `DEMO-POL-0001` for user "Ramesh Kumar" — but the route's own DB lookup searches for a user with `name: { contains: 'Demo' }`, which will **not match "Ramesh Kumar"** — this path is currently broken unless the seed or the lookup is fixed; see Gaps):
1. `POST /api/demo/accident` — runs the entire lifecycle server-side.

**B. Manually chained real endpoints** (works against any user/policy/claim regardless of seed naming):
1. `POST /api/auth/register` → get `token`, `user.id`
2. `POST /api/policies` with `userId`, coverage, `accidentCoverage:true`, dates → policy `DRAFT`
3. `POST /api/users/:id/nominee` → nominee id
4. `POST /api/policies/:id` update path doesn't exist for nominee — must create policy with `nomineeId` at creation, or there is no "attach nominee to existing policy" endpoint (see Gaps) — in practice pass `nomineeId` at step 2.
5. `POST /api/policies/:id/activate` → policy `ACTIVE`
6. `POST /api/claims` `{policyId, type:'ACCIDENT', requestedAmount}` → claim `SUBMITTED`
7. `POST /api/claims/:id/start-verification` → `VERIFYING`
8. `POST /api/oracle/verify/:claimId` → runs 3 mock adapters, auto-transitions to `PRELIMINARILY_VERIFIED` if ≥2 pass (Hospital+Police pass for ACCIDENT, so this always succeeds)
9. `POST /api/oracle/attest/:claimId` → signs attestation
10. `POST /api/claims/:id/authorize-advance` → claim `ADVANCE_ELIGIBLE`, returns `advanceAmount` (10% of coverage)
11. `POST /api/claims/:id/payout` `{type:'ADVANCE', amount}` → Payout `PENDING`, claim → `ADVANCE_PAID`
12. `POST /api/funding/payout/:payoutId` → Payout `FUNDED`
13. `POST /api/stellar/payout/:payoutId` → real testnet payment, Payout `CONFIRMED`, claim still `ADVANCE_PAID`
14. `POST /api/claims/:id/start-verification` → `FULL_VERIFICATION`
15. `POST /api/claims/:id/approve` → claim `APPROVED`, `finalAmount` computed
16. `POST /api/claims/:id/payout` `{type:'FINAL', amount}` → Payout `PENDING`, claim → `FINAL_PAID`
17. `POST /api/funding/payout/:payoutId` → `FUNDED`
18. `POST /api/stellar/payout/:payoutId` → `CONFIRMED`, real Stellar tx hash

This is a genuinely real, working flow (real Stellar testnet settlement, real DB state machine); only the oracle "verification" itself is a hardcoded stub.

## 4. Disaster/parametric demo flow

1. `POST /api/demo/flood` — one-shot: hardcoded `measurement:412 > threshold:350` in `Village-A`, always passes verification, fans out `PARAMETRIC` payouts to every `ACTIVE` policy with `disasterCoverage:true`, funds and settles each on Stellar testnet, sends mock SMS/WhatsApp disaster alerts to affected users, writes an `AuditLog` row.

Or manually:
1. `POST /api/disasters/simulate` `{type:'FLOOD', location, measurement, threshold, secondaryConfirmation:true}` (client fully controls whether it "verifies" — no real sensor/oracle feed; measurement must simply exceed threshold and `secondaryConfirmation` must be true)
2. `POST /api/disasters/:eventId/trigger` — creates one `PARAMETRIC` Payout per eligible policy, attempts fund+Stellar settlement for each (failures are silently skipped, not surfaced per-policy)
3. `GET /api/disasters/:eventId` — see resulting payouts and per-policy beneficiaries

There is no endpoint to preview which policies would be affected before triggering (`findAffectedPolicies` is not exposed).

## 5. Missing/Gaps

- **No ownership/authorization enforcement anywhere except `/api/dashboard/*` and `/api/auth/me`.** Any caller (even unauthenticated) can read/mutate any user's policies, claims, verifications, payouts, and trigger real Stellar payments by ID. `authorize()` (RBAC) middleware is fully written but never wired to a single route.
- **No "logged-in user's own resources" convenience routes** — a real frontend dashboard needs `/api/me/policies`, `/api/me/claims` etc. tied to the JWT `userId`; today the frontend must separately track and pass raw DB ids, and nothing binds the JWT identity to the `/api/users/:id/...` routes (id in path is not cross-checked against JWT).
- **No endpoint to update/attach a nominee to an already-created policy** — `nomineeId` can only be set at policy creation time; `PATCH`/`PUT /api/policies/:id` doesn't exist.
- **No endpoint to list a user's own account / Stellar address / KYC status** beyond raw `GET /api/users/:id` (no `/profile` alias, no update-profile route).
- **No endpoint to preview disaster-eligible policies** before triggering payouts (service function `findAffectedPolicies` exists but unrouted).
- **No notification history/inbox API** — sent SMS/WhatsApp messages live only in an in-memory array inside the mock provider instances, not persisted to DB, not queryable, and reset on every server restart. There's no `Notification` Prisma model at all.
- **No IVR or USSD notification channel** — only SMS and WhatsApp mocks exist, and both are non-functional stubs (no Twilio/Gupshup/etc. wiring); `FUNDING_PROVIDER`-style pluggability pattern was not replicated for notifications (no real-provider class exists to swap in).
- **`/api/demo/accident` is likely broken against the current seed script** — it filters `User.findFirst({ where: { name: { contains: 'Demo' } } })` but `prisma/seed.ts` creates a user named `"Ramesh Kumar"`, not containing "Demo". Running the demo cold (seed then hit the endpoint) will 400 with `NO_DEMO_USER` unless the seed or route is changed.
- **Health check's `stellar: 'connected'` is a hardcoded string**, not a live Horizon ping — `/health` cannot actually detect a Stellar/testnet outage.
- **`Treasury` Prisma model is essentially decorative** — `/api/funding/balance` and the whole `FundingProvider` abstraction never read/write the `Treasury` table; balance is tracked purely in the `MockFundingProvider`'s in-memory field (resets on restart, defaults to 1,000,000 XLM) or delegated entirely to the external Previ API. The seeded `Treasury` row (created by `prisma/seed.ts`) is orphaned data nothing reads.
- **`POST /api/claims/:id/payout` accepts an arbitrary `amount` from the client body** rather than deriving it from `claim.advanceAmount`/`claim.finalAmount` computed server-side earlier — a caller can request any payout amount regardless of the authorized/approved amount (financial-integrity gap, not just a UI gap).
- **Most POST/PATCH bodies bypass their own Zod schemas** — `createUserSchema`, `createNomineeSchema`, `createPolicySchema` are defined but the corresponding routes (`users.routes.ts`, `policies.routes.ts`) pass `request.body as any` straight into the service without calling `.safeParse()`, so validation errors surface only as raw Prisma failures (400 `DATABASE_ERROR`) instead of clean `VALIDATION_ERROR` messages.
- **No pagination** on any list endpoint (`/api/claims`, `/api/funding/transactions`, `/api/dashboard/claims`, etc.) — fine for a demo, will need it for a real ops dashboard with growing data.
- **No file/evidence upload endpoint** — `Claim.evidenceHash` field exists in the schema but nothing populates it; there's no route to attach photos/documents to a claim.
- **Swagger/OpenAPI docs are incomplete** — only `auth.routes.ts` declares `schema` blocks; every other route is invisible in `/docs`, so a frontend engineer relying on Swagger will miss most of the API surface (this document is the actual source of truth).
- **No refresh-token / logout / password-reset flow.**

## 6. Claim status enum

From `enum ClaimStatus` in `prisma/schema.prisma`:

| Status | Set by / meaning |
|---|---|
| `SUBMITTED` | Default on `POST /api/claims` (claim created). |
| `VERIFYING` | `POST /api/claims/:id/start-verification` (from `SUBMITTED`). |
| `PRELIMINARILY_VERIFIED` | Auto-set when `POST /api/oracle/verify/:claimId` finds `verifiedCount >= 2` (2-of-3 quorum across Hospital/Police/CivilRegistry adapters), or manually via `POST /api/claims/:id/evaluate` after enough `POST /api/claims/:id/verify` calls. |
| `ADVANCE_ELIGIBLE` | `POST /api/claims/:id/authorize-advance` (from `PRELIMINARILY_VERIFIED`); computes `advanceAmount` = 20% of coverage for `DEATH`, 10% for others. |
| `ADVANCE_PAID` | `POST /api/claims/:id/payout` with `type:'ADVANCE'` (from `ADVANCE_ELIGIBLE`). |
| `FULL_VERIFICATION` | `POST /api/claims/:id/start-verification` again (from `ADVANCE_PAID`) — re-enters verification for the final decision. |
| `APPROVED` | `POST /api/claims/:id/approve` (from `FULL_VERIFICATION`); computes `finalAmount = coverage - advanceAmount`. |
| `REJECTED` | Terminal; reachable from `VERIFYING` or `FULL_VERIFICATION` via the generic `transitionClaim` (no dedicated `/reject` route exists — must be driven through the low-level state-machine helper, not currently exposed by any route). Sets `resolvedAt`. |
| `FRAUD` | Terminal; reachable from `FULL_VERIFICATION` only, same caveat as `REJECTED` — no route calls this transition directly. Sets `resolvedAt`. |
| `FINAL_PAID` | `POST /api/claims/:id/payout` with `type:'FINAL'` (from `APPROVED`). Terminal; sets `resolvedAt`. |

Valid transition table enforced in `src/services/claim.service.ts` (`VALID_TRANSITIONS`):
```
SUBMITTED -> VERIFYING
VERYFING -> PRELIMINARILY_VERIFIED | REJECTED
PRELIMINARILY_VERIFIED -> ADVANCE_ELIGIBLE
ADVANCE_ELIGIBLE -> ADVANCE_PAID
ADVANCE_PAID -> FULL_VERIFICATION
FULL_VERIFICATION -> APPROVED | REJECTED | FRAUD
APPROVED -> FINAL_PAID
REJECTED, FRAUD, FINAL_PAID -> (terminal)
```
Note: `REJECTED`/`FRAUD` are defined in the transition table but **no HTTP route triggers them** — there is no reject/flag-fraud endpoint, only the internal `transitionClaim()` function supports it.

Related enums:
- `PolicyStatus`: `DRAFT, ACTIVE, SUSPENDED, EXPIRED, CANCELLED` (only DRAFT→ACTIVE is actually wired via `/api/policies/:id/activate`; SUSPENDED/EXPIRED/CANCELLED have no route).
- `PayoutStatus`: `PENDING, FUNDING, FUNDED, SUBMITTING, SUBMITTED, CONFIRMED, FAILED` (`SUBMITTED` value exists in enum but code only ever sets `SUBMITTING`→`CONFIRMED`/`FAILED`, never plain `SUBMITTED`).
- `PayoutType`: `ADVANCE, FINAL, PARAMETRIC`.
- `FundingStatus`: `PENDING, REQUESTED, FUNDED, FAILED`.
- `VerificationSource`: `HOSPITAL, POLICE, CIVIL_REGISTRY`.
