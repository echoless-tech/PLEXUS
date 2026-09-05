# PLEXUS

> **Progressive payment agreements for SMEs — get paid as the work progresses, not months after it's done.**

An SME wins a R40,000 job. Traditionally it completes the whole job, issues one invoice, and waits 30–90 days while it carries every cost. PLEXUS lets the SME and the buyer agree **before work starts** on a phased schedule tied to milestones — for example R12,000 on commitment, R12,000 on progress, R12,000 on delivery and R4,000 at close-out — and releases each stage as the buyer approves evidence of progress.

**PLEXUS does not lend money and never holds funds.** Banks and PayShap move the money. PLEXUS structures *when and why* it moves, verifies both parties, locks the agreed terms, and keeps a tamper-proof audit trail.

---

## What it does

| Step | Who | What happens |
|---|---|---|
| 1 · Verify | Both | Submit a business verification summary (last-4 digits only). Counterparties see each other's status. |
| 2 · Create the deal | SME | Value, scope, delivery date, payment details, dispute rules. |
| 3 · Agree stages | SME | Configurable milestones (templates: 30/30/30/10, 50/50, 40/40/20 — or custom). Must total 100%. |
| 4 · Propose | SME | Digitally accepts the terms → **terms freeze**. |
| 5 · Accept | Buyer | Reviews frozen terms, digitally accepts → **terms lock** (server-timestamped). |
| 6 · Evidence | SME | Uploads proof for a stage (buyer acknowledgement, delivery note, job card, photo, document). |
| 7 · Approve & pay | Buyer | Approves → payment request with a unique reference. Pays via bank/PayShap and records the reference. |
| 8 · Repeat / dispute | Both | Continue to close-out. Either party can dispute; payment for that stage pauses until resolved. |
| 9 · Record | Both | Every action is an append-only, server-timestamped audit event. |

---

## Security model (in one screen)

The client is untrusted. Everything below is enforced by **Firestore Security Rules** on the server:

- Participants only. Invited buyers see a proposal only once it is `proposed`; drafts are private to the SME.
- Creating or accepting an agreement requires **submitted verification**. `verified` can only be set server-side.
- Only the SME edits terms, only while `draft`. `proposed` terms are frozen. `active` terms are **immutable**.
- Milestones are individual documents with a **role-gated state machine**: SME → evidence; Buyer → approve / return / pay; either → dispute; buyer-only → approve a disputed stage for payment.
- Every timestamp that matters must equal `request.time`. Audit events are create-only. Agreements are cancelled, never deleted.
- Only the last four digits of ID and bank numbers can be stored. Every field has a hard size cap.

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
  App.tsx                      Routes behind the auth gate (no public surface)
  types/index.ts               Contract / Milestone / Event / Verification model + LIMITS
  services/
    firebase.ts                Firebase init (offline-first cache)
    auth.ts                    Email/password, 8+ char passwords, email verification
    profile.ts                 Public profile + private verification summary
    contracts.ts               Every mutation = one atomic batch (state + audit event)
  stores/appStore.ts           Auth, identity, contracts, nav, theme, toasts
  pages/
    Dashboard.tsx              "Needs your action" + money position
    Contracts.tsx              Agreement list (all / mine / invited / closed)
    NewContract.tsx            3-step wizard: deal → stages → review & accept
    ContractDetail.tsx         Live agreement: stages, evidence, approvals, payment
                               requests, disputes, audit trail, buyer acceptance
    Verification.tsx           Business verification (last-4 digits only)
    Settings.tsx / Login.tsx
  components/                  Layout shell, badges, status pills, UI primitives
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

### Try the full flow with two accounts

Two demo accounts already exist on the shared project, with a live agreement between them:

| Role | Business | Email | Password |
|---|---|---|---|
| SME (supplier) | Ubuntu Textiles | `demo@plexus.co.za` | `demo1234` |
| Buyer | Example Retail (Pty) Ltd | `buyer.plexus.test@example.com` | `buyerpass123` |

Or run it from scratch:

1. Sign up as the **SME**, complete *Verification*, create an agreement, enter the buyer's email, **Accept & send**.
2. Sign up as the **Buyer** using that exact email, complete *Verification*, open the agreement, **Accept**.
3. As the SME: **Submit evidence** on stage 1. As the Buyer: **Approve stage**, then **I have paid — record reference**.
4. Watch the audit trail and the "Paid so far" bar update live.

---

## Deployment — GitHub Pages

Every push to `main` runs [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml), which builds the app with `VITE_BASE_PATH=/PLEXUS/` and publishes it to GitHub Pages.

**Live now:** https://lordgeeone.github.io/PLEXUS/ (repo `LordGeeOne/PLEXUS`). Once the repo is transferred to `echoless-tech`, the URL becomes `https://echoless-tech.github.io/PLEXUS/` with no code changes — the base path is the repo name, not the owner.

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

- Cloud Functions: server-side check that stage amounts sum to the total; set `verified` from the KYC-partner webhook.
- Optional escrow-style safeguarded holding via a regulated banking/payment partner (never PLEXUS' own account).
- App Check, MFA above a value threshold, Cloud Storage for evidence with scanning.
- Enterprise buyer plan: supplier onboarding, bulk milestone management, exports.
