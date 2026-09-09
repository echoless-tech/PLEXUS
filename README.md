# PLEXUS

> **Progressive payment agreements for SMEs — get paid as the work progresses, not months after it's done.**

An SME wins a R40,000 job. Traditionally it completes the whole job, issues one invoice, and waits 30–90 days while it carries every cost. PLEXUS lets the SME and the buyer agree **before work starts** on a phased schedule tied to milestones — for example R12,000 on commitment, R12,000 on progress, R12,000 on delivery and R4,000 at close-out — and releases each stage as the buyer approves evidence of progress.

**PLEXUS does not lend money and never holds funds.** Banks and PayShap move the money. PLEXUS structures *when and why* it moves, verifies both parties, locks the agreed terms, and keeps a tamper-proof audit trail.

Two kinds of account use it:

- **Businesses** (SMEs and their buyers) — create and run progressive payment agreements, keep records of how the business performs (**Run**), find other businesses to work with (**Connect**) and see their own buyer-confirmed rating and history (**Analytics**). An SME switches **Look for funding** on once, from the Dashboard, to let verified funders browse its live agreements.
- **Funders** — browse every business with logo, verification status and rating; filter to those looking for funding; open an SME's page and **choose which payment plans to fund**. Each choice is an offer the SME accepts or declines; funded plans are followed **read-only**, stage by stage, as the buyer approves and pays. Funders never see bank details and cannot act on an agreement. Nothing is ever funded automatically — a business creating new agreements only makes them *available*.

Both account types must submit verification before they can operate. The account type is chosen once at sign-up (or first login) and is write-once on the server.

---

## What it does

| Step | Who | What happens |
|---|---|---|
| 0 · Choose | Both | Business or Funder. Fixed after choice. |
| 1 · Verify | Both | Submit a verification summary (last-4 digits only; funders add an FSP/NCR licence number). Everyone sees everyone's status. |
| 2 · Create the deal | SME | Value, scope, delivery date, payment details (private to the parties), dispute rules. |
| 3 · Agree stages | SME | Configurable milestones (templates: 30/30/30/10, 50/50, 40/40/20 — or custom). Must total 100%. |
| 4 · Propose | SME | Digitally accepts the terms → **terms freeze**. If the business is looking for funding, the plan becomes visible to verified funders. |
| 5 · Accept | Buyer | Reviews frozen terms, digitally accepts → **terms lock** (server-timestamped). |
| 6 · Evidence | SME | Uploads proof for a stage (buyer acknowledgement, delivery note, job card, photo, document). |
| 7 · Approve & pay | Buyer | Approves → payment request with a unique reference. Pays via bank/PayShap and records the reference. |
| 8 · Repeat / dispute | Both | Continue to close-out. Either party can dispute; payment for that stage pauses until resolved. |
| 9 · Record | Both | Every action is an append-only, server-timestamped audit event — funders watch the same trail. |
| 10 · Fund | Funder → SME | Funder selects specific plans of a business that is looking for funding → `fundings/{planId}_{funderUid}` offer. SME accepts or declines; funder may withdraw an open offer. One funder per plan. |
| ∞ · Run / Analytics | Business | Scan invoices, receipts and bank statements (queued for AI review, coming later). Rating = 40% stages paid · 25% completed vs cancelled · 20% approved first time · 15% dispute-free. |

---

## Security model (in one screen)

The client is untrusted. Everything below is enforced by **Firestore Security Rules** on the server:

- Participants only. Invited buyers see a proposal only once it is `proposed`; drafts are private to the SME.
- **Funders** are read-only observers of agreements: they can read one only if the SME's profile says **looking for funding** (`profiles/{uid}.seekingFunding`) *and* it is proposed/active/completed *and* the funder has submitted verification. They can never read `contracts/{id}/private/payment` (settlement details) and every write they attempt on an agreement is denied.
- **Funding is opt-in on both sides, per plan.** A funder's only write is a `fundings/{contractId}_{funderUid}` document: the id must encode both parties, `funderName` must match the caller's own profile, the plan must be live and belong to a business that is looking for funding, and the record is born `offered` with server timestamps. The SME may flip it to `accepted`/`declined`; the funder may `withdraw` (and re-offer later); nothing else may change and nothing may be deleted.
- `accountType` is write-once (`null → business|funder`, never changed). Only businesses can create agreements or Run documents; only businesses may set `seekingFunding`.
- Creating or accepting an agreement requires **submitted verification**. `verified` can only be set server-side, as can the rating snapshot (`ratingScore`/`ratingCount`).
- Only the SME edits terms, only while `draft`. `proposed` terms are frozen. `active` terms are **immutable**.
- Milestones are individual documents with a **role-gated state machine**: SME → evidence; Buyer → approve / return / pay; either → dispute; buyer-only → approve a disputed stage for payment.
- **Audit events cannot be forged.** Each event type is accepted only alongside the exact state transition it describes (checked against pre- and post-batch state) and only with the caller's real role.
- Every timestamp that matters must equal `request.time`. Audit events are create-only. Agreements are cancelled, never deleted. Run documents can be added and deleted but never edited, and always enter `pending_review`.
- Only the last four digits of ID and bank numbers can be stored. Every field has a hard size cap (logos ≤ 200 KB, documents ≤ 700 KB, inline).
- Ratings are derived purely from buyer-confirmed milestone and agreement states, so an SME cannot inflate its own score.

Full detail and the regulatory map: **[PLEXUS_TRUST_AND_COMPLIANCE.md](../PLEXUS_TRUST_AND_COMPLIANCE.md)**. Risk register, threat model, secure-coding standard, test suite and release gates: **[PLEXUS_SSDLC.md](../PLEXUS_SSDLC.md)**.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4, Zustand |
| Backend | Firebase Auth (email/password) + Cloud Firestore (`africa-south1`, Standard edition) |
| Security | Firestore Security Rules (default-deny, state-machine enforced), atomic batched writes |
| Runtime deps | 9 packages · `npm audit` 0 vulnerabilities |

No custom server. No AI proxy. No public collections.

---

## Project structure

```
src/
  App.tsx                      Routes behind the auth gate, branched by account type
  types/index.ts               Contract / Milestone / Event / Verification / Profile /
                               Document / Rating model + LIMITS
  services/
    firebase.ts                Firebase init (offline-first cache)
    auth.ts                    Email/password, 8+ char passwords, email verification
    profile.ts                 Public profile (+ logo, industry, location), account type,
                               private verification summary, Run documents, directory
    contracts.ts               Every mutation = one atomic batch (state + audit event);
                               private/payment sub-doc; per-business funder queries
    funding.ts                 Per-plan funding offers: offer / withdraw / accept / decline
  lib/rating.ts                Rating derived from rule-enforced agreement data
  lib/analytics.ts             Deterministic 12-month business history for the charts
  lib/files.ts                 Client-side image downscaling for logos / scans
  hooks/useMilestonesFor.ts    Milestones for a set of agreements (funder views)
  stores/appStore.ts           Auth, identity, per-account-type data, fundings, nav, theme, toasts
  pages/
    ChooseAccountType.tsx      One-time Business / Funder choice
    Dashboard.tsx              Business: "Needs your action" (incl. funding offers), Look-for-funding switch
    Run.tsx                    Scan / upload invoices, receipts, bank statements (pending AI review)
    Connect.tsx                Directory of businesses to work with
    Analytics.tsx              Own rating, history charts, performance metrics, per-agreement breakdown
    Contracts.tsx              Agreement list (all / mine / invited / closed)
    NewContract.tsx            3-step wizard: deal → stages → review & accept
    ContractDetail.tsx         Live agreement: stages, evidence, approvals, payment
                               requests, disputes, audit trail, funding panel; read-only for funders
    FunderDashboard.tsx        Funder: SME list with logos, ratings, "looking for funding" / "funding" tabs
    FunderSmeDetail.tsx        Funder: SME profile, statistics, choose which plans to fund
    FunderOpportunities.tsx    Funder: portfolio — funding / offers sent / available / closed
    Verification.tsx           Business / funder verification (last-4 digits only)
    Settings.tsx / Login.tsx   Profile (logo, industry, about), appearance; sign-up with type
  components/                  Layout shell, badges, avatars, rating stars, UI primitives
firestore.rules                The security boundary — read this first
```

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

The app points at the shared Firebase project. To use your own:

1. Create a Firebase project with Email/Password auth and a Firestore database.
2. Replace the config in `src/services/firebase.ts`.
3. Deploy the rules — the app will not work without them:
   ```bash
   npx firebase-tools deploy --only firestore:rules --project <your-project>
   ```

### Try the full flow with three accounts

Three demo accounts already exist on the shared project; Ubuntu Textiles is looking for funding and has a live agreement:

| Role | Business | Email | Password |
|---|---|---|---|
| SME (supplier) | Ubuntu Textiles | `demo@plexus.co.za` | `demo1234` |
| Buyer (also a business account) | Example Retail (Pty) Ltd | `buyer.plexus.test@example.com` | `buyerpass123` |
| Funder | Vuka Capital | `funder.plexus.test@example.com` | `funderpass123` |

While signed in as any of these, a **Switch to Funder / Business demo** button appears in the header (with a menu for the third account) so you can hop between the two sides of a deal without retyping credentials. It renders only for these demo accounts and can only sign into another one of them ([src/lib/demo.ts](src/lib/demo.ts)).

Or run it from scratch:

1. Sign up as the **SME** (choose *I run a business*), complete *Verification*, switch on **Look for funding** on the Dashboard, create an agreement, enter the buyer's email, **Accept & send**.
2. Sign up as the **Buyer** (also a business) using that exact email, complete *Verification*, open the agreement, **Accept**.
3. As the SME: **Submit evidence** on stage 1. As the Buyer: **Approve stage**, then **I have paid — record reference**.
4. Sign up as a **Funder** (choose *I am a funder*), complete *Verification*. The SME appears under *Looking for funding* with a rating; open it, tick the plan and **Fund selected plans**. Back as the SME, **Accept** the offer from the Dashboard. The funder's *Payment plans → Funding* now shows it — read-only, bank details hidden, audit trail live. Create a second agreement as the SME: it shows for the funder under *Available*, not *Funding*.
5. As the SME, scan a document under **Run** and check **Analytics**.

---

## Deployment — GitHub Pages

Every push to `main` runs [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml), which builds the app with `VITE_BASE_PATH=/PLEXUS/` and publishes the output to the `master` branch. GitHub Pages serves `master` (Settings → Pages → Deploy from a branch → `master` / root). `main` is the source of truth; `master` holds only build output.

**Live now:** https://echoless-tech.github.io/PLEXUS/ (repo `echoless-tech/PLEXUS`). The base path is the repo name, not the owner, so a transfer needs no code changes.

Deep links survive a refresh via `public/404.html`, which bounces unknown paths back to `index.html` with the route preserved.

Two one-time steps outside this repo:

1. **Create the GitHub repo** `echoless-tech/PLEXUS` (empty, no README) and push:
   ```bash
   git push -u origin main
   ```
2. **Authorise the domain in Firebase** — Firebase Console → Authentication → Settings → *Authorized domains* → add `echoless-tech.github.io`. Without this, sign-in on the live site is rejected.

To deploy elsewhere (custom domain, Firebase Hosting), set `VITE_BASE_PATH` to `/` (or leave it unset) and change `segments` in `public/404.html` to `0`.

---

## Roadmap (see the compliance doc §3.5)

- AI review of Run documents (invoices, receipts, statements) cross-checked against agreements; results land in the reserved `analysisStatus` / `analysisNote` fields, which only the server may write.
- Cloud Functions: server-side check that stage amounts sum to the total; set `verified` from the KYC-partner webhook.
- Funder → SME funding offers with an NCR-registered partner (PLEXUS itself never extends credit).
- Optional escrow-style safeguarded holding via a regulated banking/payment partner (never PLEXUS' own account).
- App Check, MFA above a value threshold, Cloud Storage for evidence with scanning.
- Enterprise buyer plan: supplier onboarding, bulk milestone management, exports.
