const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { initDatabase, seedIfEmpty, query } = require('./db');
const { uploadImage } = require('./obs');
const dataRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Multer: store in memory for OBS upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '50kb' }));

const HUAWEI_API_URL = process.env.HUAWEI_API_URL;
const HUAWEI_API_KEY = process.env.HUAWEI_API_KEY;

// ================== GOOGLE GEMINI ==================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// Models the client is allowed to request (guards against arbitrary input).
const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]);
function resolveModel(requested) {
  return requested && ALLOWED_GEMINI_MODELS.has(requested) ? requested : GEMINI_MODEL;
}

// ================== LOCAL OLLAMA ==================
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:1.5b';

// Which provider powers the AI features. Explicit AI_PROVIDER wins; otherwise
// use Gemini if a key is present, else fall back to the local Ollama model.
const AI_PROVIDER = (process.env.AI_PROVIDER || (GEMINI_API_KEY ? 'gemini' : 'ollama')).toLowerCase();

// Remove reasoning-model scratchpad blocks (e.g. deepseek-r1 emits <think>…</think>).
function stripThink(text) {
  return (text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/i, '')
    .trim();
}

// The model id actually used for a request — used for cache keys + logging.
function activeModelId(requested) {
  return AI_PROVIDER === 'ollama' ? `ollama:${OLLAMA_MODEL}` : resolveModel(requested);
}

const SYSTEM_PROMPT_COACH = `You are the NODAL AI Business Coach — an intelligent advisor for African SME owners.

ROLE: You analyze the owner's real business data (provided below) and give specific, actionable advice. You compare their performance against 2,400+ similar SMEs in the NODAL network.

STYLE:
- Use markdown formatting with bold, bullets, and emojis for readability
- Be specific — reference actual product names, amounts, and percentages from their data
- Keep responses concise (under 300 words) but data-rich
- Use South African Rand (R) for currency
- Be encouraging but honest about problems
- End with one specific actionable next step

CAPABILITIES:
- Benchmarking against similar SMEs
- Revenue forecasting and trend analysis
- Growth opportunity identification
- Credit score explanation
- Anomaly and fraud detection
- Inventory optimization and reorder timing
- Supplier management advice
- Cash flow analysis`;

const SYSTEM_PROMPT_RECOMMENDATIONS = `You are the NODAL AI analysis engine. Given the business data below, generate exactly 5 smart recommendations.

Return ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON.

Format:
[
  {
    "id": 1,
    "category": "Revenue|Inventory|Pricing|Staffing|Marketing",
    "title": "Short action title",
    "impact": "+R2,340/month",
    "confidence": 89,
    "basis": "One sentence explanation with specific data"
  }
]

Rules:
- Use actual product names and numbers from the provided data
- Impact amounts should be realistic for a small African business
- Confidence should range from 70-95
- Each recommendation should be different category if possible
- Reference specific products, patterns, or metrics from their data`;

const SYSTEM_PROMPT_INSIGHTS = `You are the NODAL AI insight generator. Given business data and a page context, generate 4-5 short, specific insights.

Return ONLY valid JSON — no markdown, no code fences.

Format:
[
  {
    "type": "prediction|warning|success|info",
    "title": "Short title (3-5 words)",
    "description": "One sentence insight referencing specific data",
    "confidence": 87
  }
]

Rules:
- Each insight should be different type
- Reference actual product names and amounts
- Keep descriptions under 25 words
- Confidence 70-95`;

const SYSTEM_PROMPT_BANNER = `You are the NODAL AI insight generator. Given business data and a page context, generate exactly 5 short insight strings for a rotating banner.

Return ONLY a valid JSON array of strings — no markdown, no code fences.

Format:
["Insight 1 text here", "Insight 2 text here", ...]

Rules:
- Each insight should be one sentence, 15-25 words
- Reference specific product names, amounts, or percentages from the data
- Mix actionable tips, predictions, and benchmarking comparisons
- Use South African Rand (R) for any currency amounts`;

function buildBusinessContext(data) {
  const parts = [];
  if (data.products?.length) {
    const productSummary = data.products.map(p =>
      `${p.name} (${p.category}): ${p.quantity} units, price R${p.price}, cost R${p.costPrice}, reorder at ${p.reorderLevel}`
    ).join('\n');
    parts.push(`PRODUCTS (${data.products.length} items):\n${productSummary}`);
  }
  if (data.sales?.length) {
    const totalRev = data.sales.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.total, 0);
    const pending = data.sales.filter(s => s.status === 'pending').length;
    const overdue = data.sales.filter(s => s.status === 'overdue').length;
    parts.push(`SALES SUMMARY: Total revenue R${totalRev}, ${data.sales.length} transactions, ${pending} pending, ${overdue} overdue`);
  }
  if (data.cashFlow?.length) {
    const income = data.cashFlow.filter(c => c.type === 'income').reduce((sum, c) => sum + c.amount, 0);
    const expenses = data.cashFlow.filter(c => c.type === 'expense').reduce((sum, c) => sum + c.amount, 0);
    parts.push(`CASH FLOW (14 days): Income R${income}, Expenses R${expenses}, Net R${income - expenses}`);
  }
  if (data.businessProfile) {
    parts.push(`BUSINESS: ${data.businessProfile.name} — ${data.businessProfile.tagline}`);
  }
  return parts.join('\n\n');
}

async function callHuaweiLLM(messages, model = 'deepseek-v3.1', options = {}) {
  const body = {
    model,
    messages,
    max_tokens: options.max_tokens || 1024,
    temperature: options.temperature || 0.7,
    top_p: options.top_p || 0.9,
    stream: false,
  };

  const response = await fetch(HUAWEI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${HUAWEI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Huawei API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Convert OpenAI-style messages to Gemini's contents + systemInstruction format.
function toGeminiPayload(messages, options = {}) {
  const systemParts = [];
  const contents = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systemParts.push({ text: m.content });
      continue;
    }
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  }
  const payload = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      topP: options.top_p ?? 0.9,
      maxOutputTokens: options.max_tokens ?? 1024,
    },
  };
  if (systemParts.length) payload.systemInstruction = { parts: systemParts };
  // For structured endpoints, ask Gemini to return raw JSON (no code fences).
  if (options.expectJson) payload.generationConfig.responseMimeType = 'application/json';
  return payload;
}

async function callGeminiLLM(messages, options = {}) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const model = resolveModel(options.model);
  const url = `${GEMINI_API_BASE}/${model}:generateContent`;
  const response = await fetch(`${url}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toGeminiPayload(messages, options)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || '').join('').trim();
}

// Call a local model via Ollama's /api/chat endpoint (OpenAI-style messages).
async function callOllamaLLM(messages, options = {}) {
  const body = {
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: {
      temperature: options.temperature ?? 0.7,
      top_p: options.top_p ?? 0.9,
      // Reasoning models spend tokens "thinking", so give them extra headroom.
      num_predict: (options.max_tokens ?? 1024) + 1024,
    },
  };
  // Constrain to valid JSON for the structured endpoints.
  if (options.expectJson) body.format = 'json';

  let response;
  try {
    response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Ollama unreachable at ${OLLAMA_BASE_URL} (is "ollama serve" running?): ${e.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return stripThink(data?.message?.content || '');
}

// Single entry point so endpoints don't care which provider is active.
async function callLLM(messages, options = {}) {
  return AI_PROVIDER === 'ollama' ? callOllamaLLM(messages, options) : callGeminiLLM(messages, options);
}

// Parse JSON that may arrive wrapped in ```json fences or surrounded by prose
// (small local models are less disciplined about returning clean JSON).
function parseJsonLoose(text) {
  let t = stripThink(text || '').trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  try {
    return JSON.parse(t);
  } catch {
    // Extract the first JSON array or object embedded in the output.
    const match = t.match(/[[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('No JSON found in model output');
  }
}

// Tiny string hash for cache keys.
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// In-memory LLM cache. The mock business data is largely static, so caching
// keeps the demo snappy AND avoids burning through free Gemini tokens on the
// auto-loading AI panels (recommendations, insights, forecast, etc.).
const LLM_CACHE = new Map();
const LLM_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function cachedLLM(key, messages, options = {}) {
  // Different models can produce different output, so key by model too.
  const fullKey = `${activeModelId(options.model)}|${key}`;
  const hit = LLM_CACHE.get(fullKey);
  if (hit && Date.now() - hit.t < LLM_CACHE_TTL) return hit.v;
  const v = await callLLM(messages, options);
  LLM_CACHE.set(fullKey, { v, t: Date.now() });
  return v;
}

// ================== DEMO FALLBACKS ==================
// When the Gemini API is unavailable (no key, quota exhausted / 429, network
// error), we serve realistic canned data so the demo never breaks. These match
// the exact JSON shapes the frontend expects.
const DEMO_FALLBACK = {
  chat:
    "Here's a quick read on your business 👇\n\n" +
    '**Top opportunity:** Your **Wireless Earbuds** carry the highest margin (R4,500 vs R2,800 cost) — push them in a weekend bundle to lift basket value.\n\n' +
    '**Watch:** **Cooking Oil (2L)** and **Premium Rice (5kg)** are fast movers nearing reorder. Restock before Friday to avoid weekend stockouts.\n\n' +
    '**Cash flow:** Net positive over the last 14 days — keep overdue invoices under control.\n\n' +
    "_Note: I'm showing cached guidance — the live AI model is rate-limited right now. Your real data is still being read; reconnect the Gemini key for fully live answers._\n\n" +
    '**Next step:** Bundle earbuds + screen protector at R4,800 this weekend.',
  recommendations: [
    { id: 1, category: 'Pricing', title: 'Bundle earbuds + screen protector', impact: '+R3,200/month', confidence: 88, basis: 'Wireless Earbuds have the highest margin; pairing lifts attach rate.' },
    { id: 2, category: 'Inventory', title: 'Reorder Cooking Oil before Friday', impact: '+R1,900/month', confidence: 91, basis: 'Cooking Oil (2L) is a fast mover trending toward its reorder level.' },
    { id: 3, category: 'Revenue', title: 'Run a payday rice promo', impact: '+R2,600/month', confidence: 84, basis: 'Premium Rice (5kg) spikes around month-end paydays.' },
    { id: 4, category: 'Marketing', title: 'Promote bottled water in heat waves', impact: '+R1,400/month', confidence: 79, basis: 'Bottled Water (500ml) demand rises with temperature.' },
    { id: 5, category: 'Staffing', title: 'Add weekend float staff', impact: '+R2,100/month', confidence: 76, basis: 'Sales concentrate Sat–Sun; faster checkout reduces walk-aways.' },
  ],
  insights: [
    { type: 'prediction', title: 'Weekend surge ahead', description: 'Expect ~45% higher sales Sat–Sun led by Cooking Oil and Rice.', confidence: 90 },
    { type: 'warning', title: 'Low stock risk', description: 'Cooking Oil (2L) is nearing its reorder level before the weekend.', confidence: 87 },
    { type: 'success', title: 'Strong margins', description: 'Wireless Earbuds deliver R1,700 gross profit per unit sold.', confidence: 92 },
    { type: 'info', title: 'Payday window opening', description: 'Month-end demand for Premium Rice (5kg) typically jumps 30%.', confidence: 83 },
  ],
  banner: [
    'Wireless Earbuds are your highest-margin item — feature them at the till this weekend.',
    'Cooking Oil (2L) is trending toward its reorder level; restock before Friday to avoid stockouts.',
    'Premium Rice (5kg) sales spike around payday — plan a month-end promo for +30% volume.',
    'Weekend revenue runs ~45% above weekdays; staff up Saturday mornings.',
    'Bottled Water (500ml) moves faster on hot days — keep front-of-store stock high.',
  ],
  creditScore: {
    score: 728,
    maxScore: 850,
    grade: 'A-',
    factors: [
      { name: 'Payment History', score: 90, weight: 35, trend: 'up' },
      { name: 'Cash Flow Stability', score: 76, weight: 25, trend: 'up' },
      { name: 'Sales Velocity', score: 84, weight: 20, trend: 'stable' },
      { name: 'Supplier Reliability', score: 86, weight: 10, trend: 'up' },
      { name: 'Inventory Turnover', score: 70, weight: 10, trend: 'down' },
    ],
    preQualified: [
      { type: 'Micro-Loan', amount: 'R25,000', rate: '12% p.a.', provider: 'NODAL Finance' },
      { type: 'BNPL - Inventory', amount: 'R15,000', rate: '0% (30 days)', provider: 'SupplyNow' },
      { type: 'Working Capital', amount: 'R50,000', rate: '15% p.a.', provider: 'AfriCredit' },
    ],
  },
  benchmarks: [
    { metric: 'Revenue Growth', you: 80, industry: 64, top10: 95 },
    { metric: 'Profit Margin', you: 70, industry: 55, top10: 88 },
    { metric: 'Inventory Turn', you: 68, industry: 60, top10: 90 },
    { metric: 'Customer Retention', you: 74, industry: 58, top10: 92 },
    { metric: 'Cash Cycle', you: 62, industry: 50, top10: 85 },
    { metric: 'Digital Adoption', you: 90, industry: 40, top10: 95 },
  ],
  anomalies: [
    { id: 1, type: 'opportunity', severity: 'high', title: 'Earbuds margin underused', description: 'Wireless Earbuds sell well but are rarely bundled — a missed upsell.', timestamp: '2 hours ago', action: 'Create Bundle' },
    { id: 2, type: 'waste', severity: 'medium', title: 'Slow mover tying up cash', description: 'Facial Tissue Box turnover is below average for its shelf space.', timestamp: '3 hours ago', action: 'Discount Stock' },
    { id: 3, type: 'pricing', severity: 'medium', title: 'Dish Soap priced under market', description: 'Dish Soap (500ml) margin is thin versus comparable SMEs.', timestamp: '4 hours ago', action: 'Adjust Price' },
    { id: 4, type: 'fraud_risk', severity: 'low', title: 'Unusual refund cluster', description: 'A small spike in refunds this week is worth a quick review.', timestamp: '5 hours ago', action: 'Review Transactions' },
  ],
  forecast: {
    forecast: [
      { day: 'Mon', actual: 4200, predicted: 4000, lower: 3600, upper: 4400 },
      { day: 'Tue', actual: 3800, predicted: 3900, lower: 3500, upper: 4300 },
      { day: 'Wed', actual: 5200, predicted: 5000, lower: 4600, upper: 5400 },
      { day: 'Thu', actual: 4800, predicted: 4700, lower: 4300, upper: 5100 },
      { day: 'Fri', actual: 6100, predicted: 6200, lower: 5800, upper: 6600 },
      { day: 'Sat', actual: null, predicted: 7500, lower: 6800, upper: 8200 },
      { day: 'Sun', actual: null, predicted: 5800, lower: 5200, upper: 6400 },
    ],
    patterns: [
      { pattern: 'Weekend sales surge', detail: 'Revenue increases ~45% on Sat–Sun', confidence: 93 },
      { pattern: 'Mid-week dip', detail: 'Tue–Wed see ~20% lower traffic', confidence: 87 },
      { pattern: 'Month-end spike', detail: 'Sales peak around payday (25th–1st)', confidence: 90 },
    ],
    reorderSuggestions: [
      { product: 'Cooking Oil (2L)', optimal: 'Reorder by Friday', quantity: '50 units', reason: 'Weekend demand surge predicted' },
      { product: 'Premium Rice (5kg)', optimal: 'Reorder in 4 days', quantity: '30 units', reason: 'Month-end payday approaching' },
      { product: 'Wireless Earbuds', optimal: 'Reorder next week', quantity: '20 units', reason: 'Gradual depletion at current rate' },
    ],
  },
};

// True when the error looks like a quota / rate-limit / missing-key problem,
// the local model is unreachable, or the model returned unusable output. In all
// these cases we serve realistic demo data so the showcase never breaks.
function isQuotaOrKeyError(err) {
  const m = (err && err.message) || '';
  return /not configured|429|RESOURCE_EXHAUSTED|quota|rate.?limit|Ollama unreachable|Ollama API error|ECONNREFUSED|fetch failed|ENOTFOUND|No JSON found/i.test(m);
}

// POST /api/chat — AI Business Coach
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], businessContext, page } = req.body;

    const contextStr = buildBusinessContext(businessContext || {});
    const screenNote = page
      ? `\n\nCURRENT SCREEN: The user is viewing the "${page}" screen of the NODAL app. Tailor your answer to what they're likely looking at on that screen.`
      : '';

    const messages = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT_COACH}${screenNote}\n\nCURRENT BUSINESS DATA:\n${contextStr}`,
      },
    ];

    // Add conversation history (last 10 messages max)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      });
    }

    messages.push({ role: 'user', content: message });

    const cacheKey = `chat|${page || ''}|${hashStr(message + contextStr + JSON.stringify(recentHistory))}`;
    const response = await cachedLLM(cacheKey, messages, {
      temperature: 0.7,
      max_tokens: 800,
      model: req.body.model,
    });

    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error.message);
    if (isQuotaOrKeyError(error)) {
      return res.json({ response: DEMO_FALLBACK.chat, fallback: true });
    }
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

// POST /api/ai/recommendations — Smart Recommendations
app.post('/api/ai/recommendations', async (req, res) => {
  try {
    const { businessContext } = req.body;
    const contextStr = buildBusinessContext(businessContext || {});

    const messages = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT_RECOMMENDATIONS}\n\nBUSINESS DATA:\n${contextStr}`,
      },
      {
        role: 'user',
        content: 'Analyze this business data and generate 5 smart recommendations to increase revenue, reduce costs, and optimize operations.',
      },
    ];

    const response = await cachedLLM(`recommendations|${hashStr(contextStr)}`, messages, {
      temperature: 0.5,
      max_tokens: 1024,
      expectJson: true,
      model: req.body.model,
    });

    const parsed = parseJsonLoose(response);
    res.json({ recommendations: parsed });
  } catch (error) {
    console.error('Recommendations error:', error.message);
    if (isQuotaOrKeyError(error)) {
      return res.json({ recommendations: DEMO_FALLBACK.recommendations, fallback: true });
    }
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

// POST /api/ai/insights — AI Insights Panel
app.post('/api/ai/insights', async (req, res) => {
  try {
    const { businessContext, page = 'dashboard' } = req.body;
    const contextStr = buildBusinessContext(businessContext || {});

    const messages = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT_INSIGHTS}\n\nPAGE CONTEXT: ${page}\n\nBUSINESS DATA:\n${contextStr}`,
      },
      {
        role: 'user',
        content: `Generate 4 key insights for the ${page} page of this SME business platform.`,
      },
    ];

    const response = await cachedLLM(`insights|${page}|${hashStr(contextStr)}`, messages, {
      temperature: 0.6,
      max_tokens: 600,
      expectJson: true,
      model: req.body.model,
    });

    const parsed = parseJsonLoose(response);
    res.json({ insights: parsed });
  } catch (error) {
    console.error('Insights error:', error.message);
    if (isQuotaOrKeyError(error)) {
      return res.json({ insights: DEMO_FALLBACK.insights, fallback: true });
    }
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

// POST /api/ai/banner — Banner Insights
app.post('/api/ai/banner', async (req, res) => {
  try {
    const { businessContext, page = 'dashboard' } = req.body;
    const contextStr = buildBusinessContext(businessContext || {});

    const messages = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT_BANNER}\n\nPAGE CONTEXT: ${page}\n\nBUSINESS DATA:\n${contextStr}`,
      },
      {
        role: 'user',
        content: `Generate 5 rotating banner insights for the ${page} page.`,
      },
    ];

    const response = await cachedLLM(`banner|${page}|${hashStr(contextStr)}`, messages, {
      temperature: 0.7,
      max_tokens: 400,
      expectJson: true,
      model: req.body.model,
    });

    const parsed = parseJsonLoose(response);
    res.json({ insights: parsed });
  } catch (error) {
    console.error('Banner error:', error.message);
    if (isQuotaOrKeyError(error)) {
      return res.json({ insights: DEMO_FALLBACK.banner, fallback: true });
    }
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

// POST /api/ai/credit-score — AI Credit Score Analysis
app.post('/api/ai/credit-score', async (req, res) => {
  try {
    const { businessContext } = req.body;
    const contextStr = buildBusinessContext(businessContext || {});

    const messages = [
      {
        role: 'system',
        content: `You are the NODAL AI credit scoring engine. Analyze the business data and generate a credit score assessment.

Return ONLY valid JSON — no markdown, no code fences.

Format:
{
  "score": 742,
  "maxScore": 850,
  "grade": "A-",
  "factors": [
    { "name": "Payment History", "score": 92, "weight": 35, "trend": "up" },
    { "name": "Cash Flow Stability", "score": 78, "weight": 25, "trend": "up" },
    { "name": "Sales Velocity", "score": 85, "weight": 20, "trend": "stable" },
    { "name": "Supplier Reliability", "score": 88, "weight": 10, "trend": "up" },
    { "name": "Inventory Turnover", "score": 71, "weight": 10, "trend": "down" }
  ],
  "preQualified": [
    { "type": "Micro-Loan", "amount": "R25,000", "rate": "12% p.a.", "provider": "NODAL Finance" },
    { "type": "BNPL - Inventory", "amount": "R15,000", "rate": "0% (30 days)", "provider": "SupplyNow" },
    { "type": "Working Capital", "amount": "R50,000", "rate": "15% p.a.", "provider": "AfriCredit" }
  ]
}

Rules:
- Score range: 300-850
- Grade mapping: 800+ = A+, 750+ = A, 700+ = A-, 650+ = B+, 600+ = B, 550+ = B-, below = C
- Factor weights MUST sum to 100
- Factor scores 0-100
- Trend: "up", "down", or "stable"
- Analyze the actual business data to determine realistic scores
- Low stock levels should lower Inventory Turnover score
- Overdue payments should lower Payment History score
- Negative cash flow should lower Cash Flow Stability
- Pre-qualified amounts should be realistic for the business size
- Use South African Rand (R) for currency

BUSINESS DATA:
${contextStr}`,
      },
      {
        role: 'user',
        content: 'Analyze this business and generate a credit score assessment with factor breakdown and pre-qualified finance offers.',
      },
    ];

    const response = await cachedLLM(`credit-score|${hashStr(contextStr)}`, messages, {
      temperature: 0.4,
      max_tokens: 800,
      expectJson: true,
      model: req.body.model,
    });

    const parsed = parseJsonLoose(response);
    res.json(parsed);
  } catch (error) {
    console.error('Credit score error:', error.message);
    if (isQuotaOrKeyError(error)) {
      return res.json(DEMO_FALLBACK.creditScore);
    }
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

// POST /api/ai/benchmarking — AI Competitive Benchmarking
app.post('/api/ai/benchmarking', async (req, res) => {
  try {
    const { businessContext } = req.body;
    const contextStr = buildBusinessContext(businessContext || {});

    const messages = [
      {
        role: 'system',
        content: `You are the NODAL AI benchmarking engine. Compare the business against industry peers and top performers.

Return ONLY valid JSON — no markdown, no code fences.

Format:
[
  { "metric": "Revenue Growth", "you": 82, "industry": 65, "top10": 95 },
  { "metric": "Profit Margin", "you": 68, "industry": 55, "top10": 88 },
  { "metric": "Inventory Turn", "you": 71, "industry": 60, "top10": 90 },
  { "metric": "Customer Retention", "you": 75, "industry": 58, "top10": 92 },
  { "metric": "Cash Cycle", "you": 60, "industry": 50, "top10": 85 },
  { "metric": "Digital Adoption", "you": 90, "industry": 40, "top10": 95 }
]

Rules:
- Return exactly 6 metrics as shown above
- All scores 0-100
- "you" scores should reflect the actual business data
- "industry" is average for similar African SMEs (typically 40-65)
- "top10" is the top 10% benchmark (typically 80-95)
- Low stock or out-of-stock items should lower Inventory Turn
- High revenue with low expenses = higher Profit Margin
- Using a digital platform at all = higher Digital Adoption

BUSINESS DATA:
${contextStr}`,
      },
      {
        role: 'user',
        content: 'Benchmark this business against 2,400+ similar SMEs and generate comparison data across 6 key metrics.',
      },
    ];

    const response = await cachedLLM(`benchmarking|${hashStr(contextStr)}`, messages, {
      temperature: 0.4,
      max_tokens: 600,
      expectJson: true,
      model: req.body.model,
    });

    const parsed = parseJsonLoose(response);
    res.json({ benchmarks: parsed });
  } catch (error) {
    console.error('Benchmarking error:', error.message);
    if (isQuotaOrKeyError(error)) {
      return res.json({ benchmarks: DEMO_FALLBACK.benchmarks, fallback: true });
    }
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

// POST /api/ai/anomalies — AI Anomaly Detection
app.post('/api/ai/anomalies', async (req, res) => {
  try {
    const { businessContext } = req.body;
    const contextStr = buildBusinessContext(businessContext || {});

    const messages = [
      {
        role: 'system',
        content: `You are the NODAL AI anomaly detection engine. Analyze business data for unusual patterns, fraud risks, and missed opportunities.

Return ONLY valid JSON — no markdown, no code fences.

Format:
[
  {
    "id": 1,
    "type": "fraud_risk|opportunity|waste|pricing",
    "severity": "high|medium|low",
    "title": "Short descriptive title",
    "description": "One sentence with specific data references",
    "timestamp": "2 hours ago",
    "action": "Short action label (2-3 words)"
  }
]

Rules:
- Generate 3-5 anomalies based on actual business data
- Reference specific product names, quantities, and amounts
- Types: fraud_risk (suspicious patterns), opportunity (growth chance), waste (inefficiency), pricing (pricing issues)
- Timestamps should be recent (1-5 hours ago)
- Action labels should be actionable verbs (e.g., "Review Transactions", "Adjust Price", "Create Promotion")
- At least one high severity item
- Look for: out-of-stock items, low margins, overdue payments, pricing gaps, slow movers
- Use South African Rand (R) for currency

BUSINESS DATA:
${contextStr}`,
      },
      {
        role: 'user',
        content: 'Scan this business data for anomalies, fraud risks, and optimization opportunities.',
      },
    ];

    const response = await cachedLLM(`anomalies|${hashStr(contextStr)}`, messages, {
      temperature: 0.5,
      max_tokens: 800,
      expectJson: true,
      model: req.body.model,
    });

    const parsed = parseJsonLoose(response);
    res.json({ anomalies: parsed });
  } catch (error) {
    console.error('Anomaly detection error:', error.message);
    if (isQuotaOrKeyError(error)) {
      return res.json({ anomalies: DEMO_FALLBACK.anomalies, fallback: true });
    }
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

// POST /api/ai/forecast — AI Demand Forecast
app.post('/api/ai/forecast', async (req, res) => {
  try {
    const { businessContext } = req.body;
    const contextStr = buildBusinessContext(businessContext || {});

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const messages = [
      {
        role: 'system',
        content: `You are the NODAL AI demand forecasting engine. Generate a 7-day revenue forecast based on business data.

Return ONLY valid JSON — no markdown, no code fences.

Format:
{
  "forecast": [
    { "day": "Mon", "actual": 4200, "predicted": 4000, "lower": 3600, "upper": 4400 },
    { "day": "Tue", "actual": 3800, "predicted": 3900, "lower": 3500, "upper": 4300 },
    { "day": "Wed", "actual": 5200, "predicted": 5000, "lower": 4600, "upper": 5400 },
    { "day": "Thu", "actual": 4800, "predicted": 4700, "lower": 4300, "upper": 5100 },
    { "day": "Fri", "actual": 6100, "predicted": 6200, "lower": 5800, "upper": 6600 },
    { "day": "Sat", "actual": null, "predicted": 7500, "lower": 6800, "upper": 8200 },
    { "day": "Sun", "actual": null, "predicted": 5800, "lower": 5200, "upper": 6400 }
  ],
  "patterns": [
    { "pattern": "Weekend sales surge", "detail": "Revenue increases 45% on Sat-Sun", "confidence": 94 },
    { "pattern": "Mid-week dip", "detail": "Tuesday-Wednesday see 20% lower traffic", "confidence": 88 },
    { "pattern": "Month-end spike", "detail": "Sales peak around payday (25th-1st)", "confidence": 91 },
    { "pattern": "Holiday effect", "detail": "Public holidays boost by 60%", "confidence": 79 }
  ],
  "reorderSuggestions": [
    { "product": "Cooking Oil (2L)", "optimal": "Reorder by Friday", "quantity": "50 units", "reason": "Weekend demand surge predicted" },
    { "product": "Premium Rice (5kg)", "optimal": "Reorder in 4 days", "quantity": "30 units", "reason": "Month-end payday approaching" },
    { "product": "Wireless Earbuds", "optimal": "Reorder next week", "quantity": "20 units", "reason": "Gradual depletion at current rate" },
    { "product": "Bottled Water", "optimal": "Defer 1 week", "quantity": "—", "reason": "Lower demand forecasted" }
  ]
}

Rules:
- Days must be: ${days.join(', ')}
- First 5 days (Mon-Fri) should have both actual and predicted values
- Last 2 days (Sat-Sun) should have actual: null (future)
- Values should be in South African Rand
- Scale revenue amounts to match the business's actual revenue data
- lower/upper define a confidence interval (±10-15% of predicted)
- Generate 3-4 seasonal patterns with confidence 70-95%
- Generate 3-4 reorder suggestions using actual product names from the data
- Reorder suggestions should reference actual low-stock or fast-moving products

BUSINESS DATA:
${contextStr}`,
      },
      {
        role: 'user',
        content: 'Generate a 7-day demand forecast with seasonal patterns and smart reorder suggestions based on this business data.',
      },
    ];

    const response = await cachedLLM(`forecast|${hashStr(contextStr)}`, messages, {
      temperature: 0.5,
      max_tokens: 1200,
      expectJson: true,
      model: req.body.model,
    });

    const parsed = parseJsonLoose(response);
    res.json(parsed);
  } catch (error) {
    console.error('Forecast error:', error.message);
    if (isQuotaOrKeyError(error)) {
      return res.json(DEMO_FALLBACK.forecast);
    }
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

// GET /api/ai/models — list selectable Gemini models + the active default
app.get('/api/ai/models', (req, res) => {
  res.json({
    default: GEMINI_MODEL,
    models: Array.from(ALLOWED_GEMINI_MODELS),
  });
});

// ================== DATA ROUTES (Huawei Cloud RDS) ==================
app.use('/api/data', dataRoutes);

// ================== IMAGE UPLOAD (Huawei Cloud OBS) ==================
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided or invalid type' });
    }
    const folder = req.body.folder || 'images';
    const result = await uploadImage(req.file.buffer, req.file.originalname, folder);
    res.json(result);
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'not configured';
  if (process.env.RDS_HOST) {
    try {
      await query('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }
  }
  res.json({
    status: 'ok',
    provider: AI_PROVIDER,
    model: AI_PROVIDER === 'ollama' ? OLLAMA_MODEL : (GEMINI_API_KEY ? `Google Gemini (${GEMINI_MODEL})` : 'not configured'),
    database: dbStatus,
    obs: process.env.OBS_AK ? 'configured' : 'not configured',
  });
});

// ================== START SERVER ==================
async function start() {
  if (AI_PROVIDER === 'ollama') {
    console.log(`\u2705 Using local Ollama model "${OLLAMA_MODEL}" at ${OLLAMA_BASE_URL}`);
  } else if (process.env.GEMINI_API_KEY) {
    console.log(`\u2705 Google Gemini configured (${GEMINI_MODEL})`);
  } else {
    console.log('\u26A0\uFE0F  No AI provider configured \u2014 set GEMINI_API_KEY or AI_PROVIDER=ollama');
  }

  // Initialize DB if configured
  if (process.env.RDS_HOST) {
    try {
      await initDatabase();
      await seedIfEmpty();
      console.log('✅ Connected to Huawei Cloud RDS (MySQL)');
    } catch (err) {
      console.error('⚠️  Database connection failed:', err.message);
      console.log('   Server will continue with AI-only features');
    }
  } else {
    console.log('ℹ️  RDS_HOST not set — database features disabled');
  }

  if (process.env.OBS_AK) {
    console.log('✅ Huawei Cloud OBS configured');
  } else {
    console.log('ℹ️  OBS_AK not set — image upload disabled');
  }

  app.listen(PORT, () => {
    console.log(`\nNODAL API server running on http://localhost:${PORT}`);
    console.log(`Using Huawei Cloud ModelArts: ${HUAWEI_API_URL}`);
  });
}

start();
