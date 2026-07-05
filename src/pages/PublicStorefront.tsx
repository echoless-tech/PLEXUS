import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  BadgeCheck,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { fetchPublicStorefront, PublicStorefront as StoreData, PublicStorefrontProduct } from '../services/db';

const zar = (amount: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0 }).format(amount);

// Category imagery — warm, real-feeling product photos.
const CATEGORY_IMAGES: Record<string, string[]> = {
  Electronics: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&h=400&fit=crop',
  ],
  Groceries: [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=400&fit=crop',
  ],
  Beverages: [
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400&h=400&fit=crop',
  ],
  'Personal Care': [
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop',
  ],
  Household: [
    'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop',
  ],
  Stationery: [
    'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&h=400&fit=crop',
  ],
};

const productImage = (p: PublicStorefrontProduct) => {
  if (p.imageUrl) return p.imageUrl;
  const pool = CATEGORY_IMAGES[p.category] || CATEGORY_IMAGES.Electronics;
  return pool[p.name.length % pool.length];
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'S';

const digitsOf = (v?: string) => (v || '').replace(/\D/g, '');

const PublicStorefront: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = slug ? await fetchPublicStorefront(slug) : null;
        if (cancelled) return;
        setStore(data);
        setStatus(data ? 'ready' : 'missing');
      } catch {
        if (!cancelled) setStatus('missing');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (store) document.title = `${store.name} — NODAL Storefront`;
    return () => {
      document.title = 'NODAL';
    };
  }, [store]);

  const categories = useMemo(() => {
    const set = new Set((store?.products || []).map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [store]);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (store?.products || []).filter(
      (p) =>
        (category === 'All' || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
    );
  }, [store, query, category]);

  const cartItems = useMemo(() => {
    if (!store) return [];
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = store.products.find((p) => p.id === id);
        return product ? { product, qty } : null;
      })
      .filter((x): x is { product: PublicStorefrontProduct; qty: number } => !!x);
  }, [cart, store]);

  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.qty * i.product.price, 0);

  const addToCart = (p: PublicStorefrontProduct, delta: number) =>
    setCart((prev) => {
      const next = Math.max(0, Math.min(p.quantity, (prev[p.id] || 0) + delta));
      const out = { ...prev };
      if (next === 0) delete out[p.id];
      else out[p.id] = next;
      return out;
    });

  const whatsappDigits = digitsOf(store?.socialLinks?.whatsapp) || digitsOf(store?.phone);

  const placeOrder = () => {
    if (!store || cartItems.length === 0) return;
    const lines = cartItems.map((i) => `${i.qty}× ${i.product.name} — ${zar(i.qty * i.product.price)}`);
    const message = `Hi ${store.name}! I'd like to order:\n\n${lines.join('\n')}\n\nTotal: ${zar(cartTotal)}\n\n(sent from your NODAL storefront)`;
    if (whatsappDigits) {
      window.open(`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`, '_blank');
    } else if (store.email) {
      window.location.href = `mailto:${store.email}?subject=${encodeURIComponent(`Order from ${store.name} storefront`)}&body=${encodeURIComponent(message)}`;
    }
  };

  if (status === 'loading') {
    return (
      <div className="nodal-root flex min-h-screen items-center justify-center bg-canvas text-ink">
        <div className="text-center">
          <p className="animate-pulse text-[1.5rem] font-extrabold tracking-[-0.03em]">
            NODAL<span className="text-accent">.</span>
          </p>
          <p className="mt-2 text-[0.875rem] text-muted">Opening storefront…</p>
        </div>
      </div>
    );
  }

  if (status === 'missing' || !store) {
    return (
      <div className="nodal-root flex min-h-screen items-center justify-center bg-canvas px-6 text-ink">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Store className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-[1.5rem] font-bold tracking-[-0.02em]">Store not found</h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            This storefront doesn't exist or hasn't been published yet. Ask the owner to share their link again.
          </p>
          <p className="mt-8 text-[0.8125rem] text-faint">
            Powered by <span className="font-extrabold text-ink">NODAL<span className="text-accent">.</span></span>
          </p>
        </div>
      </div>
    );
  }

  const updatedLabel = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short' }).format(store.updatedAt);

  return (
    <div className="nodal-root min-h-screen bg-canvas pb-28 text-ink">
      {/* Sticky glass header */}
      <header className="glass-strong sticky top-0 z-40 border-b border-hairline">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[0.75rem] font-bold text-accent-contrast">
              {initials(store.name)}
            </span>
            <p className="truncate text-[0.9375rem] font-semibold">{store.name}</p>
          </div>
          <p className="hidden shrink-0 text-[0.8125rem] font-medium text-faint sm:block">
            Powered by <span className="font-extrabold text-ink">NODAL<span className="text-accent">.</span></span>
          </p>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="h-44 bg-gradient-to-br from-[#bb5a3c] via-[#96492e] to-[#211d17] sm:h-56">
          <div
            className="h-full w-full opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 40%, rgba(255,255,255,0.35) 0, transparent 32%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.25) 0, transparent 40%), radial-gradient(circle at 60% 90%, rgba(255,255,255,0.2) 0, transparent 36%)',
            }}
          />
        </div>
        <div className="mx-auto max-w-5xl px-4">
          <div className="relative -mt-14 rounded-[var(--radius-tile-lg)] bg-surface p-6 shadow-[var(--lift-raised)] sm:-mt-16 sm:p-8">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
              <span className="-mt-16 flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#bb5a3c] to-[#7d3c26] text-[2rem] font-extrabold text-accent-contrast shadow-[var(--lift-raised)] ring-4 ring-surface sm:-mt-20 sm:h-28 sm:w-28">
                {initials(store.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.02em] sm:text-[2rem]">
                    {store.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-accent">
                    <BadgeCheck className="h-3.5 w-3.5" /> NODAL Store
                  </span>
                </div>
                {store.tagline && <p className="mt-1 text-[1rem] text-muted">{store.tagline}</p>}
                {store.description && (
                  <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">{store.description}</p>
                )}

                {/* Contact actions */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {whatsappDigits && (
                    <a
                      href={`https://wa.me/${whatsappDigits}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[0.875rem] font-semibold text-accent-contrast shadow-[var(--lift-raised-sm)] transition-transform hover:scale-[1.02]"
                    >
                      <Send className="h-4 w-4" /> WhatsApp us
                    </a>
                  )}
                  {store.phone && (
                    <a
                      href={`tel:${store.phone.replace(/\s/g, '')}`}
                      className="inline-flex items-center gap-2 rounded-full bg-surface-inset px-4 py-2 text-[0.875rem] font-semibold text-ink transition-colors hover:bg-surface-inset/70"
                    >
                      <Phone className="h-4 w-4" /> Call
                    </a>
                  )}
                  {store.email && (
                    <a
                      href={`mailto:${store.email}`}
                      className="inline-flex items-center gap-2 rounded-full bg-surface-inset px-4 py-2 text-[0.875rem] font-semibold text-ink transition-colors hover:bg-surface-inset/70"
                    >
                      <Mail className="h-4 w-4" /> Email
                    </a>
                  )}
                  {store.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-surface-inset px-4 py-2 text-[0.875rem] font-semibold text-ink transition-colors hover:bg-surface-inset/70"
                    >
                      <MapPin className="h-4 w-4" /> Directions
                    </a>
                  )}
                  {store.socialLinks?.instagram && (
                    <a
                      href={`https://instagram.com/${store.socialLinks.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Instagram"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-inset text-ink transition-colors hover:bg-surface-inset/70"
                    >
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                  {store.socialLinks?.facebook && (
                    <a
                      href={`https://facebook.com/${store.socialLinks.facebook}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Facebook"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-inset text-ink transition-colors hover:bg-surface-inset/70"
                    >
                      <Facebook className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-hairline pt-5">
              <div className="text-center sm:text-left">
                <p className="text-[1.25rem] font-bold">{store.products.length}</p>
                <p className="text-[0.75rem] font-medium uppercase tracking-[var(--tracking-label)] text-faint">Products</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[1.25rem] font-bold">{categories.length - 1}</p>
                <p className="text-[0.75rem] font-medium uppercase tracking-[var(--tracking-label)] text-faint">Categories</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[1.25rem] font-bold">{updatedLabel}</p>
                <p className="text-[0.75rem] font-medium uppercase tracking-[var(--tracking-label)] text-faint">Updated</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalogue */}
      <main className="mx-auto max-w-5xl px-4">
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[1.25rem] font-bold tracking-[-0.01em]">Browse products</h2>
          <div className="flex items-center gap-2 rounded-full bg-surface px-4 py-2.5 shadow-[var(--lift-raised-sm)]">
            <Search className="h-4 w-4 shrink-0 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search this store…"
              className="w-full min-w-0 bg-transparent text-[0.875rem] text-ink outline-none placeholder:text-faint sm:w-52"
            />
          </div>
        </div>

        {categories.length > 2 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
                  category === c
                    ? 'bg-ink text-canvas'
                    : 'bg-surface text-muted shadow-[var(--lift-raised-sm)] hover:text-ink'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {visibleProducts.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-tile)] bg-surface p-10 text-center shadow-[var(--lift-raised-sm)]">
            <Package className="mx-auto h-8 w-8 text-faint" />
            <p className="mt-3 text-[0.9375rem] font-medium text-muted">No products match your search.</p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {visibleProducts.map((p) => {
              const inCart = cart[p.id] || 0;
              const low = p.quantity <= 5;
              return (
                <div
                  key={p.id}
                  className="group flex flex-col overflow-hidden rounded-[var(--radius-tile)] bg-surface shadow-[var(--lift-raised-sm)] transition-shadow hover:shadow-[var(--lift-hover)]"
                >
                  <div className="relative aspect-square overflow-hidden bg-surface-inset">
                    <img
                      src={productImage(p)}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-glass-strong px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-ink backdrop-blur">
                      {p.category || 'General'}
                    </span>
                    {low && (
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-negative px-2.5 py-1 text-[0.625rem] font-bold text-white">
                        Only {p.quantity} left
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3.5">
                    <p className="line-clamp-1 text-[0.9375rem] font-semibold">{p.name}</p>
                    {p.description && <p className="mt-0.5 line-clamp-2 text-[0.75rem] leading-snug text-faint">{p.description}</p>}
                    <div className="mt-auto flex items-end justify-between pt-3">
                      <div>
                        <p className="text-[1.0625rem] font-bold tracking-[-0.01em]">{zar(p.price)}</p>
                        {p.unit && <p className="text-[0.6875rem] text-faint">per {p.unit}</p>}
                      </div>
                      {inCart === 0 ? (
                        <button
                          onClick={() => addToCart(p, 1)}
                          aria-label={`Add ${p.name} to order`}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-contrast shadow-[var(--lift-raised-sm)] transition-transform hover:scale-105 active:scale-95"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 rounded-full bg-surface-inset p-1">
                          <button
                            onClick={() => addToCart(p, -1)}
                            aria-label={`Remove one ${p.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-ink shadow-[var(--lift-raised-sm)]"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-[0.875rem] font-bold">{inCart}</span>
                          <button
                            onClick={() => addToCart(p, 1)}
                            aria-label={`Add one ${p.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-contrast shadow-[var(--lift-raised-sm)]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-14 border-t border-hairline pb-10 pt-8 text-center">
          <p className="text-[0.9375rem] font-extrabold tracking-[-0.02em]">
            NODAL<span className="text-accent">.</span>
          </p>
          <p className="mt-1 text-[0.8125rem] text-faint">
            This storefront was auto-generated from live inventory. Your business, one node at a time.
          </p>
        </footer>
      </main>

      {/* Floating order bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl">
          <div className="glass-strong flex items-center justify-between gap-3 rounded-full py-2 pl-5 pr-2 shadow-[var(--lift-hover)]">
            <div className="flex min-w-0 items-center gap-2.5">
              <ShoppingBag className="h-4.5 w-4.5 shrink-0 text-accent" />
              <p className="truncate text-[0.875rem] font-semibold">
                {cartCount} {cartCount === 1 ? 'item' : 'items'} · {zar(cartTotal)}
              </p>
            </div>
            <button
              onClick={placeOrder}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[0.875rem] font-semibold text-accent-contrast shadow-[var(--lift-raised-sm)] transition-transform hover:scale-[1.02] active:scale-95"
            >
              <Send className="h-4 w-4" />
              {whatsappDigits ? 'Order on WhatsApp' : 'Send order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicStorefront;
