# PLEXUS — Trust, Security & Regulatory Compliance

> What has to be true — in documents, in procedure and in code — for **funders/buyers** and **SMMEs** to trust PLEXUS with their payment agreements.

PLEXUS structures *when and why* money moves between an SMME and the party paying it. It does **not** lend, hold client funds, or move money itself — the bank / PayShap rail does. That positioning is deliberate: it keeps PLEXUS outside the heaviest licensing regimes while every design choice below still has to earn the trust of two parties who do not know each other.

This document is in three parts:

1. **Regulatory documents & registrations** — what PLEXUS the company must have.
2. **Trust procedures** — what PLEXUS must *do*, repeatably, for every participant and agreement.
3. **Security controls** — how the product enforces the above, and what is already implemented in this codebase.

> **Important:** this is an engineering-led compliance map, not legal advice. Each item should be confirmed with a South African fintech attorney and a registered compliance officer before launch.

---

## Part 1 — Regulatory documents & registrations

### 1.1 Company & tax standing (baseline credibility)

| Item | Authority | Why funders/SMMEs care |
|---|---|---|
| Company registration certificate (CoR14.3) & MOI | CIPC | Proves PLEXUS is a real legal person that can be sued and held to its terms. |
| Tax clearance / Tax Compliance Status PIN | SARS | Standard due-diligence ask from any corporate buyer or funder onboarding a vendor. |
| B-BBEE affidavit or certificate | DTIC / SANAS-accredited agency | Corporate and public-sector buyers must report on it; it also unlocks supplier-development spend that flows *through* PLEXUS agreements. |
| Beneficial ownership register filed | CIPC (GLAA amendments, 2023) | Required for all companies; funders check it during KYB. |

### 1.2 Data protection — POPIA

PLEXUS processes personal information of business owners (names, contact details, partial ID/bank numbers) and is therefore a **Responsible Party** under the Protection of Personal Information Act.

Required documents:

- **Information Officer registration** with the Information Regulator (the CEO by default; a deputy may be designated).
- **Privacy Policy / Privacy Notice** covering lawful basis, purpose limitation, retention, cross-border transfer (Firebase region is `africa-south1`, which helps) and data-subject rights.
- **PAIA Manual** (Promotion of Access to Information Act) — mandatory for private bodies, published on the website.
- **Operator agreements** with processors: Google Cloud/Firebase (DPA), the KYC partner, and any email/SMS provider.
- **Data breach response procedure** and Regulator notification template (section 22).
- **Records of processing** and a retention schedule (see §2.6).

Design decisions already taken for POPIA minimisation: only the **last four digits** of ID and bank account numbers are stored; full documents go to the KYC partner and never enter PLEXUS' database. Firestore rules physically reject any verification document that carries more than four digits in those fields.

### 1.3 Anti-money-laundering — FICA

PLEXUS is **not** itself an Accountable Institution under Schedule 1 of FICA if it never holds or transmits funds. However:

- Buyers and funders **are** frequently Accountable Institutions (banks, asset managers, payment providers) and will require PLEXUS to demonstrate **Know Your Business (KYB)** on every SMME before they transact through it.
- The moment PLEXUS adds the optional **escrow / safeguarded holding** feature (concept doc §6), the *partner* holding the funds must be an Accountable Institution, and PLEXUS must contractually support their FICA obligations (identification, verification, record-keeping for 5 years, suspicious-transaction reporting to the FIC).

Required documents:

- **KYB/KYC Procedure** (Risk Management & Compliance Programme-style): what is collected (CIPC number, directors, tax number, proof of bank account), how it is verified (third-party KYC provider against CIPC, DHA and bank-account-verification services), risk tiers, and re-verification cadence.
- **Sanctions & PEP screening policy** (UN, OFAC, EU, local lists) run by the KYC partner.
- **Partner agreement** with a licensed KYC/AML provider (e.g. a CIPC/DHA-connected verification API).
- **Record-retention policy** — FICA requires 5 years after the relationship ends.

### 1.4 Payments & the National Payment System

Because PLEXUS only *records* payments and generates references, it is not a payment system operator. The documents below prevent scope creep from breaking that position:

- **Payments Position Paper** (internal, reviewed by counsel) stating PLEXUS does not accept deposits (Banks Act), does not provide payment services requiring PASA/SARB registration, and does not act as a Third Party Payment Provider (TPPP). Revisit if any feature begins to touch funds.
- **Escrow partner agreement** (future feature): the partner must be a registered bank or a PASA-authorised payment institution operating a **trust/safeguarded account** in the client's favour, with clear release instructions tied to PLEXUS milestone approvals.
- **PayShap / rail integration**: PayShap is accessed via participating banks; PLEXUS surfaces the ShapID and reference — it does not initiate payments. Any future "pay now" button must go through a licensed PSP/bank API and its own onboarding.

### 1.5 Credit boundary — NCA

The National Credit Act applies to anyone providing credit. Progressive payments are **not credit**: the buyer pays for delivered progress; nobody advances funds or charges interest. Keep it that way in documents and UI:

- Never describe stage payments as "advances", "loans" or "financing".
- If a *funder* (third party) ever pays a stage on the buyer's behalf and is repaid later, that funder provides credit and must be an **NCR-registered credit provider** — PLEXUS would need an **NCA boundary memo** and a partner agreement, and must not itself set pricing or bear credit risk without registering.

### 1.6 Contract law, consumer & electronic transactions

The agreement accepted in PLEXUS must be enforceable in a South African court.

- **Platform Terms of Service** (for both roles) and a **Master Progressive Payment Agreement** template that each PLEXUS agreement incorporates by reference — governing law, dispute escalation, cancellation, evidence standards, limitation of liability.
- **ECTA compliance** (Electronic Communications and Transactions Act): digital acceptance is recognised as an electronic signature. PLEXUS strengthens this with (a) authenticated identity, (b) server timestamps, (c) an immutable audit trail, and (d) the accepted terms being locked and retrievable. Section 43 information (company details, pricing, complaints procedure) must be displayed.
- **Consumer Protection Act** applies where a party is a consumer or a small juristic person under the threshold (currently R2 million turnover/asset value). Ensure plain-language terms, cooling-off where relevant, and a complaints channel.
- **Dispute Resolution Policy** — the tiered process the app already encodes (written resolution → pause payment → mediation), naming an ADR provider (e.g. AFSA or a sector ombud where applicable).

### 1.7 Information security assurance

Funders' vendor-risk teams will ask for evidence, not promises.

- **Information Security Policy** set and a **Risk Register**.
- **Independent penetration test** report (annual, and after major releases) — the adversarial test suite in §3.4 is the internal baseline.
- **Business continuity & disaster-recovery plan** (Firestore PITR / scheduled exports, RTO/RPO).
- **Vulnerability disclosure policy** (security.txt).
- Roadmap: **ISO/IEC 27001** certification or **SOC 2 Type II** report once revenue justifies it; these are the documents that unlock enterprise and bank partnerships.

### 1.8 Insurance

- **Professional indemnity** and **cyber-liability** cover. Funders will request certificates.

---

## Part 2 — Trust procedures

These are the repeatable operating procedures that make the documents above real. Each has an owner, a cadence and evidence.

### 2.1 Participant onboarding & verification (KYB)

1. Account created with email + password (≥ 8 chars) and an **account type** — *business* or *funder* — that is write-once on the server. Verification email sent.
2. Participant submits the **verification summary** in-app (legal name, CIPC no., tax no., director / authorised representative name, last-4 ID, last-4 account; funders add their FSP/NCR licence number). Status → `pending`. From this point a business may author or accept agreements and a funder may view listed plans, and every counterparty **sees their status**.
3. KYC partner performs document verification (CIPC lookup, director ID check against DHA, bank-account verification, sanctions/PEP screen; for funders, FSCA/NCR register check).
4. Ops sets status → `verified` **server-side only** (Admin SDK / Cloud Function). No client can ever write `verified` — the Firestore rules refuse it.
5. Re-verification: annually, on change of directors/bank account, or on risk trigger.

### 2.1a Funder access to SME data (data minimisation)

- A business opts in once, at profile level ("Look for funding", `profiles/{uid}.seekingFunding`). Nothing is exposed to funders without that switch, and the business can turn it off at any time; existing accepted fundings remain on record but no further agreements are readable.
- **Funding is a per-plan, two-sided choice.** A verified funder selects specific payment plans; each selection is a `fundings/{contractId}_{funderUid}` record born `offered`. The SME accepts or declines each offer; the funder may withdraw an open offer. A business creating new agreements never changes any funder's position — new plans merely become *available*.
- A verified funder sees: the SME's public profile, the agreement header (title, value, schedule, status), milestone states and evidence, and the audit trail. A funder **never** sees settlement/bank details (`contracts/{id}/private/payment`), the SME's verification summary, or the SME's Run documents — the rules deny these reads outright. Funder queries must be scoped to one business at a time; an unscoped "all agreements" query is unprovable and denied.
- Ratings shown to funders are computed client-side from rule-enforced, buyer-confirmed states only (no self-reported inputs), so they are exactly as trustworthy as the underlying agreement data. The persisted rating snapshot (`ratingScore`/`ratingCount`) is server-written only.
- Any credit a funder extends on the strength of this information is a matter between the funder and the SME; PLEXUS does not price, intermediate or hold funds (see §1.5).

### 2.2 Agreement formation ("agreement before work starts")

1. SME drafts value, scope, delivery date, payment details, dispute rules and a configurable milestone schedule that must total 100%.
2. SME **digitally accepts** → status `proposed`, `smeAcceptedAt` = server time. **Terms freeze** — the SME can only withdraw or cancel; nothing else may be edited.
3. Buyer (matched by invitation email) reviews the *frozen* terms and the SME's verification badge.
4. Buyer **digitally accepts** → status `active`, `lockedAt` = server time. Every core field is now immutable.

Why the freeze matters: it eliminates the race where terms change between what the buyer read and what they accepted.

### 2.3 Milestone evidence & approval

1. SME submits evidence of the agreed type (buyer acknowledgement, delivery confirmation, signed job card, photo, document), optionally with a file (image/PDF ≤ 500 KB).
2. Buyer **approves** (payment request issued with reference `PLX-<contract>-M<n>`), or **returns** with a written reason (evidence retained for the record).
3. Buyer pays through their bank / PayShap using the reference and **records the bank reference** in PLEXUS → stage `paid`.
4. When every stage is paid, the agreement closes out automatically.

### 2.4 Dispute handling

1. Either party may dispute a stage that is awaiting approval or awaiting payment. Payment for that stage pauses.
2. Resolution to "return for rework" may be recorded by either party; resolution to "approved for payment" may only be recorded by the **buyer** (the party committing funds).
3. All dispute reasons and resolutions are server-timestamped in the audit trail — the evidence pack if the matter escalates to mediation.

### 2.5 Audit & evidence retention

- Every event (creation, proposal, acceptance, evidence, approval, rejection, payment, dispute, resolution, cancellation) is an **append-only** record with the actor's UID and a **server** timestamp. Update and delete are impossible for any client.
- Retain agreements and events for **5 years** after completion (FICA-aligned) and make them exportable to both parties on request (POPIA right of access).

### 2.6 Data lifecycle

- Minimise: last-4 digits only; no ID documents in the app database.
- Retain: agreements/events 5 years; verification summaries for the relationship + 5 years; marketing data only with consent.
- Delete: on verified request, anonymise personal fields while keeping the agreement's financial record intact (legal obligation to retain).

### 2.7 Incident response

- Severity matrix, on-call owner, 72-hour Regulator notification assessment (POPIA s22), affected-party notification templates, post-incident review.

### 2.8 Change control for rules

- `firestore.rules` is the security boundary. Any change requires: peer review, the adversarial test suite (§3.4) run green, and deployment via CI — never from a laptop in an emergency without a paired review.

---

## Part 3 — Security controls (what the code enforces today)

### 3.1 Server-enforced state machine (`firestore.rules`)

The client is untrusted. Every invariant below is enforced by Firestore Security Rules, verified live against the deployed database:

| Invariant | Enforcement |
|---|---|
| Only participants can read an agreement; invited buyers only see it once `proposed` | `canReadContract()` — smeUid / buyerUid / (invited email ∧ proposed) |
| Only a participant with **submitted verification** can create or accept | `hasSubmittedVerification()` via `get(profiles/uid)` |
| Only the SME edits terms, and only while `draft` | `smeEditsDraft()` |
| `proposed` terms are frozen (withdraw / cancel only) | `smeWithdraws()`, `smeCancelsBeforeLock()` |
| Only the invited email can accept; acceptance sets `buyerUid = caller`, `lockedAt = server time` | `buyerAccepts()` with `affectedKeys().hasOnly([...])` |
| After lock, no core field or milestone amount/term can change | active-phase `hasOnly` lists never include term fields |
| Milestone workflow is role-gated and ordered (pending → evidence → approved → paid; disputes from evidence/approved only) | one rule function per transition |
| Approving a disputed stage for payment is buyer-only | `participantResolvesDispute()` |
| Every meaningful timestamp equals `request.time` | rules compare to `request.time`; client sends `serverTimestamp()` |
| Audit events: create-only, actor = caller, claimed role = caller's real role, and each event type is accepted **only alongside the exact state transition it describes** (pre/post-batch check) | `eventRoleMatches()`, `contractEventValid()`, `milestoneEventValid()` |
| Clients can never set `verificationStatus = 'verified'` | profile & verification update rules |
| Account type is write-once; only businesses create agreements or Run documents | profile update rule; `accountTypeOf(uid()) == 'business'` |
| Funders read only agreements of a business whose profile says `seekingFunding`, that are proposed/active/completed, and only once their own verification is submitted | `funderCanObserve()` → `smeOpenToFunding()` in `canReadContract()` |
| Settlement details live in a private sub-document readable only by the two parties; writable by the SME only while `draft` | `match /private/payment` |
| `active` agreement headers are immutable; the funding switch lives on the profile and only a business may set it | `validProfileShape()` (`seekingFunding is bool`, funder ⇒ false) |
| A funding record can only be created by a verified funder, for itself (`id == contractId_funderUid`, `funderName` == own profile name), on a live plan of an open business, born `offered` with server timestamps; SME may only `accept`/`decline` an open offer (with server `respondedAt`), funder may only `withdraw` (or re-offer after withdrawing); no deletes; readable only by the two parties | `match /fundings/{fid}` |
| The persisted rating snapshot cannot be written by clients | `ratingUnchanged()` on profile update; rating keys forbidden on create |
| Run documents are owner-only, create/delete but never update, always enter `pending_review` with no analysis note (AI fields reserved for the server) | `profiles/{uid}/documents` rules |
| Only last-4 digits of ID/account can be stored | regex `^[0-9]{4}$` |
| Every string, list and map has a hard size cap | `strLen()`, `optStr()`, `dataUrl.size() <= 700000`, logo `<= 200000` |
| Agreements are never deleted — only cancelled | `allow delete: if false` |
| Legacy collections unreachable; default deny | catch-all `match /{document=**}` |

### 3.2 Authentication

- Firebase Email/Password with an 8-character minimum and verification email on sign-up.
- The previous "Sign in with PayShap" flow (deterministic password derived from a phone number) was **removed** as an account-takeover vulnerability. PayShap is used only as a *payment method* on agreements.
- Sessions: Firebase ID tokens (1-hour) with secure refresh; email verification surfaced in the header.

### 3.3 Client-side hardening

- Input length caps mirror the rules (`LIMITS` in `src/types`), amounts rounded to cents, schedule must sum to 100%.
- Evidence uploads restricted to PNG/JPEG/WebP/PDF, ≤ 500 KB, validated before encoding.
- All writes are **single atomic batches** (state change + audit event) so history cannot drift from state.
- No public read surface remains (the former public storefront collection was removed).
- Dependencies cut from 27 to 9 runtime packages; `npm audit` reports 0 vulnerabilities.

### 3.4 Adversarial verification performed

Run from a signed-in **buyer** session against the live rules, bypassing the UI with raw SDK calls. All were **denied** by the server:

1. Change a locked agreement's total value
2. Reassign the supplier UID to the attacker
3. Shrink a locked milestone amount
4. Jump a milestone straight to `paid` without approval
5. Buyer submits evidence (an SME-only action)
6. Forge an audit event as another actor
7. Back-date an audit event with a client timestamp
8. Delete an audit event
9. Delete an agreement
10. Self-grant `verified` status
11. Read the counterparty's private KYC document
12. Harvest all agreements with an unfiltered query
13. Read the legacy `users` collection

Run from a signed-in **verified funder** session (24 checks, all as expected):

- Allowed: read a listed agreement, its milestones and events; the listing query; SME public profiles.
- Denied: read `private/payment` (bank details); read an unlisted agreement; unfiltered or `smeUid`-filtered contract queries; the SME's verification document; the SME's Run documents; approve or pay a milestone; flip or cancel a listing; append an audit event; create a contract; change own account type; self-grant `verified` on profile or verification; edit the SME's profile; add Run documents to any profile; delete an agreement.

Run from the **SME** session and from a brand-new **unverified funder** (18 checks, all as expected):

- SME denied: approve/pay own milestone; edit a paid amount or the locked total; change account type; self-verify; write a Run document with `analysisStatus = analysed`; edit an existing document; change payment details after lock; forge an audit event with another role or without the matching transition; run the funder listing query.
- Unverified funder denied: read a listed agreement, run the listing query, list milestones (public profiles remain readable so the directory works).

Every legitimate transition was then re-exercised through the UI under the tightened rules — create, edit draft, propose, withdraw, accept, decline, evidence, withdraw evidence, return, approve, dispute, resolve, pay, auto-complete, cancel — and each produced exactly one audit event.

**Per-plan funding model** (42 checks across the three roles, all as expected):

- Funder allowed: per-business live-plan query; own fundings query. Funder denied: plans of a business not looking for funding; the unscoped listed-plans query; a cancelled plan; listing all fundings or another party's fundings; a funding with a wrong id, another funder's uid, a forged `funderName`, status `accepted` on create, a cancelled or non-existent plan, a wrong `smeUid`, client-set `createdAt` or an extra field; accepting or renaming its own offer; deleting a funding; flipping a business's `seekingFunding`; setting `seekingFunding` on a funder profile; writing `ratingScore`.
- SME allowed: fundings on its own agreements. SME denied: listing all fundings or a funder's fundings; creating a funding (as itself or impersonating a funder); withdrawing a funder's offer; accepting without `respondedAt`, with a client `respondedAt`, or while editing another field; self-writing `ratingScore`; a non-boolean `seekingFunding`.
- Buyer denied: reading or accepting a funding on a plan it pays for; funding queries by either party; querying another business's agreements.

The end-to-end flow was also exercised through the UI: business switches on *Look for funding*; funder selects a plan and sends the offer; business sees the offer under *Needs your action* and accepts; a second business agreement appears for the funder as *Available* only.

### 3.5 Recommended next controls (not yet implemented)

- **Cloud Functions** to (a) validate that milestone amounts sum exactly to the total at proposal time and (b) set `verified` from the KYC webhook — closing the two gaps the rules language cannot express.
- Enforce `request.auth.token.email_verified == true` on contract create/accept once the demo phase is over (a one-line rule change).
- App Check to block non-app clients; Firebase Auth MFA for accounts above a value threshold.
- Move evidence files to Cloud Storage with per-agreement rules and virus scanning; keep only a hash + URL in Firestore.
- Firestore point-in-time recovery + daily exports to a locked bucket.

---

### Quick checklist for a funder's due-diligence pack

- [ ] CIPC certificate, MOI, beneficial-ownership filing
- [ ] SARS tax compliance PIN, B-BBEE affidavit
- [ ] POPIA: Information Officer registration, Privacy Notice, PAIA Manual, breach procedure
- [ ] KYB/KYC Procedure + KYC-partner agreement + sanctions policy
- [ ] Payments position paper (no funds held) + escrow-partner term sheet (future)
- [ ] NCA boundary memo
- [ ] Platform Terms of Service + Master Progressive Payment Agreement + Dispute Resolution Policy
- [ ] Information Security Policy, latest pen-test report, BC/DR plan
- [ ] PI & cyber insurance certificates
