# SurakshChain Backend — 10-Hour Implementation Plan

## Team Arakis | Smart India Hackathon

---

# 1. Objective

Build a demo-ready backend for **SurakshChain**, a micro-insurance platform for farmers, informal workers, and rural communities.

The backend must demonstrate a complete financial lifecycle:

```text
USER
  ↓
POLICY
  ↓
CLAIM
  ↓
MULTI-SOURCE VERIFICATION
  ↓
ORACLE ATTESTATION
  ↓
PAYOUT AUTHORIZATION
  ↓
FUNDING
  ↓
STELLAR SETTLEMENT
  ↓
BENEFICIARY
  ↓
IMMUTABLE AUDIT TRAIL
```

The prototype will use:

* Stellar Testnet/Soroban
* PostgreSQL
* Backend API
* Mock government/registry adapters
* Real Stellar Testnet transactions
* Previ integration where credentials/API access are available
* A fallback mock funding adapter for development

---

# 2. Core Product Decision

## Do NOT build weather APIs in this sprint.

Do not spend time integrating:

* IMD API
* ISRO API
* Bhuvan API
* Weather APIs
* Satellite APIs

The disaster trigger will be represented through a **deterministic disaster-event engine**.

Example:

```text
Flood Event
    ↓
Rainfall reading = 412mm
    ↓
Configured threshold = 350mm
    ↓
Independent disaster confirmation = TRUE
    ↓
Event verified
    ↓
Eligible policies discovered
    ↓
Payout authorization
    ↓
Funding
    ↓
Stellar settlement
```

The value of the prototype is the **verification → authorization → settlement pipeline**, not the weather-data provider.

---

# 3. Critical Architecture

SurakshChain is NOT the insurer.

The system acts as:

```text
Verification
+
Policy Automation
+
Payout Orchestration
+
Blockchain Settlement
+
Audit Infrastructure
```

The licensed insurer/risk-bearing entity remains outside the core prototype.

Architecture:

```text
                    USER
                     │
          ┌──────────┼──────────┐
          │          │          │
         PWA      WhatsApp      IVR
          │          │          │
          └──────────┼──────────┘
                     ▼
              ┌──────────────┐
              │   REST API   │
              └──────┬───────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
     POLICY        CLAIM       DISASTER
     SERVICE      SERVICE       ENGINE
                      │            │
                      ▼            ▼
                  ORACLE        EVENT
                  ENGINE       VERIFIER
                      │            │
                      └─────┬──────┘
                            ▼
                     ATTESTATION
                            │
                            ▼
                    PAYOUT SERVICE
                            │
                            ▼
                    FUNDING SERVICE
                            │
                    ┌───────┴────────┐
                    ▼                ▼
                  PREVI         MOCK PROVIDER
                    │
                    ▼
                  STELLAR
                    │
                    ▼
               BENEFICIARY
```

---

# 4. Architectural Principle

Separate the following concerns:

```text
Business Logic
      ↓
Funding Abstraction
      ↓
Blockchain Settlement
```

Do NOT tightly couple claim logic to Previ.

Use:

```typescript
interface FundingProvider {
  getBalance(): Promise<Balance>;
  requestFunding(request: FundingRequest): Promise<FundingResult>;
  getFundingStatus(reference: string): Promise<FundingStatus>;
}
```

Implement:

```text
PreviFundingProvider
MockFundingProvider
```

Configuration:

```text
FUNDING_PROVIDER=previ
```

or:

```text
FUNDING_PROVIDER=mock
```

This means the entire backend remains runnable even if Previ credentials are unavailable.

---

# 5. Technology

Prefer the existing repository stack.

If no backend exists, use:

```text
Node.js
TypeScript
Fastify
PostgreSQL
Prisma
Zod
Stellar SDK
Soroban
JWT
Docker
```

Do NOT rewrite an existing working backend simply to match this stack.

---

# 6. Repository Structure

Use a modular monolith.

```text
backend/
│
├── src/
│   ├── server.ts
│   ├── app.ts
│   ├── config.ts
│   │
│   ├── routes/
│   │   ├── users.routes.ts
│   │   ├── policies.routes.ts
│   │   ├── claims.routes.ts
│   │   ├── oracle.routes.ts
│   │   ├── disasters.routes.ts
│   │   ├── payouts.routes.ts
│   │   ├── funding.routes.ts
│   │   ├── dashboard.routes.ts
│   │   └── demo.routes.ts
│   │
│   ├── services/
│   │   ├── user.service.ts
│   │   ├── policy.service.ts
│   │   ├── claim.service.ts
│   │   ├── verification.service.ts
│   │   ├── attestation.service.ts
│   │   ├── disaster.service.ts
│   │   ├── payout.service.ts
│   │   ├── funding.service.ts
│   │   └── notification.service.ts
│   │
│   ├── oracle/
│   │   ├── oracle.service.ts
│   │   ├── verification-engine.ts
│   │   ├── attestation.ts
│   │   └── adapters/
│   │       ├── hospital.adapter.ts
│   │       ├── police.adapter.ts
│   │       └── civil-registry.adapter.ts
│   │
│   ├── funding/
│   │   ├── funding-provider.ts
│   │   ├── previ.provider.ts
│   │   └── mock.provider.ts
│   │
│   ├── stellar/
│   │   ├── client.ts
│   │   ├── config.ts
│   │   ├── treasury.ts
│   │   ├── payout.ts
│   │   └── transactions.ts
│   │
│   ├── database/
│   │   └── prisma.ts
│   │
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── error-handler.ts
│   │
│   ├── utils/
│   │   ├── hashing.ts
│   │   ├── ids.ts
│   │   └── logger.ts
│   │
│   └── types/
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── contracts/
│   ├── policy/
│   ├── claims/
│   └── treasury/
│
├── scripts/
│   ├── setup-stellar.ts
│   ├── seed-demo.ts
│   └── run-demo.ts
│
├── tests/
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── PLAN.md
└── README.md
```

---

# 7. Database

Implement these models.

## User

```text
User
├── id
├── externalId
├── name
├── phone
├── language
├── kycStatus
├── accountReference
├── stellarAccount
├── createdAt
└── updatedAt
```

---

## Nominee

```text
Nominee
├── id
├── userId
├── name
├── phone
├── relationship
├── accountReference
├── verified
├── createdAt
└── updatedAt
```

---

## Policy

```text
Policy
├── id
├── policyNumber
├── userId
├── nomineeId
├── coverageAmount
├── premium
├── disasterCoverage
├── accidentCoverage
├── deathCoverage
├── startDate
├── endDate
├── status
├── stellarReference
├── createdAt
└── updatedAt
```

Statuses:

```text
DRAFT
ACTIVE
SUSPENDED
EXPIRED
CANCELLED
```

---

## Claim

```text
Claim
├── id
├── claimNumber
├── policyId
├── type
├── description
├── requestedAmount
├── advanceAmount
├── finalAmount
├── status
├── evidenceHash
├── oracleAttestation
├── beneficiaryReference
├── createdAt
├── updatedAt
└── resolvedAt
```

Types:

```text
ACCIDENT
DEATH
FLOOD
DROUGHT
```

Statuses:

```text
SUBMITTED
VERIFYING
PRELIMINARILY_VERIFIED
ADVANCE_ELIGIBLE
ADVANCE_PAID
FULL_VERIFICATION
APPROVED
REJECTED
FRAUD
FINAL_PAID
```

---

# 8. Verification Model

```text
Verification
├── id
├── claimId
├── source
├── verified
├── referenceHash
├── responseHash
├── metadata
├── verifiedAt
└── createdAt
```

Sources:

```text
HOSPITAL
POLICE
CIVIL_REGISTRY
```

---

# 9. Disaster Event

No external weather API is required.

```text
DisasterEvent
├── id
├── type
├── location
├── measurement
├── threshold
├── secondaryConfirmation
├── verified
├── oracleAttestation
├── createdAt
└── triggeredAt
```

Example:

```text
type = FLOOD
measurement = 412
threshold = 350
secondaryConfirmation = true
```

---

# 10. Treasury

```text
Treasury
├── id
├── provider
├── stellarAddress
├── asset
├── availableBalance
├── reservedBalance
├── status
├── createdAt
└── updatedAt
```

---

# 11. Funding Transaction

```text
FundingTransaction
├── id
├── provider
├── externalReference
├── amount
├── asset
├── status
├── metadata
├── createdAt
└── completedAt
```

Statuses:

```text
PENDING
REQUESTED
FUNDED
FAILED
```

---

# 12. Payout

```text
Payout
├── id
├── claimId
├── type
├── amount
├── asset
├── beneficiaryReference
├── fundingTransactionId
├── stellarTransactionHash
├── status
├── createdAt
└── completedAt
```

Types:

```text
ADVANCE
FINAL
PARAMETRIC
```

Statuses:

```text
PENDING
FUNDING
FUNDED
SUBMITTING
SUBMITTED
CONFIRMED
FAILED
```

---

# 13. Audit Log

```text
AuditLog
├── id
├── entityType
├── entityId
├── action
├── actor
├── metadata
└── createdAt
```

Record all critical events:

```text
USER_CREATED
POLICY_CREATED
POLICY_ACTIVATED
CLAIM_CREATED
VERIFICATION_COMPLETED
ATTESTATION_CREATED
PAYOUT_AUTHORIZED
FUNDING_REQUESTED
FUNDING_COMPLETED
STELLAR_TRANSACTION_SUBMITTED
STELLAR_TRANSACTION_CONFIRMED
PAYOUT_COMPLETED
DISASTER_VERIFIED
FRAUD_DETECTED
```

---

# 14. User APIs

```http
POST /api/users
GET /api/users/:id
POST /api/users/:id/nominee
GET /api/users/:id/policies
GET /api/users/:id/claims
```

---

# 15. Policy APIs

```http
POST /api/policies
GET /api/policies/:id
POST /api/policies/:id/activate
GET /api/users/:id/policies
```

Policy activation must validate:

```text
User exists
Nominee valid
Coverage valid
Dates valid
Policy not already active
```

---

# 16. Claim APIs

```http
POST /api/claims
GET /api/claims/:id
POST /api/claims/:id/verify
POST /api/claims/:id/advance
POST /api/claims/:id/approve
POST /api/claims/:id/payout
```

---

# 17. Oracle

Create a generic adapter interface.

```typescript
interface VerificationAdapter {
  verify(input: VerificationRequest): Promise<VerificationResult>;
}
```

Implement:

```text
HospitalAdapter
PoliceAdapter
CivilRegistryAdapter
```

These are prototype adapters.

They must NOT claim to be real government integrations.

---

# 18. 2-of-3 Verification

For an accident/death claim:

```text
Hospital
Police
Civil Registry
```

Run all three.

Example:

```text
Hospital       ✓
Police         ✓
Civil Registry ✗
```

Result:

```text
2 / 3 VERIFIED
```

Therefore:

```text
PRELIMINARILY_VERIFIED
```

If fewer than two are verified:

```text
ADVANCE NOT ELIGIBLE
```

---

# 19. Oracle Attestation

Create a cryptographic attestation containing:

```text
claimId
policyId
verification results
verification count
timestamp
```

Generate:

```text
SHA-256(payload)
```

Then sign the attestation with the oracle signing key.

Store:

```text
attestation
oracle public key
timestamp
claim ID
```

The payout layer must require a valid attestation.

---

# 20. Accident Advance

For accident:

```text
advance = coverage × 10%
```

Example:

```text
Coverage = ₹100,000
Advance = ₹10,000
```

For death:

```text
advance = coverage × 20%
```

Example:

```text
Coverage = ₹100,000
Advance = ₹20,000
```

Never allow multiple advances.

---

# 21. Final Payout

Accident:

```text
final = coverage - advance
```

Death:

```text
final = coverage - advance
```

Example:

```text
₹100,000 coverage

Accident:
₹10,000 advance
₹90,000 final

Death:
₹20,000 advance
₹80,000 final
```

Enforce:

```text
advance + final <= coverage
```

---

# 22. Funding Layer

The funding layer is a critical part of the demo.

Architecture:

```text
PayoutService
      ↓
FundingService
      ↓
FundingProvider
      │
      ├── PreviProvider
      │
      └── MockProvider
```

The rest of the backend must never directly call Previ.

---

# 23. Previ Integration

Create:

```text
src/funding/previ.provider.ts
```

The provider must encapsulate:

```text
authentication
funding request
funding status
provider reference
error handling
reconciliation
```

Do not invent undocumented Previ endpoints.

If credentials or API documentation are unavailable:

```text
FUNDING_PROVIDER=mock
```

must allow the backend to continue functioning.

Once the actual Previ API details are available, only the adapter should need modification.

---

# 24. Funding Flow

Before a payout:

```text
Payout Created
      ↓
Check Treasury
      ↓
Sufficient Balance?
      │
   ┌──┴──┐
   │     │
  YES    NO
   │     │
   │     ▼
   │   Request
   │   Funding
   │     │
   │     ▼
   │   Funding
   │   Confirmed
   │     │
   └──┬──┘
      ▼
Stellar Settlement
```

---

# 25. Payout Service

Create one central function:

```typescript
executePayout(payoutId)
```

It must:

1. Load payout.
2. Validate claim.
3. Validate policy.
4. Validate oracle authorization.
5. Check whether payout already completed.
6. Calculate amount.
7. Check treasury/funding.
8. Request funding if required.
9. Confirm funding.
10. Submit Stellar transaction.
11. Confirm Stellar transaction.
12. Save transaction hash.
13. Update payout status.
14. Create audit event.
15. Trigger notification.

---

# 26. Idempotency

All money movement must be idempotent.

Before executing:

```text
Does this payout already have a CONFIRMED transaction?
```

If yes:

```text
Return existing payout.
```

Never execute the same payout twice because of:

* duplicate HTTP request
* frontend retry
* network timeout
* webhook retry

---

# 27. Stellar

Stellar is the settlement and audit layer.

Use Stellar Testnet for the prototype.

Do not create a speculative SurakshChain token.

Use:

```text
Stellar native/test asset
```

or another explicitly configured test asset.

---

# 28. Stellar Treasury

Create/configure a Testnet treasury account.

Environment variables:

```text
STELLAR_NETWORK=testnet
STELLAR_TREASURY_PUBLIC_KEY=
STELLAR_TREASURY_SECRET_KEY=
```

Never return the secret key through the API.

Never commit it.

---

# 29. Stellar Payment Flow

```text
Payout Authorized
       ↓
Funding Confirmed
       ↓
Build Stellar transaction
       ↓
Sign
       ↓
Submit
       ↓
Confirm
       ↓
Transaction Hash
       ↓
Database
```

Store:

```text
stellarTransactionHash
amount
asset
beneficiary reference
timestamp
status
```

---

# 30. Blockchain Data Privacy

Do NOT put:

* name
* phone number
* medical documents
* FIR details
* bank credentials
* identity documents

on-chain.

Instead:

```text
Sensitive data
      ↓
Off-chain DB
      ↓
Hash / reference
      ↓
Stellar
```

On-chain information should be limited to:

```text
policy reference
claim reference
event type
amount
attestation hash
beneficiary reference/hash
timestamp
transaction status
```

---

# 31. Disaster Engine

Instead of weather APIs, create:

```http
POST /api/disasters/simulate
```

Request:

```json
{
  "type": "FLOOD",
  "location": "Village-A",
  "measurement": 412,
  "threshold": 350,
  "secondaryConfirmation": true
}
```

Evaluation:

```text
measurement > threshold
AND
secondaryConfirmation = true
```

If true:

```text
DISASTER VERIFIED
```

---

# 32. Parametric Payout

Once a disaster is verified:

```text
1. Create DisasterEvent.
2. Generate attestation.
3. Find active eligible policies.
4. Determine payout.
5. Create payout records.
6. Fund payouts.
7. Execute Stellar transactions.
8. Save transaction hashes.
9. Record audit events.
10. Send notifications.
```

The same disaster must never pay the same policy twice.

---

# 33. Demo Accident Endpoint

Create:

```http
POST /api/demo/accident
```

This endpoint must execute:

```text
1. Find demo user.
2. Find active demo policy.
3. Create accident claim.
4. Run Hospital adapter.
5. Run Police adapter.
6. Run Civil Registry adapter.
7. Evaluate 2-of-3.
8. Generate oracle attestation.
9. Authorize advance.
10. Fund advance.
11. Execute Stellar payment.
12. Save transaction hash.
13. Complete full verification.
14. Approve claim.
15. Fund final payout.
16. Execute Stellar payment.
17. Save final transaction hash.
18. Write audit trail.
19. Return complete result.
```

Expected result:

```json
{
  "claimId": "CLM-001",
  "status": "FINAL_PAID",
  "verification": {
    "hospital": true,
    "police": true,
    "civilRegistry": false
  },
  "advance": {
    "amount": 10000,
    "status": "CONFIRMED",
    "stellarTransactionHash": "..."
  },
  "finalPayout": {
    "amount": 90000,
    "status": "CONFIRMED",
    "stellarTransactionHash": "..."
  }
}
```

---

# 34. Demo Flood Endpoint

Create:

```http
POST /api/demo/flood
```

Use deterministic data:

```text
Measurement = 412
Threshold = 350
Secondary confirmation = true
```

Execute:

```text
disaster verification
      ↓
oracle attestation
      ↓
find eligible policies
      ↓
create payouts
      ↓
fund
      ↓
Stellar settlement
      ↓
audit
```

Expected response:

```json
{
  "eventId": "DIS-001",
  "type": "FLOOD",
  "measurement": 412,
  "threshold": 350,
  "verified": true,
  "policiesAffected": 10,
  "payoutsExecuted": 10,
  "transactions": []
}
```

---

# 35. Dashboard APIs

Implement:

```http
GET /api/dashboard/stats
GET /api/dashboard/claims
GET /api/dashboard/payouts
GET /api/dashboard/disasters
GET /api/dashboard/transactions
GET /api/dashboard/treasury
```

Stats:

```text
active policies
total coverage
claims
verified claims
pending claims
total payouts
total payout value
disaster events
available treasury
pending funding
```

---

# 36. Notifications

Create:

```typescript
interface NotificationProvider {
  send(input): Promise<void>;
}
```

Implement:

```text
MockSMSProvider
MockWhatsAppProvider
```

Example:

```text
SurakshChain

Your emergency insurance payout of ₹10,000
has been successfully initiated.

Claim: SC-10291
```

Do not waste time integrating real WhatsApp/SMS unless already available.

---

# 37. Authentication

Use simple JWT authentication.

Roles:

```text
USER
ORACLE
INSURER
ADMIN
```

Permissions:

```text
USER
→ own policies
→ own claims

ORACLE
→ verification
→ attestations

INSURER
→ adjudication
→ final approval

ADMIN
→ dashboard
→ system operations
```

---

# 38. Security Requirements

Implement:

* Zod/request validation
* JWT
* RBAC
* environment-based secrets
* centralized error handling
* audit logging
* no private key logging
* no secrets committed
* idempotent payout operations
* Stellar transaction verification
* cryptographic hashes for sensitive references

---

# 39. Error Codes

Use:

```text
USER_NOT_FOUND
POLICY_NOT_FOUND
POLICY_NOT_ACTIVE
CLAIM_NOT_FOUND
CLAIM_ALREADY_PAID
INSUFFICIENT_VERIFICATION
INVALID_ATTESTATION
PAYOUT_ALREADY_EXECUTED
FUNDING_FAILED
FUNDING_PENDING
STELLAR_TRANSACTION_FAILED
INSUFFICIENT_TREASURY
INVALID_DISASTER_EVENT
```

Response format:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_VERIFICATION",
    "message": "Claim has only 1 verified source; 2 are required."
  }
}
```

---

# 40. Seed Data

Create deterministic demo fixtures.

At minimum:

```text
10–50 users
10–50 policies
nominees
active policies
accident claim fixture
death claim fixture
flood-ready policies
```

Use obvious demo IDs:

```text
DEMO-USER-001
DEMO-POLICY-001
DEMO-ACCIDENT-001
DEMO-DEATH-001
DEMO-FLOOD-001
```

Provide:

```bash
npm run seed
```

and, if useful:

```bash
npm run reset-demo
```

---

# 41. Test Scenarios

Prioritize integration tests.

## Test 1 — Policy

```text
User
→ Nominee
→ Policy
→ Activation
```

## Test 2 — Accident

```text
Claim
→ 2/3 verification
→ Attestation
→ Advance
→ Funding
→ Stellar
→ Final payout
```

## Test 3 — Insufficient Verification

```text
1/3 verification
→ no advance
→ claim remains pending/rejected
```

## Test 4 — Death

```text
2/3
→ 20% advance
→ final payout
→ nominee receives payout
```

## Test 5 — Flood

```text
measurement < threshold
→ no trigger
```

## Test 6 — Flood Trigger

```text
measurement > threshold
+
secondary confirmation
→ payout
```

## Test 7 — Double Payout

```text
execute payout twice
→ only one successful payment
```

## Test 8 — Invalid Attestation

```text
invalid signature
→ payout rejected
```

## Test 9 — Insufficient Treasury

```text
balance < payout
→ funding flow invoked
```

---

# 42. Health Endpoints

```http
GET /health
GET /ready
```

Return:

```json
{
  "status": "ok",
  "database": "connected",
  "stellar": "connected",
  "fundingProvider": "connected"
}
```

Do not make `/health` fail merely because an optional external integration is unavailable in mock mode.

---

# 43. Environment

Create:

```text
DATABASE_URL=

PORT=3000

JWT_SECRET=

STELLAR_NETWORK=testnet
STELLAR_RPC_URL=
STELLAR_HORIZON_URL=

STELLAR_TREASURY_PUBLIC_KEY=
STELLAR_TREASURY_SECRET_KEY=

ORACLE_PRIVATE_KEY=
ORACLE_PUBLIC_KEY=

FUNDING_PROVIDER=mock

PREVI_API_URL=
PREVI_API_KEY=
PREVI_API_SECRET=

MOCK_MODE=true
```

Never commit `.env`.

Commit only:

```text
.env.example
```

---

# 44. Ten-Hour Schedule

## Hour 0–1

### Audit

Inspect:

```text
existing backend
existing DB
existing APIs
existing Stellar integration
existing Soroban contracts
existing frontend assumptions
existing environment
```

Do not duplicate existing functionality.

Then establish:

```text
server
config
database connection
health endpoint
```

---

# Hour 1–2

### Database

Implement:

```text
User
Nominee
Policy
Claim
Verification
DisasterEvent
Treasury
FundingTransaction
Payout
AuditLog
```

Run migration.

Seed demo data.

---

# Hour 2–3

### Policy + Claims

Implement:

```text
user
nominee
policy
activation
claim
claim state machine
```

Milestone:

```text
User
 ↓
Policy
 ↓
Claim
```

---

# Hour 3–4

### Oracle

Implement:

```text
HospitalAdapter
PoliceAdapter
CivilRegistryAdapter
VerificationEngine
AttestationService
```

Milestone:

```text
2/3 verification
+
signed attestation
```

---

# Hour 4–5

### Funding Layer

Implement:

```text
FundingProvider
MockFundingProvider
FundingService
```

Then integrate Previ **only if its actual API credentials/documentation are available**.

Milestone:

```text
Payout
 ↓
Funding
 ↓
Funded
```

---

# Hour 5–7

### Stellar

Priority:

```text
Treasury
 ↓
Build transaction
 ↓
Sign
 ↓
Submit
 ↓
Confirm
 ↓
TX hash
```

Milestone:

**ONE REAL STELLAR TESTNET PAYMENT MUST WORK.**

Do not proceed to polishing until this works.

---

# Hour 7–8

### Accident Payout

Implement:

```text
verification
→ attestation
→ 10% advance
→ funding
→ Stellar
→ 90% final payout
→ Stellar
```

Milestone:

```text
POST /api/demo/accident
```

works end-to-end.

---

# Hour 8–9

### Disaster

Implement:

```text
simulated event
→ threshold evaluation
→ attestation
→ affected policies
→ funding
→ Stellar payouts
```

Milestone:

```text
POST /api/demo/flood
```

works end-to-end.

---

# Hour 9–10

### Hardening

Only fix:

```text
bugs
transaction failures
duplicate payouts
database issues
demo seed issues
API errors
logging
dashboard endpoints
documentation
```

Do NOT introduce major new features.

---

# 45. Priority Levels

## P0 — Absolutely Required

```text
PostgreSQL
Policy
Claim
2-of-3 verification
Oracle attestation
Funding abstraction
Stellar Testnet transaction
Accident advance
Final payout
Flood simulation
Demo endpoints
Audit trail
```

## P1 — Important

```text
Previ integration
Dashboard
JWT/RBAC
Notifications
Swagger
```

## P2 — Optional

```text
Advanced analytics
real WhatsApp
real IVR
real government APIs
real weather APIs
production UPI
advanced fraud detection
```

If time runs out, **P0 wins over everything else.**

---

# 46. Critical Financial Invariants

These must never be violated.

### No double payout

```text
One payout
→ maximum one successful Stellar settlement
```

### No overpayment

```text
advance + final <= coverage
```

### No payout without authorization

```text
valid policy
+
valid claim
+
valid oracle attestation
+
appropriate approval
```

### No invalid attestation

Invalid oracle signatures must prevent payout.

### No direct frontend authorization

The frontend must never be able to directly execute an insurance payout.

---

# 47. Production Boundary

Document clearly:

```text
PROTOTYPE

Registry APIs
→ Mock adapters

Weather/disaster feeds
→ Deterministic simulator

Funding
→ Previ adapter when available
→ Mock provider otherwise

Settlement
→ Stellar Testnet
```

Production:

```text
Authorized registry APIs
Authorized environmental data
Licensed insurer
Production funding provider
Production Stellar infrastructure
```

Do not represent mocked integrations as real government integrations.

---

# 48. Git Commit Plan

Use meaningful commits:

```text
feat(backend): establish backend foundation

feat(db): implement insurance domain schema

feat(policy): implement policy and nominee lifecycle

feat(claims): implement claim lifecycle

feat(oracle): implement multi-source verification

feat(oracle): implement signed attestations

feat(funding): add funding provider abstraction

feat(funding): integrate previ funding provider

feat(stellar): implement testnet settlement

feat(payout): implement emergency and final payouts

feat(disaster): implement deterministic disaster engine

feat(demo): add end-to-end accident and flood flows

test(backend): add critical insurance integration tests

docs(backend): document architecture and integrations
```

Skip the Previ-specific commit if the actual integration cannot be safely implemented from available documentation.

---

# 49. Final Demo

The backend must support two polished stories.

## Story A — Accident

```text
WORKER
  ↓
Accident reported
  ↓
Hospital ✓
Police ✓
Civil Registry ✗
  ↓
2/3 VERIFIED
  ↓
ORACLE ATTESTATION
  ↓
10% EMERGENCY ADVANCE
  ↓
FUNDING
  ↓
STELLAR
  ↓
₹10,000 SETTLED
  ↓
FULL APPROVAL
  ↓
₹90,000
  ↓
FUNDING
  ↓
STELLAR
  ↓
₹90,000 SETTLED
```

The dashboard should show both real transaction hashes.

---

# 50. Story B — Parametric Disaster

```text
DISASTER EVENT
  ↓
412mm measurement
  ↓
350mm threshold
  ↓
Independent confirmation
  ↓
ORACLE VERIFIED
  ↓
AFFECTED POLICIES
  ↓
PAYOUT AUTHORIZATION
  ↓
FUNDING
  ↓
STELLAR
  ↓
BENEFICIARIES
```

No manual claim is required.

---

# 51. Final Backend Architecture

The finished system should represent:

```text
                         SURAKSHCHAIN
                              │
                              ▼
                         REST API
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
       POLICY              CLAIMS             DISASTER
       SERVICE             SERVICE              ENGINE
                              │                   │
                              ▼                   ▼
                           ORACLE              EVENT
                           ENGINE              VERIFIER
                              │                   │
                    ┌─────────┼─────────┐         │
                    ▼         ▼         ▼         │
                 Hospital   Police    Civil       │
                    │         │         │         │
                    └─────────┼─────────┘         │
                              ▼                   │
                        2-of-3 VERIFIED           │
                              │                   │
                              └─────────┬─────────┘
                                        ▼
                                  ATTESTATION
                                        │
                                        ▼
                                  PAYOUT SERVICE
                                        │
                                        ▼
                                  FUNDING SERVICE
                                        │
                            ┌───────────┴───────────┐
                            ▼                       ▼
                         PREVI                  MOCK FUNDING
                            │
                            └───────────┬───────────┘
                                        ▼
                                     STELLAR
                                        │
                                        ▼
                                    TREASURY
                                        │
                                        ▼
                                  BENEFICIARY
                                        │
                                        ▼
                                  AUDIT TRAIL
```

---

# 52. Final Success Condition

At the end of this implementation sprint, the backend must prove:

> **A verified real-world event can be converted into an authorized insurance payout, funded through the configured funding layer, settled through Stellar, and recorded as an auditable transaction without exposing sensitive user data on-chain.**

The most important technical path is:

```text
EVENT
 ↓
VERIFICATION
 ↓
ATTESTATION
 ↓
AUTHORIZATION
 ↓
FUNDING
 ↓
STELLAR
 ↓
PAYOUT
 ↓
AUDIT
```

Everything else is secondary.

---

# 53. Claude Execution Instructions

Claude MUST:

1. **Audit the existing repository before writing code.**
2. Reuse existing implementations wherever possible.
3. Never invent undocumented Previ APIs.
4. Keep Previ behind a provider interface.
5. Keep mock providers available for development.
6. Never claim a mocked government integration is real.
7. Never put sensitive personal information on-chain.
8. Never hardcode secrets.
9. Never allow duplicate payouts.
10. Never report a Stellar transaction as successful unless it actually succeeded.
11. Run typecheck/tests after each implementation phase.
12. Keep the application runnable after every phase.
13. Prioritize P0 features over architecture polish.
14. Do not introduce unnecessary microservices.
15. Do not spend time on weather APIs during this sprint.
16. Do not create a new token.
17. Do not build production insurance underwriting.
18. Do not make SurakshChain itself the risk-bearing insurer.

### Required final commands

Before completion, run the equivalent of:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

Then execute:

```bash
npm run seed
```

and verify:

```bash
POST /api/demo/accident
POST /api/demo/flood
```

from a clean environment.

The final README must explain:

* architecture
* local setup
* environment variables
* Stellar Testnet setup
* funding provider configuration
* mock integrations
* demo commands
* API endpoints
* claim lifecycle
* payout lifecycle
* security assumptions
* prototype vs production boundaries
