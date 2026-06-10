# NODAL

> **The AI business brain for African SMEs — in your pocket, in your language, in your currency.**

NODAL is an all-in-one business operating system with an AI co-pilot built into every screen. It helps small and medium businesses across Africa manage inventory, sales, cash flow, suppliers, and a digital storefront — and turns their everyday transactions into real intelligence: actionable recommendations, fraud/anomaly detection, revenue forecasts, and a **business credit score** that can unlock financing for the unbanked.

Everything is built for the African SME reality — pricing in **South African Rand (ZAR / R)**, WhatsApp-first sharing, and a voice assistant so anyone who can talk can use it.

---

## ✨ Features

### Core modules
- **Dashboard** — revenue, pending/overdue orders, low-stock alerts, 14-day income vs. expense trends, and contextual AI insights at a glance.
- **Inventory** — product catalogue with SKUs, reorder levels, cost vs. selling price (margins), stock-status badges, and CSV export.
- **Sales (POS)** — fast point-of-sale, auto-generated invoices with tax, PDF download, multiple payment methods (cash/card/mobile/credit), and automatic credit-sale tracking.
- **Cash Flow** — income vs. expense by category, profit margin, receivables, time-period filtering, and CSV export.
- **Suppliers** — contact directory, category mapping, and low-stock-triggered purchase-order workflow.
- **Storefront** — build and share a digital shop (with live mobile/desktop preview) straight to **WhatsApp** in a few clicks.

### AI superpowers
- **AI Coach** — a conversational business analyst (chat **and** voice) that reads your live data and is **screen-aware**.
- **Voice HUD** — hands-free assistant: speech-to-text → AI → text-to-speech, with a live animated AI blob and a hold-to-peek gesture.
- **AI Hub**
  - **Recommendations** — ranked actions by impact & confidence.
  - **Credit Score** — a business credit score (0–850) from real factors + pre-qualified lending offers.
  - **Benchmarking** — your metrics vs. industry average and top 10%.
  - **Anomalies** — fraud risk, waste, slow stock, and pricing issues.
  - **Forecast** — 7-day revenue forecast with confidence bands and smart reorder timing.

### Design & UX
- Glassmorphic, warm cream-and-charcoal bento UI.
- 5 accent themes + dark mode (instant recolour).
- Pluggable AI backend: **Google Gemini** (cloud) **or** a fully local model via **Ollama** (privacy / offline-friendly).
- **Graceful fallbacks** — every AI endpoint returns realistic demo data if the model/network is unavailable, so the app never breaks.

---

## 🧱 Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| State | Zustand |
| UI | Radix UI, lucide-react, Recharts |
| Backend | Node.js, Express |
| Database | MySQL (via `mysql2`) |
| Storage | Huawei Cloud OBS (object storage) |
| AI | Google Gemini API **or** local Ollama |
| Voice | Web Speech API (STT + TTS) |

---

## 🚀 Getting started

### Prerequisites
- Node.js 18+
- (Optional) A MySQL database
- (Optional) A Google Gemini API key **or** [Ollama](https://ollama.com) running locally

### 1. Install dependencies
```powershell
npm install
cd server; npm install; cd ..
```

### 2. Configure environment
Copy the example env file and fill in your own values:
```powershell
Copy-Item server/.env.example server/.env
```
Then edit `server/.env` (see [Environment variables](#-environment-variables) below).

### 3. Run the app
Open two terminals.

**API server** (port 3001):
```powershell
cd server; npm start
```

**Frontend** (port 3000):
```powershell
npm run dev
```

Then open **http://localhost:3000**.

> **Using a local model?** Set `AI_PROVIDER=ollama` in `server/.env`, install Ollama, and pull a model (e.g. `ollama pull llama3.2:3b`). For a snappier demo, prefer a lighter model — large reasoning models can take 30–60s per reply on CPU.

---

## 🔑 Environment variables

All secrets live in `server/.env` (which is **git-ignored** — never commit it). See `server/.env.example` for the full template.

| Variable | Description |
|---|---|
| `PORT` | API server port (default 3001) |
| `RDS_HOST` / `RDS_PORT` / `RDS_USER` / `RDS_PASSWORD` / `RDS_DATABASE` | MySQL connection |
| `RDS_SSL` | `true` to enable SSL |
| `OBS_AK` / `OBS_SK` / `OBS_ENDPOINT` / `OBS_BUCKET` | Object storage (uploads) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Google Gemini config |
| `AI_PROVIDER` | `gemini` or `ollama` |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | Local model config |

---

## 📜 Scripts

**Frontend** (root):
- `npm run dev` / `npm start` — start Vite dev server (port 3000)
- `npm run build` — type-check + production build
- `npm run preview` — preview the production build

**Backend** (`server/`):
- `npm start` — start the API server
- `npm run dev` — start with file watching

---

## 📁 Project structure

```
public/            Static assets (icon, manifest)
server/            Express API (AI endpoints, data, uploads)
  ├─ index.js      Server entry + AI provider routing
  ├─ db.js         MySQL pool & schema init
  ├─ routes.js     Data/upload routes
  └─ obs.js        Object storage
src/
  ├─ components/   Common + layout components (AI blob, voice HUD, etc.)
  ├─ pages/        Dashboard, Inventory, Sales, CashFlow, Suppliers, Storefront, AIHub
  ├─ services/     ai.ts (AI client), db.ts
  ├─ stores/       Zustand app store
  ├─ theme/        Theming
  └─ types/        Shared types
```

---

## 🔐 Security note

`server/.env` contains live credentials and is excluded from version control. If you ever expose these keys, **rotate them immediately** (DB password, API keys, OBS secret key).

---

## 📄 License

Private project — all rights reserved.
