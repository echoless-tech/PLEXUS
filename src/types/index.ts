// Product & Inventory Types
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  price: number;
  costPrice: number;
  unit: string;
  imageUrl?: string;
  supplierId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export interface StockMovement {
  id: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  reference?: string;
  createdAt: Date;
}

// Sales & Invoice Types
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile' | 'credit';
  status: 'paid' | 'pending' | 'overdue';
  createdAt: Date;
  dueDate?: Date;
}

// Supplier Types
export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  productsSupplied: string[];
  lastOrderDate?: Date;
  rating: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: { productId: string; productName: string; quantity: number; unitCost: number }[];
  total: number;
  status: 'draft' | 'sent' | 'confirmed' | 'delivered';
  createdAt: Date;
  expectedDelivery?: Date;
}

// Cash Flow Types
export interface CashFlowEntry {
  id: string;
  date: Date;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  reference?: string;
}

export interface DailySummary {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

// Storefront Types
export interface BusinessProfile {
  name: string;
  tagline: string;
  description: string;
  logo?: string;
  coverImage?: string;
  phone: string;
  email: string;
  address: string;
  socialLinks?: {
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
  };
}

// Dashboard Types
export interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  activeProducts: number;
  pendingOrders: number;
  lowStockAlerts: number;
}
