import { Product, Sale, Supplier, CashFlowEntry, BusinessProfile, StockMovement } from '../types';

const API_BASE = 'http://localhost:3001';

// ================== PRODUCTS ==================

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/api/data/products`);
  if (!res.ok) throw new Error('Failed to fetch products');
  const data = await res.json();
  return data.map((p: any) => ({
    ...p,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
  }));
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/api/data/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  if (!res.ok) throw new Error('Failed to create product');
  return res.json();
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/api/data/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update product');
  return res.json();
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/data/products/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete product');
}

export async function adjustStock(
  id: string,
  quantity: number,
  type: 'in' | 'out' | 'adjustment',
  reason: string
): Promise<{ id: string; newQuantity: number }> {
  const res = await fetch(`${API_BASE}/api/data/products/${id}/adjust-stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity, type, reason }),
  });
  if (!res.ok) throw new Error('Failed to adjust stock');
  return res.json();
}

export async function fetchStockMovements(): Promise<StockMovement[]> {
  const res = await fetch(`${API_BASE}/api/data/stock-movements`);
  if (!res.ok) throw new Error('Failed to fetch stock movements');
  const data = await res.json();
  return data.map((m: any) => ({
    ...m,
    createdAt: new Date(m.createdAt),
  }));
}

// ================== SALES ==================

export async function fetchSales(): Promise<Sale[]> {
  const res = await fetch(`${API_BASE}/api/data/sales`);
  if (!res.ok) throw new Error('Failed to fetch sales');
  const data = await res.json();
  return data.map((s: any) => ({
    ...s,
    createdAt: new Date(s.createdAt),
    dueDate: s.dueDate ? new Date(s.dueDate) : undefined,
  }));
}

export async function createSale(sale: Partial<Sale>): Promise<Sale> {
  const res = await fetch(`${API_BASE}/api/data/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sale),
  });
  if (!res.ok) throw new Error('Failed to create sale');
  return res.json();
}

export async function updateSaleStatus(id: string, status: Sale['status']): Promise<void> {
  const res = await fetch(`${API_BASE}/api/data/sales/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update sale status');
}

// ================== SUPPLIERS ==================

export async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await fetch(`${API_BASE}/api/data/suppliers`);
  if (!res.ok) throw new Error('Failed to fetch suppliers');
  return res.json();
}

export async function createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
  const res = await fetch(`${API_BASE}/api/data/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(supplier),
  });
  if (!res.ok) throw new Error('Failed to create supplier');
  return res.json();
}

export async function updateSupplier(id: string, updates: Partial<Supplier>): Promise<void> {
  const res = await fetch(`${API_BASE}/api/data/suppliers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update supplier');
}

// ================== CASH FLOW ==================

export async function fetchCashFlow(): Promise<CashFlowEntry[]> {
  const res = await fetch(`${API_BASE}/api/data/cash-flow`);
  if (!res.ok) throw new Error('Failed to fetch cash flow');
  const data = await res.json();
  return data.map((e: any) => ({
    ...e,
    date: new Date(e.date),
  }));
}

export async function createCashFlowEntry(entry: Partial<CashFlowEntry>): Promise<CashFlowEntry> {
  const res = await fetch(`${API_BASE}/api/data/cash-flow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error('Failed to create cash flow entry');
  return res.json();
}

// ================== BUSINESS PROFILE ==================

export async function fetchBusinessProfile(): Promise<BusinessProfile | null> {
  const res = await fetch(`${API_BASE}/api/data/business-profile`);
  if (!res.ok) throw new Error('Failed to fetch business profile');
  return res.json();
}

export async function updateBusinessProfile(updates: Partial<BusinessProfile>): Promise<void> {
  const res = await fetch(`${API_BASE}/api/data/business-profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update business profile');
}

// ================== IMAGE UPLOAD ==================

export async function uploadImage(file: File, folder: string = 'products'): Promise<{ key: string; url: string }> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload image');
  return res.json();
}

// ================== HEALTH CHECK ==================

export async function checkHealth(): Promise<{
  status: string;
  model: string;
  database: string;
  obs: string;
}> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}
