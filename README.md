# NODAL

> **The AI business brain for African SMEs — in your pocket, in your language, in your currency.**

NODAL is a full-stack business operating system with an AI co-pilot built into every screen. It helps small and medium businesses across Africa manage inventory, sales, cash flow, suppliers, and a shareable digital storefront — and turns their everyday transactions into real intelligence: ranked recommendations, anomaly/fraud detection, 7-day revenue forecasts, and a business credit score that can unlock financing for the unbanked.

Everything is built for the African SME reality: pricing in **South African Rand (ZAR / R)**, **WhatsApp-first** order sharing, offline resilience for spotty connections, and a voice assistant so anyone who can talk can use it — no typing required.

---

## 🎬 Demo

[![NODAL Demo](https://img.youtube.com/vi/u44Rkt3HXtw/maxresdefault.jpg)](https://youtu.be/u44Rkt3HXtw?si=i53xFQgfehdNM20o)

▶ **[Watch the full demo on YouTube](https://youtu.be/u44Rkt3HXtw?si=i53xFQgfehdNM20o)**

---

## ✨ Feature highlights

| Module | What it does |
|---|---|
| **Dashboard** | Revenue KPIs, pending/overdue orders, low-stock alerts, 14-day income vs. expense trend, AI insight banner |
| **Inventory** | Product catalogue with SKUs, margins, reorder levels, stock badges, stock movements log, CSV export |
| **Sales / POS** | Fast point-of-sale, auto-invoice + tax, PDF download, multi-payment (cash/card/mobile/credit), credit-sale tracking |
| **Cash Flow** | Income vs. expense by category, profit margin, receivables, time-period filter, CSV export |
| **Suppliers** | Contact directory, category mapping, low-stock-triggered purchase-order workflow |
| **Storefront** | One-click public shop published to a shareable `/store/:slug` URL — share straight to WhatsApp |
| **AI Coach** | Conversational analyst (chat **and** voice) that reads your live data and is screen-aware |
| **Voice HUD** | Hands-free assistant: STT → AI → TTS with animated blob and hold-to-peek gesture |
| **AI Hub** | Recommendations, credit score, industry benchmarking, anomaly detection, 7-day revenue forecast |

---

## 🧱 Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| State management | Zustand |
| UI components | MUI v7, Radix UI, Recharts, lucide-react |
| Backend | Node.js + Express (AI proxy server) |
| Database & Auth | **Firebase** (Firestore `africa-south1`, Email/Password Auth) |
| AI — cloud | Google Gemini API (`gemini-2.0-flash`) |
| AI — local | Ollama (any model — tested with `deepseek-r1:1.5b`) |
| Voice | Web Speech API (STT + TTS, `en-ZA` locale) |

---

## 🏗 Architecture overview

```
┌─────────────────────────────────────────────────────────┐
│                  React SPA  (port 3000)                  │
│  Zustand store ←──► Firestore (offline-first SDK)        │
│       ↕                                                  │
│  AI service layer  ──► Express proxy  (port 3001)        │
│                              ↕                           │
│                   Gemini API  |  Ollama (local)           │
└─────────────────────────────────────────────────────────┘
         ↕ public route (/store/:slug) — no auth needed
     Firestore /storefronts  (public-read collection)
```

**Data flow:** Every write hits Zustand immediately (optimistic UI), then syncs to Firestore in the background. On the next sign-in the store hydrates from Firestore and discards stale local state. First-ever sign-in seeds a fully-populated demo workspace so every screen works instantly.

---

## 🔍 Code walkthrough for judges

All paths are relative to the repository root. Links go to the exact lines on GitHub.

---

### 1 · Firebase foundation — Africa-hosted, offline-first

#### Offline persistence (works without signal)
[`src/services/firebase.ts` — lines 24–31](src/services/firebase.ts#L24-L31)

Firestore is initialised with `persistentLocalCache()` so reads and writes survive a complete network drop. The catch falls back to in-memory cache if IndexedDB is unavailable (e.g. private browsing).

```ts
// Persistent local cache = offline resilience (spotty connections, demos).
let firestore: Firestore;
try {
  firestore = initializeFirestore(app, { localCache: persistentLocalCache() });
} catch {
  firestore = getFirestore(app);
}
```

#### Email / password sign-up and sign-in
[`src/services/auth.ts` — lines 40–52](src/services/auth.ts#L40-L52)

#### Signup race-condition fix — business name captured before `updateProfile` lands
[`src/services/auth.ts` — lines 23–36](src/services/auth.ts#L23-L36)

`onAuthStateChanged` fires before `updateProfile()` resolves, which means the seeder would see an empty `displayName`. The fix stores the name in a module-level variable and exposes a one-shot `takePendingBusinessName()` that the seeder calls instead.

---

### 2 · Data layer — Firestore, real not demo

#### Atomic sale + stock decrement via `runTransaction` (prevents overselling)
[`src/services/db.ts` — lines 150–215](src/services/db.ts#L150-L215)

Both `createSale` and `adjustStock` use Firestore transactions. Stock quantities are clamped to ≥ 0 inside the transaction so a concurrent burst of sales can never push inventory negative.

#### One-time demo-data seeding per new account
[`src/services/db.ts` — lines 70–103](src/services/db.ts#L70-L103)

Guarded by a `seeded` flag on the user doc — deleting products later never triggers a re-seed.

#### Auth → store wiring: sign-in triggers `loadFromDatabase`
[`src/stores/appStore.ts` — lines 81–130](src/stores/appStore.ts#L81-L130)

`setAuthUser` is the single entry point. When a user signs in it calls `loadFromDatabase` (which calls `ensureSeeded` first); on sign-out it resets to mock data.

#### Optimistic UI writes with background Firestore sync
[`src/stores/appStore.ts` — lines 155–230](src/stores/appStore.ts#L155-L230)

Every mutation (add/update/delete product, adjust stock, add sale…) updates Zustand synchronously so the UI responds instantly, then fires the matching Firestore call in the background. Errors are logged but never block the UI.

---

### 3 · Security rules — deployed, default-deny

Full rules file: [`firestore.rules`](firestore.rules)

#### Owner-only access + schema validators
[`firestore.rules` — lines 73–165](firestore.rules#L73-L165)

Every sub-collection (`products`, `sales`, `suppliers`, `cashflow`, `stockMovements`) validates the **full document shape** on both create and update — field allowlist, type checks, non-negative numbers, string length caps.

#### Storefront validator — size caps, ≤ 200 products
[`firestore.rules` — lines 188–211](firestore.rules#L188-L211)

Public storefront documents are size-capped at the rules level: product list ≤ 200 items, string fields have max lengths, and `ownerUid` is validated as a 1–128 char string.

#### The only public collection
[`firestore.rules` — lines 255–273](firestore.rules#L255-L273)

`/storefronts/{slug}` is the **only** path with `allow read: if true`. Writes are owner-only and `ownerUid` is immutable (create sets it; update must match existing value).

#### Default-deny catch-all
[`firestore.rules` — lines 275–278](firestore.rules#L275-L278)

Anything not explicitly matched is denied — no wildcards escape.

---

### 4 · Public storefront — the "wow" feature

A merchant taps **Share store** and gets a real URL (`/store/their-business-name`) that any customer can open in a browser — no app, no account required.

#### `slugify` + slug-collision retry with uid suffix
[`src/services/db.ts` — lines 359–370](src/services/db.ts#L359-L370)

```ts
function slugify(name: string): string {
  return name.toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')  // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'store';
}
```

#### `publishStorefront` — snapshot of in-stock catalogue to public doc
[`src/services/db.ts` — lines 381–437](src/services/db.ts#L381-L437)

On a `permission-denied` (slug already claimed by another business), the function retries once with a `{slug}-{uid.slice(0,6)}` suffix so shared links are permanent and never clash.

Base64 images are intentionally excluded from the public snapshot — they would blow Firestore's 1 MB document limit.

#### `fetchPublicStorefront` — works unauthenticated
[`src/services/db.ts` — lines 440–448](src/services/db.ts#L440-L448)

A plain `getDoc` on the public collection — no `auth.currentUser` required.

#### Public route bypasses the auth gate
[`src/App.tsx` — lines 58–70](src/App.tsx#L58-L70)

`/store/:slug` is declared **before** the `GatedApp` component so customers reach the storefront without ever seeing a login screen.

#### Cart logic + stock-clamped stepper
[`src/pages/PublicStorefront.tsx` — lines 128–139](src/pages/PublicStorefront.tsx#L128-L139)

`Math.min(p.quantity, prev[p.id] + delta)` clamps the stepper to the published stock count — customers can't order more than what's available.

#### WhatsApp order deep link
[`src/pages/PublicStorefront.tsx` — lines 141–153](src/pages/PublicStorefront.tsx#L141-L153)

The **Place Order** button composes a `wa.me/{digits}?text=…` URL with a pre-filled order summary (line items + total). Falls back to a `mailto:` link if no WhatsApp number is set.

#### Auto-republish on catalogue changes (1.2 s debounce)
[`src/pages/Storefront.tsx` — lines 56–62](src/pages/Storefront.tsx#L56-L62)

Any change to products or the business profile triggers a debounced re-publish, keeping the public page in sync automatically.

#### Share / publish-on-first-copy flow
[`src/pages/Storefront.tsx` — lines 64–95](src/pages/Storefront.tsx#L64-L95)

The first **Copy link** also publishes the storefront (lazy publish) — the merchant never has to think about a separate publish step.

---

### 5 · AI layer — server

The Express server is a thin proxy that keeps all API keys off the client, adds a 30-minute response cache, and provides a seamless provider switch between Gemini and Ollama.

#### Gemini call (OpenAI-style messages → Gemini `contents`)
[`server/index.js` — lines 226–245](server/index.js#L226-L245)

#### Local LLM via Ollama — zero cloud cost
[`server/index.js` — lines 248–286](server/index.js#L248-L286)

Set `AI_PROVIDER=ollama` in `server/.env`, run `ollama pull deepseek-r1:1.5b`, and the entire AI layer runs on-device with no API key and no internet connection required.

#### 30-minute LLM response cache
[`server/index.js` — lines 311–325](server/index.js#L311-L325)

An in-memory `Map` keyed on `{modelId}|{endpointKey}|{hashStr(context)}`. Since the mock business data is largely static, this keeps the demo snappy and avoids burning through free Gemini quota on the auto-loading AI panels.

#### Quota-proof demo fallback — never breaks on stage
[`server/index.js` — lines 332–415](server/index.js#L332-L415)

`isQuotaOrKeyError(err)` catches 429s, missing keys, Ollama being unreachable, and malformed JSON. Every AI endpoint returns HTTP 200 with realistic canned data (matching the mock products) instead of a 500 error, so the demo never fails in front of judges.

#### Screen-aware AI coach endpoint
[`server/index.js` — lines 422–455](server/index.js#L422-L455)

The `/api/chat` route accepts a `page` field and injects a `"CURRENT SCREEN: …"` note into the system prompt, so the coach automatically tailors its answer to whatever screen the user is looking at.

---

### 6 · Voice assistant

#### STT → LLM → TTS loop with 4 s silence auto-submit
[`src/hooks/useLiveVoice.ts` — lines 34–75](src/hooks/useLiveVoice.ts#L34-L75)

`webkitSpeechRecognition` runs in `en-ZA` locale. A 250 ms polling interval checks `Date.now() - lastSpeechRef.current`; once silence exceeds `silenceMs` (default 4 000 ms) the transcript is submitted automatically — no tap-to-send button needed.

#### TTS phase handling
[`src/hooks/useLiveVoice.ts` — lines 76–93](src/hooks/useLiveVoice.ts#L76-L93)

`speak()` picks a natural-sounding voice (Aria / Jenny / Google UK English) and transitions through the `idle → listening → thinking → speaking` phase machine that drives the animated AI blob.

---

## 🚀 Getting started

### Prerequisites
- Node.js 18+
- A Firebase project (or use the included public config — it auto-seeds a demo workspace on first sign-in)
- A Google Gemini API key **or** [Ollama](https://ollama.com) running locally (`ollama pull deepseek-r1:1.5b`)

### 1 · Install dependencies

```bash
npm install
cd server && npm install && cd ..
```

### 2 · Configure the server

```bash
# Windows
Copy-Item server/.env.example server/.env
# macOS / Linux
cp server/.env.example server/.env
```

Edit `server/.env` and fill in at minimum:

```env
GEMINI_API_KEY=your_key_here   # OR set AI_PROVIDER=ollama below

# Local model (no API key needed)
# AI_PROVIDER=ollama
# OLLAMA_MODEL=deepseek-r1:1.5b
```

### 3 · Run the app

Open two terminals:

```bash
# Terminal 1 — API server (port 3001)
cd server && npm start

# Terminal 2 — Frontend (port 3000)
npm run dev
```

Open **http://localhost:3000**, create an account (any email + password), and NODAL will seed a fully populated demo workspace automatically.

> **Tip:** The app works completely without a Gemini key — the AI panels serve realistic cached fallback data so every feature is demonstrable.

---

## 🔑 Environment variables

All secrets live in `server/.env` (git-ignored — never commit it).

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | API server port |
| `GEMINI_API_KEY` | — | Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model name |
| `AI_PROVIDER` | `gemini` | `gemini` or `ollama` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `deepseek-r1:1.5b` | Local model to use |

---

## 📁 Project structure

```
src/
  App.tsx                   # Route config — public /store/:slug before auth gate
  services/
    firebase.ts             # Firebase init + offline persistence
    auth.ts                 # Email/pw auth + race-condition fix
    db.ts                   # All Firestore CRUD, transactions, storefront
    ai.ts                   # AI client + model picker
  stores/
    appStore.ts             # Zustand store — optimistic UI + DB sync
  pages/
    Dashboard.tsx           # KPIs, trends, AI banner
    Inventory.tsx           # Product catalogue + stock movements
    Sales.tsx               # POS + invoice list
    CashFlow.tsx            # Income/expense ledger
    Suppliers.tsx           # Supplier directory
    Storefront.tsx          # Merchant storefront editor + publish
    PublicStorefront.tsx    # Customer-facing store (unauthenticated)
    AIHub.tsx               # 5-panel AI intelligence hub
    AIChat.tsx              # Conversational AI coach
    Settings.tsx            # Theme, AI model picker
  components/
    common/
      AIBlob.tsx            # Animated blob (idle/listening/thinking/speaking)
      AIBlobFab.tsx         # Floating action button that opens VoiceHud
      VoiceHud.tsx          # Voice assistant overlay
      AIInsightBanner.tsx   # Contextual insight strip on each page
  hooks/
    useLiveVoice.ts         # STT → LLM → TTS loop
server/
  index.js                  # Express server — AI proxy, provider routing, cache
  routes.js                 # Data routes
firestore.rules             # Firestore Security Rules (deployed)
firebase.json               # Firebase project config
```

---

## 🔐 Security

- All Firestore paths are **owner-only** by default; the `storefronts` collection is the only public-read path and is explicitly documented as intentional.
- Every document type has a **schema validator** in the security rules (field allowlist + type + length checks) applied on both create and update.
- `ownerUid` on storefront documents is **immutable** — enforced at the rules level, not the application level.
- API keys live exclusively in `server/.env` and are never shipped to the browser.
- The AI chat endpoint is rate-limited by session history and capped at the last 10 messages per request.

---

## 📜 Scripts

**Frontend** (root):

```bash
npm run dev       # Vite dev server — port 3000
npm run build     # tsc + vite build
npm run preview   # Preview production build
```

**Backend** (`server/`):

```bash
npm start         # Start API server — port 3001
npm run dev       # Start with file-watching (nodemon)
```

---

## ⚠️ Disclaimer

The numbers displayed in NODAL (revenue, stock, credit scores, etc.) are **fictional sample data** seeded automatically on first sign-in for demonstration purposes. The platform, data flows, and integrations are fully functional.

---

## 📄 License

Private project — all rights reserved.
