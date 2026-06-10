const API_BASE = 'http://localhost:3001';

// ===== AI model selection =====
export interface GeminiModelOption {
  id: string;
  label: string;
  description: string;
}

// Models the user can pick from in Settings. Flash models are fast + cheap
// (ideal for the demo); Pro models are higher quality but use more tokens.
export const GEMINI_MODELS: GeminiModelOption[] = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Fast & efficient — recommended for demos' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite', description: 'Lowest cost, snappiest responses' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Newer, smarter, still fast' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Highest quality — uses more tokens' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Reliable legacy fast model' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Legacy high-quality model' },
];

export const DEFAULT_MODEL = 'gemini-2.0-flash';
const MODEL_STORAGE_KEY = 'nodal-ai-model';

export function getStoredModel(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_MODEL;
  const stored = localStorage.getItem(MODEL_STORAGE_KEY);
  return stored && GEMINI_MODELS.some((m) => m.id === stored) ? stored : DEFAULT_MODEL;
}

export function storeModel(id: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(MODEL_STORAGE_KEY, id);
}

export interface ChatMessage {
  text: string;
  sender: 'user' | 'ai';
}

export interface BusinessContext {
  products?: Array<{
    name: string;
    category: string;
    quantity: number;
    reorderLevel: number;
    price: number;
    costPrice: number;
  }>;
  sales?: Array<{
    total: number;
    status: string;
    items: Array<{ productName: string; quantity: number }>;
  }>;
  cashFlow?: Array<{
    type: string;
    amount: number;
    category: string;
  }>;
  businessProfile?: {
    name: string;
    tagline: string;
  };
}

export interface AIRecommendation {
  id: number;
  category: string;
  title: string;
  impact: string;
  confidence: number;
  basis: string;
}

export interface AIInsight {
  type: 'prediction' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  confidence?: number;
}

export interface CreditScoreFactor {
  name: string;
  score: number;
  weight: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PreQualifiedOffer {
  type: string;
  amount: string;
  rate: string;
  provider: string;
}

export interface CreditScoreData {
  score: number;
  maxScore: number;
  grade: string;
  factors: CreditScoreFactor[];
  preQualified: PreQualifiedOffer[];
}

export interface BenchmarkData {
  metric: string;
  you: number;
  industry: number;
  top10: number;
}

export interface AnomalyData {
  id: number;
  type: 'fraud_risk' | 'opportunity' | 'waste' | 'pricing';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: string;
  action: string;
}

export interface ForecastDay {
  day: string;
  actual: number | null;
  predicted: number;
  lower: number;
  upper: number;
}

export interface SeasonalPattern {
  pattern: string;
  detail: string;
  confidence: number;
}

export interface ReorderSuggestion {
  product: string;
  optimal: string;
  quantity: string;
  reason: string;
}

export interface ForecastData {
  forecast: ForecastDay[];
  patterns: SeasonalPattern[];
  reorderSuggestions: ReorderSuggestion[];
}

export async function chatWithCoach(
  message: string,
  history: ChatMessage[],
  businessContext: BusinessContext,
  page?: string
): Promise<string> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, businessContext, page, model: getStoredModel() }),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status}`);
  }

  const data = await response.json();
  return data.response;
}

export async function getRecommendations(
  businessContext: BusinessContext
): Promise<AIRecommendation[]> {
  const response = await fetch(`${API_BASE}/api/ai/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessContext, model: getStoredModel() }),
  });

  if (!response.ok) {
    throw new Error(`Recommendations API error: ${response.status}`);
  }

  const data = await response.json();
  return data.recommendations;
}

export async function getInsights(
  page: string,
  businessContext: BusinessContext
): Promise<AIInsight[]> {
  const response = await fetch(`${API_BASE}/api/ai/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessContext, page, model: getStoredModel() }),
  });

  if (!response.ok) {
    throw new Error(`Insights API error: ${response.status}`);
  }

  const data = await response.json();
  return data.insights;
}

export async function getCreditScore(
  businessContext: BusinessContext
): Promise<CreditScoreData> {
  const response = await fetch(`${API_BASE}/api/ai/credit-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessContext, model: getStoredModel() }),
  });

  if (!response.ok) {
    throw new Error(`Credit Score API error: ${response.status}`);
  }

  return await response.json();
}

export async function getBenchmarking(
  businessContext: BusinessContext
): Promise<BenchmarkData[]> {
  const response = await fetch(`${API_BASE}/api/ai/benchmarking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessContext, model: getStoredModel() }),
  });

  if (!response.ok) {
    throw new Error(`Benchmarking API error: ${response.status}`);
  }

  const data = await response.json();
  return data.benchmarks;
}

export async function getAnomalies(
  businessContext: BusinessContext
): Promise<AnomalyData[]> {
  const response = await fetch(`${API_BASE}/api/ai/anomalies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessContext, model: getStoredModel() }),
  });

  if (!response.ok) {
    throw new Error(`Anomalies API error: ${response.status}`);
  }

  const data = await response.json();
  return data.anomalies;
}

export async function getForecast(
  businessContext: BusinessContext
): Promise<ForecastData> {
  const response = await fetch(`${API_BASE}/api/ai/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessContext, model: getStoredModel() }),
  });

  if (!response.ok) {
    throw new Error(`Forecast API error: ${response.status}`);
  }

  return await response.json();
}

export async function getBannerInsights(
  page: string,
  businessContext: BusinessContext
): Promise<string[]> {
  const response = await fetch(`${API_BASE}/api/ai/banner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessContext, page, model: getStoredModel() }),
  });

  if (!response.ok) {
    throw new Error(`Banner API error: ${response.status}`);
  }

  const data = await response.json();
  return data.insights;
}

export function buildBusinessContext(store: {
  products: any[];
  sales: any[];
  cashFlow: any[];
  businessProfile: any;
}): BusinessContext {
  return {
    products: store.products.map(p => ({
      name: p.name,
      category: p.category,
      quantity: p.quantity,
      reorderLevel: p.reorderLevel,
      price: p.price,
      costPrice: p.costPrice,
    })),
    sales: store.sales.map(s => ({
      total: s.total,
      status: s.status,
      items: s.items.map((i: any) => ({
        productName: i.productName,
        quantity: i.quantity,
      })),
    })),
    cashFlow: store.cashFlow.map(c => ({
      type: c.type,
      amount: c.amount,
      category: c.category,
    })),
    businessProfile: {
      name: store.businessProfile.name,
      tagline: store.businessProfile.tagline,
    },
  };
}
