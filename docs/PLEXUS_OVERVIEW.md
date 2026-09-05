# PLEXUS — The problem, our solution, and how it fits together

> **A POS system that turns every sale and invoice into verified, fundable proof.**

*One document for the whole team. It combines NODAL (Kwane — the working POS / business OS) and the
Verified Invoice Financing concept (Luyanda — `PLEXUS DOC.docx`). Written for EDHE Student Hack,
Track 1: Access to Finance.*

---

## The 60-second version

An SME runs **PLEXUS as its everyday point of sale** — sales, stock, cash flow, suppliers. When it
invoices a bigger buyer, PLEXUS creates the invoice (or scans a paper one) and an **AI checks it for
errors** before it goes out. The **buyer confirms the invoice inside their own banking app** via
PayShap Request. A **partner funder advances 80–90% of the invoice the same day**, and the buyer
pays the funder on the due date. Every sale, every confirmed invoice and every repayment builds a
**track record and credit score** the SME can take to a bank.

PLEXUS never lends money itself. **We don't lend — we verify trust and route it instantly.**

---

## The big picture

- South Africa's MSMEs face a **R350 billion finance gap**, while contributing roughly **34–40% of
  GDP** and **~60% of employment**. [1][2]
- Only **~5% of formal MSMEs** have access to formal credit — despite **315+ funders** and **600+
  funding products** in the market. [2]
- **72% of informal businesses keep no financial records** [3], and **~80% of township businesses
  are unregistered**. [4]
- **70–80% of SA small businesses fail within five years**; cash-flow and working-capital
  mismanagement is the leading cause. [5]

The capital exists. What's missing is a way for the smallest businesses to **prove they are real,
prove they are owed, and get paid on time**.

---

## Issue → Solution

| # | The issue | How PLEXUS solves it | Whose take |
|---|---|---|---|
| **1** | **Businesses run on paper.** 72% of informal businesses keep no records. [3] No visibility means stock losses, guesswork, and nothing to show a bank or a buyer. | **The POS — the base of everything.** Everyday sales, stock, invoices, cash flow and suppliers in one app. WhatsApp-first, offline-tolerant, voice-operable, priced in Rand. *Live today as NODAL.* Every transaction becomes structured data that every other layer stands on. | Kwane |
| **2** | **Invoices get rejected.** Roughly **25% of supplier invoices** trigger an exception; each one adds **14+ days** and costs **4–5×** more to process. [6] Common causes: missing PO/reference, wrong VAT number, totals that don't add up, duplicates. | **AI invoice verification.** Create the invoice in-app or **scan a physical one**. Before it is submitted, AI checks required fields, totals and VAT, buyer details, PO/reference, and duplicates — and flags anything a bank, government department or buyer would bounce. Fewer rejections, faster payment. | Kwane |
| **3** | **SMEs wait 30–90 days to be paid.** **91% of SA SMEs** are paid late, on average **18 days** past terms; each is owed ~**R99,800** and spends **89.5 hours a year** chasing payment. [7] Government alone owes **R15.5 billion** on invoices older than 30 days. [8] | **Verified invoice funding — no new app.** The buyer receives a **PayShap Request** locked to the specific invoice reference and amount, and approves it in the banking app they already use. An **NCR-registered partner funder** advances **80–90%** of the invoice to the SME's verified ShapID in real time. On the due date a PayShap Request goes to the buyer for the full amount, straight back to the funder. A shared **~0.2% reserve pool** softens defaults instead of punishing one SME for one late buyer. PayShap already runs across **14 banks** with **839m+ transactions worth R774bn** and a **R50,000** cap that neatly defines our segment. [9] | Luyanda |
| **4** | **Nobody is accountable — fraud is easy.** Forged and duplicate invoices are a leading fraud type; SAFPS saw fraud incidents rise **32%** in 2023 and prevented **R7.44bn** in losses in 2025. [10] Funders price this risk into every SME. | **A liability chain.** Every invoice is tied to a real POS record. Buyer confirmation is reference- and amount-locked, so the wrong invoice cannot be approved by accident. A **duplicate-invoice registry** and **velocity checks** flag unusual volume. Disbursement goes only to the SME's own verified ShapID. Everyone in the chain — SME, buyer, funder — is on record. | Kwane + Luyanda |
| **5** | **Funders can't tell a real business from a risky one.** Existing lenders demand 6+ months' trading history, Xero/Sage bookkeeping and turnover minimums — criteria that structurally exclude the smallest businesses. [11] | **Legitimacy before funding.** The POS history shows a funder a real, trading business *before* the first invoice is ever financed. And instead of judging the SME on its own bookkeeping, PLEXUS scores the **buyer's payment reliability** from PayShap history (with explicit, revocable consent). Entry requirement: a phone number. | Kwane + Luyanda |
| **6** | **SMEs never graduate.** With no credit history, the fiftieth successful order still looks like day one. The transaction ends; nothing compounds. | **Track record → credit score → bank.** Every sale, confirmed invoice and on-time repayment feeds a live credit score (NODAL's /850 model). After a strong history, the SME generates a **shareable, verifiable credit report** to take to a bank for bigger, longer-term finance. PLEXUS is the on-ramp, not a permanent dependency. | Kwane + Luyanda |

---

## How it works — one flow

1. **Sell.** The SME records everyday sales and stock in the PLEXUS POS.
2. **Invoice.** It creates an invoice in-app or scans a paper one; **AI verifies** it before submission.
3. **Confirm.** The buyer approves a **PayShap Request** tied to that exact invoice, inside their own banking app.
4. **Fund.** The partner funder advances **80–90%** to the SME's verified ShapID — same day.
5. **Settle.** On the due date the buyer pays the full amount via PayShap Request, routed to the funder.
6. **Prove.** The SME's credit score and the buyer's reliability score both update. The record compounds.

---

## Why not just use Bridgement, Lula or Retail Capital?

| | Existing lenders | PLEXUS |
|---|---|---|
| **What's scored** | The SME's own bank / accounting data | The SME's live POS history **and** the buyer's payment reliability |
| **Entry requirement** | 6+ months trading, accounting software, turnover minimums | A phone number (ShapID) and a POS |
| **Regulatory burden** | The lender itself | An already NCR-registered partner funder — PLEXUS is not the lender of record |
| **After repayment** | Transaction ends | Score persists, feeds the next invoice, and graduates the SME to formal credit |

---

## Business model

- **Revenue:** **1% platform fee** per financed invoice (paid by the SME) + the funder's own margin
  (**3–8%**, in line with comparable SA short-term SME finance).
- **Reserve pool:** ~**0.2%** of the fee funds shared default absorption.
- **Costs:** cloud hosting (~R2,000–R8,000/month early-stage), bank/PSP integration, funder
  partnership. *Open items, stated honestly:* PSP/bank integration fees, the funder agreement, and
  POS subscription pricing.
- **Market:** the slice of the R350bn gap that turnover-based lenders structurally exclude.

---

## What exists today vs. what we build next

- **Live now (NODAL):** POS / sales with invoice generation, inventory, cash flow, suppliers, public
  storefront, AI business coach, AI credit score. Offline-first, atomic stock, default-deny security.
- **Next (PLEXUS):** invoice scanning + AI verification, PayShap Request integration,
  duplicate-invoice registry, buyer reliability scoring, partner-funder disbursement, POPIA consent flow.
- **Later:** the Connect layer — demand matching, capacity aggregation and a portable Business
  Passport (see `PLEXUS_PITCH.md`).

---

## Security & POPIA

- **Data minimisation** — only the transaction fields needed for a reliability score, never full statements.
- **Explicit, revocable consent** — SME and buyer see exactly what is accessed and can withdraw.
- **Named accountability** — a designated Information Officer, as POPIA requires.

---

## Sources

1. IFC — R350bn MSME finance gap (cited in IFC–FirstRand partnership release, 2025; Business Report, Jan 2026).
2. FinMark Trust — *FinScope MSME South Africa 2024*: ~3m MSMEs, ~34% of GDP, ~60% of jobs, 72% informal, ~5% with formal credit, 315+ funders / 600+ products.
3. Stats SA — *Survey of Employers and the Self-Employed 2023*: 72% of non-VAT-registered businesses keep no financial records.
4. Standard Bank — *Informal Economy Report*: ~80% of township businesses unregistered.
5. SAJESBM (2025); SABC News (2024); Business Report (Jul 2025) — SME failure rates and working-capital mismanagement as leading cause.
6. Ardent Partners — *State of ePayables*; IOFM AP benchmarks — ~25% average invoice exception rate, +14 days, 4–5× processing cost.
7. Xero — *State of Late Payments: South Africa* — 91% paid late, 18 days average, R99,800 owed per SME, 89.5 hours/year chasing.
8. National Treasury 30-day payment reports via SAnews / gov.za — R15.5bn across 90,856 invoices older than 30 days (Q3 2025/26).
9. PayShap adoption — BankservAfrica figures reported by Business Media MAGS, MyBroadband and IT-Online: 14 banks (Mar 2026), 839m+ transactions / R774bn, 44.8m monthly (Aug 2025), R50k limit (Oct 2024), PayShap Request launched Dec 2024.
10. Southern African Fraud Prevention Service (SAFPS) — fraud landscape 2023–2025.
11. Luyanda — *Verified Invoice Financing Platform — Final Concept* (`PLEXUS DOC.docx`): lender comparison, funding flow, fees, POPIA controls.

---

**PLEXUS — turning invisible businesses into fundable ones.**
