import React, { useState, useMemo } from 'react';
import {
  Button as MuiButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select as MuiSelect,
  MenuItem,
  Grid,
  Drawer,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs as MuiTabs,
  Tab as MuiTab,
  IconButton,
  Chip,
  Box,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { Plus, Download, Pencil, Trash2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useAppStore } from '../stores/appStore';
import { getStockStatus } from '../data';
import { downloadCSV } from '../lib/export';
import { Product } from '../types';
import {
  PageHeader,
  Tile,
  Metric,
  Label,
  SearchField,
  Select,
  StatusDot,
  Badge,
  Button,
  GhostButton,
} from '../components/ui';

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  quantity: z.number().min(0, 'Quantity must be positive'),
  reorderLevel: z.number().min(0, 'Reorder level must be positive'),
  price: z.number().min(0, 'Price must be positive'),
  costPrice: z.number().min(0, 'Cost price must be positive'),
  unit: z.string().min(1, 'Unit is required'),
});

type ProductFormData = z.infer<typeof productSchema>;

const categories = ['Electronics', 'Groceries', 'Beverages', 'Personal Care', 'Household', 'Stationery'];
const units = ['piece', 'box', 'pack', 'bottle', 'bag', 'kg', 'liter'];

const categoryImages: Record<string, string> = {
  Electronics: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=100&h=100&fit=crop',
  Groceries: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
  Beverages: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=100&h=100&fit=crop',
  'Personal Care': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=100&h=100&fit=crop',
  Household: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=100&h=100&fit=crop',
  Stationery: 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=100&h=100&fit=crop',
};

const getProductImage = (category: string, productName: string): string => {
  const hash = productName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variation = hash % 10;
  const categoryVariations: Record<string, string[]> = {
    Electronics: [
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=100&h=100&fit=crop',
    ],
    Groceries: [
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=100&h=100&fit=crop',
    ],
    Beverages: [
      'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1523371054106-bbf80586c38c?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1625865636928-245a31a5e3b4?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=100&h=100&fit=crop',
    ],
    'Personal Care': [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1570194065650-d99fb4d8a609?w=100&h=100&fit=crop',
    ],
    Household: [
      'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=100&h=100&fit=crop',
    ],
    Stationery: [
      'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1568871712393-b8e0c2ffb7ee?w=100&h=100&fit=crop',
    ],
  };
  const images = categoryVariations[category] || [
    categoryImages[category] || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=100&h=100&fit=crop',
  ];
  return images[variation % images.length];
};

const zar = (amount: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0 }).format(amount);

const statusTone = { 'in-stock': 'positive', 'low-stock': 'critical', 'out-of-stock': 'muted' } as const;
const statusLabel = { 'in-stock': 'In stock', 'low-stock': 'Low stock', 'out-of-stock': 'Out of stock' };

const Inventory: React.FC = () => {
  const { products, stockMovements, addProduct, deleteProduct, adjustStock } = useAppStore();
  const showToast = useAppStore((s) => s.showToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerTab, setDrawerTab] = useState(0);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out'>('in');
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      name: '',
      description: '',
      category: '',
      quantity: 0,
      reorderLevel: 10,
      price: 0,
      costPrice: 0,
      unit: 'piece',
    },
  });

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const status = getStockStatus(product.quantity, product.reorderLevel);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  const handleAddProduct = (data: ProductFormData) => {
    const newProduct: Product = {
      id: crypto.randomUUID(),
      ...data,
      description: data.description || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addProduct(newProduct);
    setAddDialogOpen(false);
    reset();
  };

  const handleExport = () => {
    const rows = filteredProducts.map((p) => ({
      SKU: p.sku,
      Name: p.name,
      Category: p.category,
      Quantity: p.quantity,
      'Reorder level': p.reorderLevel,
      'Cost price': p.costPrice,
      Price: p.price,
      Status: getStockStatus(p.quantity, p.reorderLevel),
    }));
    if (!rows.length) {
      showToast('Nothing to export — no products match your filters.', 'warning');
      return;
    }
    downloadCSV(`nodal-inventory-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showToast(`Exported ${rows.length} product${rows.length > 1 ? 's' : ''} to CSV.`, 'success');
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setEditDrawerOpen(true);
    setDrawerTab(0);
  };

  const handleAdjustStock = () => {
    if (selectedProduct && adjustmentQty > 0 && adjustmentReason) {
      adjustStock(selectedProduct.id, adjustmentQty, adjustmentType, adjustmentReason);
      setAdjustDialogOpen(false);
      setAdjustmentQty(0);
      setAdjustmentReason('');
    }
  };

  const productMovements = useMemo(() => {
    if (!selectedProduct) return [];
    return stockMovements
      .filter((m) => m.productId === selectedProduct.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedProduct, stockMovements]);

  const totalProducts = products.length;
  const inStockCount = products.filter((p) => getStockStatus(p.quantity, p.reorderLevel) === 'in-stock').length;
  const lowStockCount = products.filter((p) => getStockStatus(p.quantity, p.reorderLevel) === 'low-stock').length;
  const outOfStockCount = products.filter((p) => getStockStatus(p.quantity, p.reorderLevel) === 'out-of-stock').length;
  const totalValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Inventory Intelligence"
        title="Inventory"
        subtitle="Track products, manage stock levels, and keep capital working."
        actions={
          <>
            <GhostButton pill onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </GhostButton>
            <Button variant="accent" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Add product
            </Button>
          </>
        }
      />

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:auto-rows-[140px]">
        <Metric label="Total products" value={totalProducts} accent />
        <Metric label="In stock" value={inStockCount} hint="healthy" />
        <Metric label="Low / Out" value={`${lowStockCount} / ${outOfStockCount}`} critical={lowStockCount + outOfStockCount > 0} hint="need attention" />
        <Metric label="Stock value" value={zar(totalValue)} />
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SearchField
          placeholder="Search products or SKU…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          containerClassName="min-w-[260px] flex-1"
        />
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All status</option>
          <option value="in-stock">In stock</option>
          <option value="low-stock">Low stock</option>
          <option value="out-of-stock">Out of stock</option>
        </Select>
      </div>

      {/* Product table */}
      <Tile flush className="mt-4 overflow-hidden">
        <div className="overflow-x-auto nodal-scroll">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr>
                {['Product', 'SKU', 'Stock', 'Reorder', 'Price', 'Status', ''].map((h, i) => (
                  <th
                    key={h + i}
                    className={`px-5 py-3.5 text-[0.6875rem] font-semibold uppercase tracking-[var(--tracking-label)] text-faint ${
                      ['Stock', 'Reorder', 'Price'].includes(h) ? 'text-right' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const status = getStockStatus(product.quantity, product.reorderLevel);
                return (
                  <tr
                    key={product.id}
                    className="group cursor-pointer border-t border-hairline transition-colors hover:bg-surface-2"
                    onClick={() => handleEditProduct(product)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={getProductImage(product.category, product.name)}
                          alt={product.name}
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                        <div>
                          <div className="text-[0.875rem] font-semibold text-ink">{product.name}</div>
                          <div className="text-[0.75rem] text-faint">{product.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[0.8125rem] text-muted">{product.sku}</td>
                    <td className="tnum px-5 py-3.5 text-right text-[0.875rem] font-semibold text-ink">
                      {product.quantity}
                      <span className="text-faint"> {product.unit}s</span>
                    </td>
                    <td className="tnum px-5 py-3.5 text-right text-[0.8125rem] text-muted">{product.reorderLevel}</td>
                    <td className="tnum px-5 py-3.5 text-right text-[0.875rem] font-medium text-ink">{zar(product.price)}</td>
                    <td className="px-5 py-3.5">
                      <StatusDot tone={statusTone[status]} label={statusLabel[status]} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <GhostButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProduct(product);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </GhostButton>
                        <GhostButton
                          className="hover:text-accent"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProduct(product.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </GhostButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-[0.875rem] text-faint">
                    No products match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Tile>

      {/* ── Add Product Dialog (MUI, themed) ───────────────────────────── */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Add new product
            <IconButton onClick={() => setAddDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit(handleAddProduct)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="sku"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="SKU" fullWidth error={!!errors.sku} helperText={errors.sku?.message} />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.category}>
                      <InputLabel>Category</InputLabel>
                      <MuiSelect {...field} label="Category">
                        {categories.map((cat) => (
                          <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                        ))}
                      </MuiSelect>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Product name" fullWidth error={!!errors.name} helperText={errors.name?.message} />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => <TextField {...field} label="Description" fullWidth multiline rows={2} />}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Controller
                  name="quantity"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} onChange={(e) => field.onChange(Number(e.target.value))} label="Initial stock" type="number" fullWidth error={!!errors.quantity} />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Controller
                  name="reorderLevel"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} onChange={(e) => field.onChange(Number(e.target.value))} label="Reorder level" type="number" fullWidth error={!!errors.reorderLevel} />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="unit"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Unit</InputLabel>
                      <MuiSelect {...field} label="Unit">
                        {units.map((u) => (
                          <MenuItem key={u} value={u}>{u}</MenuItem>
                        ))}
                      </MuiSelect>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Controller
                  name="price"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} onChange={(e) => field.onChange(Number(e.target.value))} label="Selling price (R)" type="number" fullWidth error={!!errors.price} />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Controller
                  name="costPrice"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} onChange={(e) => field.onChange(Number(e.target.value))} label="Cost price (R)" type="number" fullWidth error={!!errors.costPrice} />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <MuiButton onClick={() => setAddDialogOpen(false)}>Cancel</MuiButton>
            <MuiButton type="submit" variant="contained">Add product</MuiButton>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Edit Product Drawer (MUI, themed) ──────────────────────────── */}
      <Drawer anchor="right" open={editDrawerOpen} onClose={() => setEditDrawerOpen(false)} PaperProps={{ sx: { width: 420 } }}>
        {selectedProduct && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight={600}>Product details</Typography>
              <IconButton onClick={() => setEditDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Box sx={{ p: 3, bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box
                  component="img"
                  src={getProductImage(selectedProduct.category, selectedProduct.name).replace('w=100&h=100', 'w=200&h=200')}
                  alt={selectedProduct.name}
                  sx={{ width: 80, height: 80, borderRadius: 3, objectFit: 'cover' }}
                />
                <Box>
                  <Typography variant="h6" fontWeight={600}>{selectedProduct.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{selectedProduct.sku}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Chip
                  label={getStockStatus(selectedProduct.quantity, selectedProduct.reorderLevel).replace('-', ' ')}
                  color={
                    getStockStatus(selectedProduct.quantity, selectedProduct.reorderLevel) === 'in-stock'
                      ? 'success'
                      : getStockStatus(selectedProduct.quantity, selectedProduct.reorderLevel) === 'low-stock'
                      ? 'warning'
                      : 'error'
                  }
                  size="small"
                  sx={{ textTransform: 'capitalize' }}
                />
                <Chip label={selectedProduct.category} size="small" variant="outlined" />
              </Box>
            </Box>

            <MuiTabs value={drawerTab} onChange={(_, v) => setDrawerTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
              <MuiTab label="Details" />
              <MuiTab label="Stock history" />
            </MuiTabs>

            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {drawerTab === 0 && (
                <Box>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="overline" color="text.secondary">Current stock</Typography>
                      <Typography variant="h5" fontWeight={700}>{selectedProduct.quantity} {selectedProduct.unit}s</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="overline" color="text.secondary">Reorder level</Typography>
                      <Typography variant="h5" fontWeight={700}>{selectedProduct.reorderLevel}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="overline" color="text.secondary">Selling price</Typography>
                      <Typography variant="h6" fontWeight={600}>{zar(selectedProduct.price)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="overline" color="text.secondary">Cost price</Typography>
                      <Typography variant="h6" fontWeight={600}>{zar(selectedProduct.costPrice)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="overline" color="text.secondary">Profit margin</Typography>
                      <Typography variant="h6" fontWeight={600} color="success.main">
                        {Math.round(((selectedProduct.price - selectedProduct.costPrice) / selectedProduct.price) * 100)}%
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="overline" color="text.secondary">Stock value</Typography>
                      <Typography variant="h6" fontWeight={600}>{zar(selectedProduct.price * selectedProduct.quantity)}</Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>Adjust stock</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <MuiButton
                      variant="outlined"
                      color="success"
                      startIcon={<TrendingUp />}
                      onClick={() => {
                        setAdjustmentType('in');
                        setAdjustDialogOpen(true);
                      }}
                    >
                      Stock in
                    </MuiButton>
                    <MuiButton
                      variant="outlined"
                      color="error"
                      startIcon={<TrendingDown />}
                      onClick={() => {
                        setAdjustmentType('out');
                        setAdjustDialogOpen(true);
                      }}
                    >
                      Stock out
                    </MuiButton>
                  </Box>
                </Box>
              )}

              {drawerTab === 1 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>Movement history</Typography>
                  <List>
                    {productMovements.map((movement) => (
                      <ListItem key={movement.id} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: movement.type === 'in' ? 'success.light' : movement.type === 'out' ? 'error.light' : 'info.light',
                            }}
                          >
                            {movement.type === 'in' ? <TrendingUp fontSize="small" color="success" /> : <TrendingDown fontSize="small" color="error" />}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={500}>
                              {movement.type === 'in' ? '+' : '-'}{movement.quantity} units
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography variant="caption" display="block">{movement.reason}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(movement.createdAt), 'MMM dd, yyyy HH:mm')}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                    {productMovements.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                        No stock movements recorded
                      </Typography>
                    )}
                  </List>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ── Stock Adjustment Dialog (MUI, themed) ──────────────────────── */}
      <Dialog open={adjustDialogOpen} onClose={() => setAdjustDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{adjustmentType === 'in' ? 'Add stock' : 'Remove stock'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Quantity"
            type="number"
            fullWidth
            value={adjustmentQty}
            onChange={(e) => setAdjustmentQty(Number(e.target.value))}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            label="Reason"
            fullWidth
            multiline
            rows={2}
            value={adjustmentReason}
            onChange={(e) => setAdjustmentReason(e.target.value)}
            placeholder={adjustmentType === 'in' ? 'e.g., Stock replenishment' : 'e.g., Damaged goods'}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <MuiButton onClick={() => setAdjustDialogOpen(false)}>Cancel</MuiButton>
          <MuiButton
            variant="contained"
            color={adjustmentType === 'in' ? 'success' : 'error'}
            onClick={handleAdjustStock}
            disabled={adjustmentQty <= 0 || !adjustmentReason}
          >
            {adjustmentType === 'in' ? 'Add stock' : 'Remove stock'}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Inventory;
