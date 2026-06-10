import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button as MuiButton,
  Card,
  CardContent,
  Grid,
  TextField,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Rating,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Close as CloseIcon,
  ShoppingCart as OrderIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { Plus, Star, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { useAppStore } from '../stores/appStore';
import { Supplier, Product } from '../types';
import { getStockStatus } from '../data';
import { PageHeader, Tile, Label, SearchField, Badge, Button } from '../components/ui';

const zar = (amount: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0 }).format(amount);

const Suppliers: React.FC = () => {
  const { suppliers, products, addSupplier } = useAppStore();
  const showToast = useAppStore((s) => s.showToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderStep, setReorderStep] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<{ product: Product; quantity: number }[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', contactPerson: '', email: '', phone: '', address: '' });

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const lowStockProducts = products.filter((p) => getStockStatus(p.quantity, p.reorderLevel) !== 'in-stock');

  const handleOpenDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailOpen(true);
  };

  const handleStartReorder = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSelectedProducts([]);
    setReorderStep(0);
    setReorderOpen(true);
  };

  const handleQuickReorder = () => {
    if (suppliers.length === 0) return;
    // Pick the supplier covering the most low-stock products.
    const best = [...suppliers].sort((a, b) => {
      const score = (s: Supplier) =>
        lowStockProducts.filter((p) => s.productsSupplied.includes(p.category)).length;
      return score(b) - score(a);
    })[0];
    const toReorder = lowStockProducts
      .filter((p) => best.productsSupplied.includes(p.category))
      .map((product) => ({ product, quantity: product.reorderLevel * 2 }));
    setSelectedSupplier(best);
    setSelectedProducts(toReorder.length ? toReorder : []);
    setReorderStep(toReorder.length ? 1 : 0);
    setReorderOpen(true);
  };

  const handleAddSupplier = () => {
    if (!newSupplier.name.trim()) {
      showToast('Supplier name is required.', 'warning');
      return;
    }
    addSupplier({
      id: crypto.randomUUID(),
      name: newSupplier.name.trim(),
      contactPerson: newSupplier.contactPerson.trim(),
      email: newSupplier.email.trim(),
      phone: newSupplier.phone.trim(),
      address: newSupplier.address.trim(),
      productsSupplied: [],
      rating: 0,
    });
    showToast(`${newSupplier.name.trim()} added to your supplier network.`, 'success');
    setNewSupplier({ name: '', contactPerson: '', email: '', phone: '', address: '' });
    setAddOpen(false);
  };

  const handleAddToReorder = (product: Product) => {
    const existing = selectedProducts.find((p) => p.product.id === product.id);
    if (!existing) setSelectedProducts([...selectedProducts, { product, quantity: product.reorderLevel * 2 }]);
  };

  const handleUpdateReorderQty = (productId: string, quantity: number) => {
    setSelectedProducts(
      selectedProducts.map((p) => (p.product.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p)),
    );
  };

  const handleRemoveFromReorder = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.product.id !== productId));
  };

  const reorderTotal = selectedProducts.reduce((sum, p) => sum + p.product.costPrice * p.quantity, 0);

  const getSupplierProducts = (supplier: Supplier) =>
    products.filter((p) => supplier.productsSupplied.includes(p.category));

  const getSupplierImage = (supplierName: string) => {
    const images = [
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face',
    ];
    return images[supplierName.length % images.length];
  };

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Supply Chain Intelligence"
        title="Supplier Network"
        subtitle="Manage vendors, track orders, and keep the supply chain moving."
        actions={
          <Button variant="accent" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add supplier
          </Button>
        }
      />

      {/* Low stock alert */}
      {lowStockProducts.length > 0 && (
        <Tile accent className="mb-4 flex-row items-center justify-between gap-4">
          <div>
            <p className="text-[0.9375rem] font-semibold text-accent-contrast">
              {lowStockProducts.length} products need restocking
            </p>
            <p className="mt-0.5 text-[0.8125rem] text-accent-contrast/70">
              {lowStockProducts.slice(0, 3).map((p) => p.name).join(', ')}
              {lowStockProducts.length > 3 && ` and ${lowStockProducts.length - 3} more`}
            </p>
          </div>
          <button onClick={handleQuickReorder} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent-contrast px-4 py-2 text-[0.875rem] font-semibold text-accent transition-opacity hover:opacity-90">
            <ShoppingCart className="h-4 w-4" /> Quick reorder
          </button>
        </Tile>
      )}

      {/* Search */}
      <div className="mb-4">
        <SearchField
          placeholder="Search suppliers…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          containerClassName="max-w-md"
        />
      </div>

      {/* Supplier cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.map((supplier) => {
          const supplierProducts = getSupplierProducts(supplier);
          const lowStockCount = supplierProducts.filter(
            (p) => getStockStatus(p.quantity, p.reorderLevel) !== 'in-stock',
          ).length;

          return (
            <Tile key={supplier.id} interactive onClick={() => handleOpenDetail(supplier)} className="gap-4">
              <div className="flex items-start gap-3">
                <img
                  src={getSupplierImage(supplier.name)}
                  alt={supplier.name}
                  className="h-14 w-14 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[1.0625rem] font-bold text-ink">{supplier.name}</h3>
                  <p className="truncate text-[0.8125rem] text-muted">{supplier.contactPerson}</p>
                  <div className="mt-1 flex items-center gap-1 text-[0.8125rem] text-muted">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                    <span className="tnum font-medium text-ink">{supplier.rating}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {supplier.productsSupplied.map((cat) => (
                  <Badge key={cat}>{cat}</Badge>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-hairline pt-3">
                <div>
                  <Label>Last order</Label>
                  <p className="mt-1 text-[0.8125rem] font-medium text-ink">
                    {supplier.lastOrderDate ? format(new Date(supplier.lastOrderDate), 'MMM dd, yyyy') : 'Never'}
                  </p>
                </div>
                {lowStockCount > 0 && <Badge tone="critical">{lowStockCount} low stock</Badge>}
              </div>

              <button
                className="inline-flex items-center justify-center gap-2 rounded-full bg-surface-inset px-4 py-2 text-[0.875rem] font-semibold text-ink transition-colors hover:bg-surface-inset/70"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartReorder(supplier);
                }}
              >
                <ShoppingCart className="h-4 w-4" /> Place order
              </button>
            </Tile>
          );
        })}
        {filteredSuppliers.length === 0 && (
          <p className="col-span-full py-16 text-center text-[0.875rem] text-faint">No suppliers match your search.</p>
        )}
      </div>

      {/* ── Supplier Detail Dialog (MUI, themed) ───────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        {selectedSupplier && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>{selectedSupplier.name.charAt(0)}</Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>{selectedSupplier.name}</Typography>
                    <Rating value={selectedSupplier.rating} precision={0.1} size="small" readOnly />
                  </Box>
                </Box>
                <IconButton onClick={() => setDetailOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'background.default' }}>
                      <PhoneIcon color="action" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary="Phone" secondary={selectedSupplier.phone} />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'background.default' }}>
                      <EmailIcon color="action" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary="Email" secondary={selectedSupplier.email} />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'background.default' }}>
                      <LocationIcon color="action" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary="Address" secondary={selectedSupplier.address} />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Products supplied</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {selectedSupplier.productsSupplied.map((cat) => (
                  <Chip key={cat} label={cat} />
                ))}
              </Box>

              <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 3 }} gutterBottom>
                Products from this supplier
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="center">Stock</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getSupplierProducts(selectedSupplier).slice(0, 5).map((product) => {
                      const status = getStockStatus(product.quantity, product.reorderLevel);
                      return (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell align="center">{product.quantity}</TableCell>
                          <TableCell>
                            <Chip
                              label={status.replace('-', ' ')}
                              size="small"
                              color={status === 'in-stock' ? 'success' : status === 'low-stock' ? 'warning' : 'error'}
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <MuiButton onClick={() => setDetailOpen(false)}>Close</MuiButton>
              <MuiButton
                variant="contained"
                startIcon={<OrderIcon />}
                onClick={() => {
                  setDetailOpen(false);
                  handleStartReorder(selectedSupplier);
                }}
              >
                Place order
              </MuiButton>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Reorder Dialog (MUI, themed) ───────────────────────────────── */}
      <Dialog open={reorderOpen} onClose={() => setReorderOpen(false)} maxWidth="md" fullWidth>
        {selectedSupplier && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Order from {selectedSupplier.name}
                <IconButton onClick={() => setReorderOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Stepper activeStep={reorderStep} sx={{ mb: 4 }}>
                <Step>
                  <StepLabel>Select products</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Review order</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Confirm</StepLabel>
                </Step>
              </Stepper>

              {reorderStep === 0 && (
                <Grid container spacing={2}>
                  {getSupplierProducts(selectedSupplier).map((product) => {
                    const isSelected = selectedProducts.some((p) => p.product.id === product.id);
                    const status = getStockStatus(product.quantity, product.reorderLevel);
                    return (
                      <Grid size={{ xs: 12, sm: 6 }} key={product.id}>
                        <Card
                          variant="outlined"
                          sx={{
                            cursor: 'pointer',
                            borderColor: isSelected ? 'primary.main' : 'divider',
                          }}
                          onClick={() => handleAddToReorder(product)}
                        >
                          <CardContent sx={{ py: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>{product.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Stock: {product.quantity} | Cost: {zar(product.costPrice)}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {status !== 'in-stock' && (
                                  <Chip label={status.replace('-', ' ')} size="small" color={status === 'low-stock' ? 'warning' : 'error'} />
                                )}
                                {isSelected && <CheckIcon color="primary" />}
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}

              {reorderStep === 1 && (
                <Box>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell align="center">Quantity</TableCell>
                          <TableCell align="right">Unit cost</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedProducts.map(({ product, quantity }) => (
                          <TableRow key={product.id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell align="center">
                              <TextField
                                type="number"
                                size="small"
                                value={quantity}
                                onChange={(e) => handleUpdateReorderQty(product.id, parseInt(e.target.value) || 1)}
                                sx={{ width: 80 }}
                              />
                            </TableCell>
                            <TableCell align="right">{zar(product.costPrice)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>{zar(product.costPrice * quantity)}</TableCell>
                            <TableCell>
                              <IconButton size="small" color="error" onClick={() => handleRemoveFromReorder(product.id)}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700}>Order total: {zar(reorderTotal)}</Typography>
                    </Paper>
                  </Box>
                </Box>
              )}

              {reorderStep === 2 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Avatar sx={{ width: 80, height: 80, bgcolor: 'success.main', mx: 'auto', mb: 2 }}>
                    <CheckIcon sx={{ fontSize: 48 }} />
                  </Avatar>
                  <Typography variant="h5" fontWeight={700} gutterBottom>Order ready to send</Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Your order of {selectedProducts.length} items totaling {zar(reorderTotal)} will be sent to {selectedSupplier.name}
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'left', maxWidth: 400, mx: 'auto' }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>Order summary</Typography>
                    {selectedProducts.map(({ product, quantity }) => (
                      <Box key={product.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{product.name} × {quantity}</Typography>
                        <Typography variant="body2">{zar(product.costPrice * quantity)}</Typography>
                      </Box>
                    ))}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" fontWeight={600}>Total</Typography>
                      <Typography variant="subtitle2" fontWeight={600}>{zar(reorderTotal)}</Typography>
                    </Box>
                  </Paper>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              {reorderStep > 0 && <MuiButton onClick={() => setReorderStep(reorderStep - 1)}>Back</MuiButton>}
              <Box sx={{ flex: 1 }} />
              <MuiButton onClick={() => setReorderOpen(false)}>Cancel</MuiButton>
              {reorderStep < 2 ? (
                <MuiButton variant="contained" onClick={() => setReorderStep(reorderStep + 1)} disabled={selectedProducts.length === 0}>
                  Continue
                </MuiButton>
              ) : (
                <MuiButton
                  variant="contained"
                  color="success"
                  startIcon={<ShippingIcon />}
                  onClick={() => {
                    setReorderOpen(false);
                    setSelectedProducts([]);
                    showToast(`Order sent to ${selectedSupplier?.name ?? 'supplier'}.`, 'success');
                  }}
                >
                  Send order
                </MuiButton>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Add Supplier dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Add supplier
            <IconButton onClick={() => setAddOpen(false)}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Business name"
                fullWidth
                size="small"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                autoFocus
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Contact person"
                fullWidth
                size="small"
                value={newSupplier.contactPerson}
                onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Phone"
                fullWidth
                size="small"
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Email"
                fullWidth
                size="small"
                value={newSupplier.email}
                onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Address"
                fullWidth
                size="small"
                value={newSupplier.address}
                onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <MuiButton onClick={() => setAddOpen(false)}>Cancel</MuiButton>
          <MuiButton variant="contained" startIcon={<Plus size={16} />} onClick={handleAddSupplier}>
            Add supplier
          </MuiButton>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Suppliers;
