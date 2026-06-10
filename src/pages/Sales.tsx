import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button as MuiButton,
  Card,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select as MuiSelect,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Autocomplete,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Remove as RemoveIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { Plus, FileText, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useAppStore } from '../stores/appStore';
import { Sale, SaleItem, Product } from '../types';
import { PageHeader, Tile, Metric, SegmentTabs, StatusDot, Button, GhostButton } from '../components/ui';
import { downloadCSV } from '../lib/export';

const zar = (amount: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0 }).format(amount);

const statusTone = { paid: 'positive', pending: 'muted', overdue: 'critical' } as const;

const Sales: React.FC = () => {
  const { products, sales, addSale } = useAppStore();
  const showToast = useAppStore((s) => s.showToast);
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile' | 'credit'>('cash');

  const handleAddToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.productId === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
            : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.price, total: product.price },
      ]);
    }
    setSelectedProduct(null);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty, total: newQty * item.unitPrice };
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const cartTax = cartSubtotal * 0.15;
  const cartTotal = cartSubtotal + cartTax;

  const handleCompleteSale = () => {
    if (cart.length === 0) return;
    const invoiceNumber = `INV-${format(new Date(), 'yyyy')}-${String(sales.length + 1).padStart(4, '0')}`;
    const newSale: Sale = {
      id: crypto.randomUUID(),
      invoiceNumber,
      customerName: customerName || undefined,
      items: cart,
      subtotal: cartSubtotal,
      tax: cartTax,
      total: cartTotal,
      paymentMethod,
      status: paymentMethod === 'credit' ? 'pending' : 'paid',
      createdAt: new Date(),
      dueDate: paymentMethod === 'credit' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined,
    };
    addSale(newSale);
    setSelectedSale(newSale);
    setNewSaleOpen(false);
    setInvoiceOpen(true);
    setCart([]);
    setCustomerName('');
    setPaymentMethod('cash');
  };

  const handleViewInvoice = (sale: Sale) => {
    setSelectedSale(sale);
    setInvoiceOpen(true);
  };

  const handlePrintInvoice = () => {
    showToast('Opening print dialog — choose “Save as PDF” to download.', 'info');
    setTimeout(() => window.print(), 250);
  };

  const handleDownloadInvoice = () => {
    if (!selectedSale) return;
    const rows = selectedSale.items.map((item) => ({
      Invoice: selectedSale.invoiceNumber,
      Product: item.productName,
      Quantity: item.quantity,
      'Unit price': item.unitPrice,
      Total: item.total,
    }));
    downloadCSV(`${selectedSale.invoiceNumber}.csv`, rows);
    showToast(`Invoice ${selectedSale.invoiceNumber} downloaded.`, 'success');
  };

  const filteredSales = useMemo(() => {
    const statuses = ['all', 'paid', 'pending', 'overdue'];
    const currentStatus = statuses[tabValue];
    return [...sales]
      .filter((s) => currentStatus === 'all' || s.status === currentStatus)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sales, tabValue]);

  const todaySales = sales.filter(
    (s) => format(new Date(s.createdAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
  );
  const todayRevenue = todaySales.filter((s) => s.status === 'paid').reduce((sum, s) => sum + s.total, 0);
  const pendingAmount = sales.filter((s) => s.status === 'pending').reduce((sum, s) => sum + s.total, 0);
  const overdueAmount = sales.filter((s) => s.status === 'overdue').reduce((sum, s) => sum + s.total, 0);

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Sales Intelligence"
        title="Sales & Invoicing"
        subtitle="Process transactions, generate invoices, and track payments."
        actions={
          <Button variant="accent" onClick={() => setNewSaleOpen(true)}>
            <Plus className="h-4 w-4" /> New sale
          </Button>
        }
      />

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:auto-rows-[140px]">
        <Metric label="Today's orders" value={todaySales.length} accent />
        <Metric label="Today's revenue" value={zar(todayRevenue)} />
        <Metric label="Pending" value={zar(pendingAmount)} hint="awaiting" />
        <Metric label="Overdue" value={zar(overdueAmount)} critical={overdueAmount > 0} />
      </div>

      {/* Sales list */}
      <Tile flush className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5">
          <SegmentTabs tabs={['All', 'Paid', 'Pending', 'Overdue']} value={tabValue} onChange={setTabValue} />
        </div>
        <div className="mt-3 overflow-x-auto nodal-scroll">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr>
                {['Invoice', 'Customer', 'Items', 'Amount', 'Payment', 'Status', 'Date', ''].map((h, i) => (
                  <th
                    key={h + i}
                    className={`px-5 py-3.5 text-[0.6875rem] font-semibold uppercase tracking-[var(--tracking-label)] text-faint ${
                      h === 'Amount' ? 'text-right' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  className="group cursor-pointer border-t border-hairline transition-colors hover:bg-surface-2"
                  onClick={() => handleViewInvoice(sale)}
                >
                  <td className="px-5 py-3.5 text-[0.875rem] font-semibold text-ink">{sale.invoiceNumber}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-inset text-[0.75rem] font-semibold text-muted">
                        {sale.customerName?.charAt(0) || 'G'}
                      </span>
                      <span className="text-[0.875rem] text-ink">{sale.customerName || 'Walk-in customer'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[0.8125rem] text-muted">
                    {sale.items.length} item{sale.items.length > 1 ? 's' : ''}
                  </td>
                  <td className="tnum px-5 py-3.5 text-right text-[0.875rem] font-semibold text-ink">{zar(sale.total)}</td>
                  <td className="px-5 py-3.5 text-[0.8125rem] capitalize text-muted">{sale.paymentMethod}</td>
                  <td className="px-5 py-3.5">
                    <StatusDot tone={statusTone[sale.status as keyof typeof statusTone] ?? 'muted'} label={sale.status} />
                  </td>
                  <td className="px-5 py-3.5 text-[0.8125rem] text-faint">{format(new Date(sale.createdAt), 'MMM dd, HH:mm')}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <GhostButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewInvoice(sale);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </GhostButton>
                      <GhostButton onClick={(e) => { e.stopPropagation(); handleViewInvoice(sale); handlePrintInvoice(); }}>
                        <Printer className="h-4 w-4" />
                      </GhostButton>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-[0.875rem] text-faint">
                    No sales found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Tile>

      {/* ── New Sale Dialog (MUI, themed) ──────────────────────────────── */}
      <Dialog open={newSaleOpen} onClose={() => setNewSaleOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CartIcon color="primary" />
              New sale
            </Box>
            <IconButton onClick={() => setNewSaleOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Add products</Typography>
              <Autocomplete
                options={products.filter((p) => p.quantity > 0)}
                getOptionLabel={(option) => `${option.name} (${option.sku}) - ${zar(option.price)}`}
                value={selectedProduct}
                onChange={(_, value) => value && handleAddToCart(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search products..."
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <SearchIcon color="action" />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">Quick add</Typography>
                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                  {products.slice(0, 8).map((product) => (
                    <Grid size={{ xs: 6, sm: 3 }} key={product.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          cursor: product.quantity > 0 ? 'pointer' : 'not-allowed',
                          opacity: product.quantity > 0 ? 1 : 0.5,
                          '&:hover': product.quantity > 0 ? { borderColor: 'primary.main', bgcolor: 'action.hover' } : {},
                        }}
                        onClick={() => product.quantity > 0 && handleAddToCart(product)}
                      >
                        <Typography variant="caption" noWrap fontWeight={500}>{product.name}</Typography>
                        <Typography variant="body2" fontWeight={600} color="primary.main">{zar(product.price)}</Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>Cart ({cart.length} items)</Typography>

                {cart.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <CartIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">Cart is empty</Typography>
                  </Box>
                ) : (
                  <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {cart.map((item) => (
                      <ListItem key={item.productId} sx={{ px: 0 }}>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={500}>{item.productName}</Typography>}
                          secondary={`${zar(item.unitPrice)} × ${item.quantity}`}
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IconButton size="small" onClick={() => handleUpdateQuantity(item.productId, -1)}>
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <Typography variant="body2" fontWeight={600} sx={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</Typography>
                            <IconButton size="small" onClick={() => handleUpdateQuantity(item.productId, 1)}>
                              <AddIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleRemoveFromCart(item.productId)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}

                <Divider sx={{ my: 2 }} />

                <TextField
                  label="Customer name (optional)"
                  size="small"
                  fullWidth
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Payment method</InputLabel>
                  <MuiSelect value={paymentMethod} label="Payment method" onChange={(e) => setPaymentMethod(e.target.value as any)}>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="card">Card</MenuItem>
                    <MenuItem value="mobile">Mobile money</MenuItem>
                    <MenuItem value="credit">Credit (pay later)</MenuItem>
                  </MuiSelect>
                </FormControl>

                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Subtotal</Typography>
                    <Typography variant="body2">{zar(cartSubtotal)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">VAT (15%)</Typography>
                    <Typography variant="body2">{zar(cartTax)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight={700}>Total</Typography>
                    <Typography variant="subtitle1" fontWeight={700} color="primary.main">{zar(cartTotal)}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <MuiButton onClick={() => setNewSaleOpen(false)}>Cancel</MuiButton>
          <MuiButton variant="contained" onClick={handleCompleteSale} disabled={cart.length === 0} size="large">
            Complete sale ({zar(cartTotal)})
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* ── Invoice Preview Dialog (MUI, themed) ───────────────────────── */}
      <Dialog open={invoiceOpen} onClose={() => setInvoiceOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Invoice
            <IconButton className="no-print" onClick={() => setInvoiceOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        {selectedSale && (
          <DialogContent>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h5" fontWeight={700} color="primary.main">Apex General Store</Typography>
                  <Typography variant="body2" color="text.secondary">15 Commissioner Street, Marshalltown</Typography>
                  <Typography variant="body2" color="text.secondary">Johannesburg, 2001</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" fontWeight={600}>INVOICE</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedSale.invoiceNumber}</Typography>
                  <Typography variant="body2" color="text.secondary">{format(new Date(selectedSale.createdAt), 'MMM dd, yyyy')}</Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary">Bill to</Typography>
                <Typography variant="body1" fontWeight={500}>{selectedSale.customerName || 'Walk-in customer'}</Typography>
              </Box>

              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="center">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedSale.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">{zar(item.unitPrice)}</TableCell>
                        <TableCell align="right">{zar(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Box sx={{ width: 200 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Subtotal</Typography>
                    <Typography variant="body2">{zar(selectedSale.subtotal)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">VAT (15%)</Typography>
                    <Typography variant="body2">{zar(selectedSale.tax)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight={700}>Total</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>{zar(selectedSale.total)}</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Payment method</Typography>
                  <Typography variant="body1" fontWeight={500} textTransform="capitalize">{selectedSale.paymentMethod}</Typography>
                </Box>
                <Chip label={selectedSale.status} color={getStatusColor(selectedSale.status)} sx={{ textTransform: 'capitalize' }} />
              </Box>
            </Paper>
          </DialogContent>
        )}
        <DialogActions className="no-print" sx={{ p: 2 }}>
          <MuiButton startIcon={<PrintIcon />} onClick={handlePrintInvoice}>Print</MuiButton>
          <MuiButton startIcon={<DownloadIcon />} variant="contained" onClick={handleDownloadInvoice}>Download PDF</MuiButton>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Sales;
