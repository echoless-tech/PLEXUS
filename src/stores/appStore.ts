import { create } from 'zustand';
import { Product, Sale, Supplier, CashFlowEntry, BusinessProfile, StockMovement } from '../types';
import { mockProducts, mockSales, mockSuppliers, mockCashFlow, mockStockMovements, mockBusinessProfile } from '../data';
import * as db from '../services/db';
import { AccentThemeKey, getStoredAccentTheme, storeAccentTheme } from '../theme/accents';
import { getStoredModel, storeModel } from '../services/ai';

interface AppState {
  // Database sync
  dbReady: boolean;
  dbError: string | null;
  loadFromDatabase: () => Promise<void>;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // AI Cache — persists across page navigations
  aiCache: Record<string, { data: any; fetchedAt: number }>;
  setAiCache: (key: string, data: any) => void;
  getAiCache: (key: string) => any | null;
  clearAiCache: (key?: string) => void;

  // Products/Inventory
  products: Product[];
  stockMovements: StockMovement[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, quantity: number, type: 'in' | 'out' | 'adjustment', reason: string) => void;

  // Sales
  sales: Sale[];
  addSale: (sale: Sale) => void;
  updateSaleStatus: (id: string, status: Sale['status']) => void;

  // Suppliers
  suppliers: Supplier[];
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;

  // Cash Flow
  cashFlow: CashFlowEntry[];
  addCashFlowEntry: (entry: CashFlowEntry) => void;

  // Business Profile
  businessProfile: BusinessProfile;
  updateBusinessProfile: (updates: Partial<BusinessProfile>) => void;

  // Dark mode
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Accent theme
  accentTheme: AccentThemeKey;
  setAccentTheme: (key: AccentThemeKey) => void;

  // AI model
  aiModel: string;
  setAiModel: (id: string) => void;

  // Notifications
  notifications: { id: string; message: string; type: 'success' | 'warning' | 'error' | 'info'; read: boolean }[];
  addNotification: (message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Transient toasts
  toasts: { id: string; message: string; type: 'success' | 'warning' | 'error' | 'info' }[];
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Database sync
  dbReady: false,
  dbError: null,
  loadFromDatabase: async () => {
    try {
      const [products, sales, suppliers, cashFlow, stockMovements, profile] = await Promise.all([
        db.fetchProducts(),
        db.fetchSales(),
        db.fetchSuppliers(),
        db.fetchCashFlow(),
        db.fetchStockMovements(),
        db.fetchBusinessProfile(),
      ]);
      set({
        products: products.length > 0 ? products : mockProducts,
        sales: sales.length > 0 ? sales : mockSales,
        suppliers: suppliers.length > 0 ? suppliers : mockSuppliers,
        cashFlow: cashFlow.length > 0 ? cashFlow : mockCashFlow,
        stockMovements: stockMovements.length > 0 ? stockMovements : mockStockMovements,
        businessProfile: profile || mockBusinessProfile,
        dbReady: true,
        dbError: null,
      });
    } catch (err: any) {
      console.warn('Database load failed, using mock data:', err.message);
      set({ dbReady: false, dbError: err.message });
    }
  },

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // AI Cache
  aiCache: {},
  setAiCache: (key, data) => set((state) => ({
    aiCache: { ...state.aiCache, [key]: { data, fetchedAt: Date.now() } },
  })),
  getAiCache: (key) => {
    const entry = get().aiCache[key];
    return entry ? entry.data : null;
  },
  clearAiCache: (key) => set((state) => {
    if (key) {
      const { [key]: _, ...rest } = state.aiCache;
      return { aiCache: rest };
    }
    return { aiCache: {} };
  }),

  // Products - initialized with mock data
  products: mockProducts,
  stockMovements: mockStockMovements,
  
  addProduct: (product) => {
    set((state) => ({ products: [...state.products, product] }));
    db.createProduct(product).catch((e) => console.error('DB sync (addProduct):', e.message));
  },
  
  updateProduct: (id, updates) => {
    set((state) => ({
      products: state.products.map((p) => 
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
    }));
    db.updateProduct(id, updates).catch((e) => console.error('DB sync (updateProduct):', e.message));
  },
  
  deleteProduct: (id) => {
    set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
    db.deleteProduct(id).catch((e) => console.error('DB sync (deleteProduct):', e.message));
  },
  
  adjustStock: (productId, quantity, type, reason) => {
    const movement: StockMovement = {
      id: crypto.randomUUID(),
      productId,
      type,
      quantity: Math.abs(quantity),
      reason,
      createdAt: new Date(),
    };
    
    set((state) => {
      const product = state.products.find((p) => p.id === productId);
      if (!product) return state;
      
      let newQuantity = product.quantity;
      if (type === 'in') newQuantity += Math.abs(quantity);
      else if (type === 'out') newQuantity -= Math.abs(quantity);
      else newQuantity = quantity;
      
      return {
        products: state.products.map((p) =>
          p.id === productId ? { ...p, quantity: Math.max(0, newQuantity), updatedAt: new Date() } : p
        ),
        stockMovements: [...state.stockMovements, movement],
      };
    });
    db.adjustStock(productId, quantity, type, reason).catch((e) => console.error('DB sync (adjustStock):', e.message));
  },

  // Sales
  sales: mockSales,
  
  addSale: (sale) => {
    set((state) => {
      const updatedProducts = state.products.map((product) => {
        const saleItem = sale.items.find((item) => item.productId === product.id);
        if (saleItem) {
          return {
            ...product,
            quantity: Math.max(0, product.quantity - saleItem.quantity),
            updatedAt: new Date(),
          };
        }
        return product;
      });
      return { sales: [...state.sales, sale], products: updatedProducts };
    });
    db.createSale(sale).catch((e) => console.error('DB sync (addSale):', e.message));
  },
  
  updateSaleStatus: (id, status) => {
    set((state) => ({ sales: state.sales.map((s) => (s.id === id ? { ...s, status } : s)) }));
    db.updateSaleStatus(id, status).catch((e) => console.error('DB sync (updateSaleStatus):', e.message));
  },

  // Suppliers
  suppliers: mockSuppliers,
  
  addSupplier: (supplier) => {
    set((state) => ({ suppliers: [...state.suppliers, supplier] }));
    db.createSupplier(supplier).catch((e) => console.error('DB sync (addSupplier):', e.message));
  },
  
  updateSupplier: (id, updates) => {
    set((state) => ({ suppliers: state.suppliers.map((s) => (s.id === id ? { ...s, ...updates } : s)) }));
    db.updateSupplier(id, updates).catch((e) => console.error('DB sync (updateSupplier):', e.message));
  },

  // Cash Flow
  cashFlow: mockCashFlow,
  
  addCashFlowEntry: (entry) => {
    set((state) => ({ cashFlow: [...state.cashFlow, entry] }));
    db.createCashFlowEntry(entry).catch((e) => console.error('DB sync (addCashFlowEntry):', e.message));
  },

  // Business Profile
  businessProfile: mockBusinessProfile,
  
  updateBusinessProfile: (updates) => {
    set((state) => ({ businessProfile: { ...state.businessProfile, ...updates } }));
    db.updateBusinessProfile(updates).catch((e) => console.error('DB sync (updateBusinessProfile):', e.message));
  },

  // Dark mode
  darkMode: false,
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  // Accent theme
  accentTheme: getStoredAccentTheme(),
  setAccentTheme: (key) => {
    storeAccentTheme(key);
    set({ accentTheme: key });
  },

  // AI model
  aiModel: getStoredModel(),
  setAiModel: (id) => {
    storeModel(id);
    set({ aiModel: id });
  },

  // Notifications
  notifications: [],
  
  addNotification: (message, type) => set((state) => ({
    notifications: [
      ...state.notifications,
      { id: crypto.randomUUID(), message, type, read: false },
    ],
  })),
  
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    ),
  })),
  
  clearNotifications: () => set({ notifications: [] }),

  // Transient toasts — auto-dismiss after a short delay
  toasts: [],

  showToast: (message, type = 'info') => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3400);
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
