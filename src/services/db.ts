import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';
import { takePendingBusinessName } from './auth';
import { Product, Sale, Supplier, CashFlowEntry, BusinessProfile, StockMovement } from '../types';
import {
  mockProducts,
  mockSales,
  mockSuppliers,
  mockCashFlow,
  mockStockMovements,
  mockBusinessProfile,
} from '../data';

// ─── Helpers ─────────────────────────────────────────────────────────

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return uid;
}

const userDoc = () => doc(db, 'users', requireUid());
const col = (name: string) => collection(db, 'users', requireUid(), name);

/** Firestore Timestamp | ISO string | Date → Date */
function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date();
}

/**
 * Firestore rejects `undefined` values — strip them (recursively). The
 * top-level `id` is dropped too (the document key already carries it), but
 * nested ids (e.g. catalogue snapshots) are preserved. Dates pass through
 * untouched (the SDK converts them to Timestamps).
 */
function clean<T extends Record<string, any>>(obj: T, stripId = true): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || (stripId && k === 'id')) continue;
    if (v instanceof Date || v instanceof Timestamp) out[k] = v;
    else if (Array.isArray(v)) out[k] = v.map((x) => (x && typeof x === 'object' ? clean(x, false) : x));
    else if (v && typeof v === 'object') out[k] = clean(v, false);
    else out[k] = v;
  }
  return out;
}

const newId = () => crypto.randomUUID();

// ─── Seeding ─────────────────────────────────────────────────────────
// First sign-in gets a fully populated workspace (sample data) so every
// screen works immediately. Guarded by a `seeded` flag on the user doc so
// deleting data later never re-seeds.

export async function ensureSeeded(businessName?: string | null): Promise<boolean> {
  const uid = requireUid();
  const root = await getDoc(userDoc());
  if (root.exists() && root.data()?.seeded) return false;

  const name = businessName || takePendingBusinessName() || auth.currentUser?.displayName;

  const batch = writeBatch(db);
  const put = (colName: string, items: { id: string }[]) => {
    for (const item of items) {
      batch.set(doc(db, 'users', uid, colName, item.id), clean(item));
    }
  };

  put('products', mockProducts);
  put('sales', mockSales);
  put('suppliers', mockSuppliers);
  put('cashflow', mockCashFlow);
  put('stockMovements', mockStockMovements);

  batch.set(userDoc(), {
    seeded: true,
    createdAt: new Date(),
    businessProfile: clean({
      ...mockBusinessProfile,
      ...(name ? { name } : {}),
    }),
  });

  await batch.commit();
  return true;
}

// ─── Products ────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  const snap = await getDocs(col('products'));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as Product;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const id = product.id || newId();
  const now = new Date();
  const full: Product = {
    sku: '',
    name: '',
    description: '',
    category: '',
    quantity: 0,
    reorderLevel: 10,
    price: 0,
    costPrice: 0,
    unit: 'piece',
    ...product,
    id,
    createdAt: product.createdAt || now,
    updatedAt: now,
  };
  await setDoc(doc(col('products'), id), clean(full));
  return full;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  await updateDoc(doc(col('products'), id), { ...clean(updates), updatedAt: new Date() });
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(col('products'), id));
}

export async function adjustStock(
  id: string,
  quantity: number,
  type: 'in' | 'out' | 'adjustment',
  reason: string
): Promise<{ id: string; newQuantity: number }> {
  const productRef = doc(col('products'), id);
  const movementRef = doc(col('stockMovements'), newId());

  const newQuantity = await runTransaction(db, async (tx) => {
    const snap = await tx.get(productRef);
    if (!snap.exists()) throw new Error('Product not found');
    const current = (snap.data().quantity as number) || 0;
    const absQty = Math.abs(quantity);
    let next = current;
    if (type === 'in') next = current + absQty;
    else if (type === 'out') next = current - absQty;
    else next = quantity; // adjustment sets exact value
    next = Math.max(0, next);

    tx.update(productRef, { quantity: next, updatedAt: new Date() });
    tx.set(movementRef, clean({
      productId: id,
      type,
      quantity: absQty,
      reason,
      createdAt: new Date(),
    }));
    return next;
  });

  return { id, newQuantity };
}

export async function fetchStockMovements(): Promise<StockMovement[]> {
  const snap = await getDocs(col('stockMovements'));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return { ...data, id: d.id, createdAt: toDate(data.createdAt) } as StockMovement;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ─── Sales ───────────────────────────────────────────────────────────

export async function fetchSales(): Promise<Sale[]> {
  const snap = await getDocs(col('sales'));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: toDate(data.createdAt),
        dueDate: data.dueDate ? toDate(data.dueDate) : undefined,
      } as Sale;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createSale(sale: Partial<Sale>): Promise<Sale> {
  const uid = requireUid();
  const id = sale.id || newId();
  const full: Sale = {
    invoiceNumber: '',
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    paymentMethod: 'cash',
    status: 'pending',
    ...sale,
    id,
    createdAt: sale.createdAt || new Date(),
  };

  // Atomically write the sale and decrement stock for each line item.
  await runTransaction(db, async (tx) => {
    const items = full.items || [];
    const productRefs = items.map((i) => doc(db, 'users', uid, 'products', i.productId));
    const snaps = await Promise.all(productRefs.map((r) => tx.get(r)));

    tx.set(doc(db, 'users', uid, 'sales', id), clean(full));

    snaps.forEach((snap, i) => {
      if (!snap.exists()) return; // product may have been deleted — skip
      const current = (snap.data().quantity as number) || 0;
      tx.update(productRefs[i], {
        quantity: Math.max(0, current - items[i].quantity),
        updatedAt: new Date(),
      });
    });
  });

  return full;
}

export async function updateSaleStatus(id: string, status: Sale['status']): Promise<void> {
  await updateDoc(doc(col('sales'), id), { status });
}

// ─── Suppliers ───────────────────────────────────────────────────────

export async function fetchSuppliers(): Promise<Supplier[]> {
  const snap = await getDocs(col('suppliers'));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        lastOrderDate: data.lastOrderDate ? toDate(data.lastOrderDate) : undefined,
      } as Supplier;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
  const id = supplier.id || newId();
  const full: Supplier = {
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    productsSupplied: [],
    rating: 0,
    ...supplier,
    id,
  };
  await setDoc(doc(col('suppliers'), id), clean(full));
  return full;
}

export async function updateSupplier(id: string, updates: Partial<Supplier>): Promise<void> {
  await updateDoc(doc(col('suppliers'), id), clean(updates));
}

// ─── Cash flow ───────────────────────────────────────────────────────

export async function fetchCashFlow(): Promise<CashFlowEntry[]> {
  const snap = await getDocs(col('cashflow'));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return { ...data, id: d.id, date: toDate(data.date) } as CashFlowEntry;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function createCashFlowEntry(entry: Partial<CashFlowEntry>): Promise<CashFlowEntry> {
  const id = entry.id || newId();
  const full: CashFlowEntry = {
    date: new Date(),
    type: 'income',
    category: '',
    description: '',
    amount: 0,
    ...entry,
    id,
  };
  await setDoc(doc(col('cashflow'), id), clean(full));
  return full;
}

// ─── Business profile ────────────────────────────────────────────────

export async function fetchBusinessProfile(): Promise<BusinessProfile | null> {
  const snap = await getDoc(userDoc());
  if (!snap.exists()) return null;
  return (snap.data().businessProfile as BusinessProfile) || null;
}

export async function updateBusinessProfile(updates: Partial<BusinessProfile>): Promise<void> {
  await setDoc(userDoc(), { businessProfile: clean(updates) }, { merge: true });
}

// ─── Public storefront ───────────────────────────────────────────────
// A published snapshot of the business profile + in-stock catalogue,
// stored at storefronts/{slug}. Publicly readable (that is the point of
// a store link); writable only by its owner. Publishing is always an
// explicit user action.

export interface PublicStorefrontProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  imageUrl?: string;
}

export interface PublicStorefront {
  ownerUid: string;
  name: string;
  tagline: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  socialLinks?: BusinessProfile['socialLinks'];
  products: PublicStorefrontProduct[];
  publishedAt: Date;
  updatedAt: Date;
}

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || 'store';
}

export async function getStorefrontSlug(): Promise<string | null> {
  const snap = await getDoc(userDoc());
  return snap.exists() ? ((snap.data().storefrontSlug as string) ?? null) : null;
}

/**
 * Publish (or refresh) the public storefront. Returns the slug.
 * Slugs are first-come-first-served; on a claim conflict we retry once
 * with a uid-suffixed slug. Once claimed, a store keeps its slug so
 * shared links never break.
 */
export async function publishStorefront(
  profile: BusinessProfile,
  products: Product[],
): Promise<string> {
  const uid = requireUid();
  const existing = await getStorefrontSlug();

  const payload = () =>
    clean({
      ownerUid: uid,
      name: profile.name,
      tagline: profile.tagline || '',
      description: profile.description || '',
      phone: profile.phone || '',
      email: profile.email || '',
      address: profile.address || '',
      ...(profile.socialLinks ? { socialLinks: profile.socialLinks } : {}),
      products: products
        .filter((p) => p.quantity > 0)
        .slice(0, 200)
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          category: p.category || '',
          price: p.price,
          unit: p.unit || '',
          quantity: p.quantity,
          // Keep hosted images only — base64 blobs would blow the 1MB doc cap.
          ...(p.imageUrl && /^https?:\/\//.test(p.imageUrl) && p.imageUrl.length <= 500
            ? { imageUrl: p.imageUrl }
            : {}),
        })),
      publishedAt: new Date(),
      updatedAt: new Date(),
    });

  const tryWrite = async (slug: string) => {
    await setDoc(doc(db, 'storefronts', slug), payload());
    return slug;
  };

  let slug = existing || slugify(profile.name);
  try {
    slug = await tryWrite(slug);
  } catch (err: any) {
    // Slug already claimed by another store — fall back to a unique one.
    if (err?.code === 'permission-denied') {
      slug = await tryWrite(`${slugify(profile.name)}-${uid.slice(0, 6)}`);
    } else {
      throw err;
    }
  }

  await setDoc(userDoc(), { storefrontSlug: slug }, { merge: true });
  return slug;
}

/** Public read — works without being signed in. */
export async function fetchPublicStorefront(slug: string): Promise<PublicStorefront | null> {
  const snap = await getDoc(doc(db, 'storefronts', slug));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    publishedAt: toDate(data.publishedAt),
    updatedAt: toDate(data.updatedAt),
  } as PublicStorefront;
}
