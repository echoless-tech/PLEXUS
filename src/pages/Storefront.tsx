import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button as MuiButton,
  Card,
  CardContent,
  Grid,
  TextField,
  IconButton,
  Avatar,
  Divider,
  Paper,
  Chip,
  Fab,
  Dialog,
  DialogContent,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Chat as ChatIcon,
  Close as CloseIcon,
  WhatsApp as WhatsAppIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  ShoppingBag as ShopIcon,
} from '@mui/icons-material';
import { Pencil, Share2, Link as LinkIcon, Copy, Check, Monitor, Smartphone } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { PageHeader, Tile, Label, Metric, SegmentTabs, Button, GhostButton } from '../components/ui';

const zar = (amount: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0 }).format(amount);

const Storefront: React.FC = () => {
  const { businessProfile, products, updateBusinessProfile } = useAppStore();
  const showToast = useAppStore((s) => s.showToast);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [linkCopied, setLinkCopied] = useState(false);
  const [editData, setEditData] = useState(businessProfile);

  const handleSaveProfile = () => {
    updateBusinessProfile(editData);
    setEditMode(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://nodal.shop/apex-general-store');
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const availableProducts = products.filter((p) => p.quantity > 0);

  const getCategoryImage = (category: string, productName: string) => {
    const imageMap: Record<string, string[]> = {
      Electronics: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&h=200&fit=crop',
      ],
      Groceries: [
        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&h=200&fit=crop',
      ],
      Beverages: [
        'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=200&h=200&fit=crop',
      ],
      'Personal Care': [
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=200&h=200&fit=crop',
      ],
      Household: [
        'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=200&h=200&fit=crop',
      ],
      Stationery: [
        'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=200&h=200&fit=crop',
      ],
    };
    const images = imageMap[category] || imageMap['Electronics'];
    const index = productName.length % images.length;
    return images[index];
  };

  const getCategoryGradient = (category: string) => {
    const colors: Record<string, string> = {
      Electronics: '#1e293b',
      Groceries: '#334155',
      Beverages: '#0f172a',
      'Personal Care': '#475569',
      Household: '#1e293b',
      Stationery: '#64748b',
    };
    return colors[category] || colors['Electronics'];
  };

  const StorefrontPreview = () => (
    <Paper
      elevation={0}
      sx={{
        width: previewMode === 'mobile' ? 375 : '100%',
        maxWidth: 800,
        mx: 'auto',
        borderRadius: 4,
        overflow: 'hidden',
        border: previewMode === 'mobile' ? '8px solid #1a1a1a' : '1px solid',
        borderColor: previewMode === 'mobile' ? '#1a1a1a' : 'divider',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          height: previewMode === 'mobile' ? 140 : 200,
          background: '#1e293b',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'url(https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&h=400&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.3,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'rgba(0,0,0,0.3)',
          },
        }}
      >
        <Box sx={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}>
          <Avatar
            sx={{ width: 90, height: 90, bgcolor: '#1e293b', color: '#fff', fontSize: '2.5rem', fontWeight: 800, border: '4px solid white' }}
          >
            {businessProfile.name.charAt(0)}
          </Avatar>
        </Box>
      </Box>

      <Box sx={{ pt: 6, pb: 3, px: 3, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700}>{businessProfile.name}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{businessProfile.tagline}</Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
          {businessProfile.socialLinks?.whatsapp && (
            <IconButton size="small" sx={{ bgcolor: '#25D366', color: 'white', '&:hover': { bgcolor: '#128C7E' } }}>
              <WhatsAppIcon fontSize="small" />
            </IconButton>
          )}
          {businessProfile.socialLinks?.instagram && (
            <IconButton size="small" sx={{ bgcolor: '#E4405F', color: 'white', '&:hover': { bgcolor: '#C13584' } }}>
              <InstagramIcon fontSize="small" />
            </IconButton>
          )}
          {businessProfile.socialLinks?.facebook && (
            <IconButton size="small" sx={{ bgcolor: '#1877F2', color: 'white', '&:hover': { bgcolor: '#0D47A1' } }}>
              <FacebookIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 3, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIcon fontSize="small" color="action" />
            <Typography variant="body2">{businessProfile.phone}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon fontSize="small" color="action" />
            <Typography variant="body2">{businessProfile.email}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon fontSize="small" color="action" />
            <Typography variant="body2" sx={{ maxWidth: 300 }}>{businessProfile.address}</Typography>
          </Box>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>Our products</Typography>
        <Grid container spacing={2}>
          {availableProducts.slice(0, previewMode === 'mobile' ? 4 : 8).map((product) => (
            <Grid size={{ xs: 6, sm: previewMode === 'mobile' ? 6 : 3 }} key={product.id}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <Box
                  sx={{
                    height: 120,
                    background: getCategoryGradient(product.category),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    component="img"
                    src={getCategoryImage(product.category, product.name)}
                    alt={product.name}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: -1 }}>
                    <ShopIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.5)' }} />
                  </Box>
                  <Chip
                    label={product.category}
                    size="small"
                    sx={{ position: 'absolute', top: 8, right: 8, fontSize: '0.6rem', height: 20, bgcolor: 'rgba(255,255,255,0.9)', fontWeight: 600 }}
                  />
                </Box>
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{product.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{product.description?.slice(0, 30)}...</Typography>
                  <Typography variant="subtitle2" sx={{ mt: 0.5, fontWeight: 800, color: 'primary.main' }}>{zar(product.price)}</Typography>
                  <MuiButton
                    size="small"
                    variant="contained"
                    fullWidth
                    sx={{ mt: 1, fontSize: '0.7rem' }}
                    onClick={() => showToast('This is a live preview of your customer storefront.', 'info')}
                  >Add to cart</MuiButton>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {availableProducts.length > (previewMode === 'mobile' ? 4 : 8) && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <MuiButton variant="text" onClick={() => showToast('Customers can browse all your products on the live store.', 'info')}>View all {availableProducts.length} products</MuiButton>
          </Box>
        )}
      </Box>

      <Fab color="primary" sx={{ position: 'absolute', bottom: 16, right: 16 }} size={previewMode === 'mobile' ? 'medium' : 'large'} onClick={() => showToast('Customer chat is enabled on your live storefront.', 'info')}>
        <ChatIcon />
      </Fab>
    </Paper>
  );

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Customer Intelligence"
        title="Digital Storefront"
        subtitle="Your auto-generated online presence — ready to share with customers."
        actions={
          <>
            <GhostButton
              pill
              onClick={() => {
                setEditData(businessProfile);
                setEditMode(true);
              }}
            >
              <Pencil className="h-4 w-4" /> Edit profile
            </GhostButton>
            <Button variant="accent" onClick={handleCopyLink}>
              <Share2 className="h-4 w-4" /> {linkCopied ? 'Link copied!' : 'Share store'}
            </Button>
          </>
        }
      />

      {/* Store link */}
      <Tile className="mb-4 flex-row items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <LinkIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <Label>Your store link</Label>
          <p className="mt-0.5 truncate text-[0.9375rem] font-medium text-ink">https://nodal.shop/apex-general-store</p>
        </div>
        <button
          onClick={handleCopyLink}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-surface-inset px-4 py-2 text-[0.875rem] font-semibold text-ink transition-colors hover:bg-surface-inset/70"
        >
          {linkCopied ? <Check className="h-4 w-4 text-positive" /> : <Copy className="h-4 w-4" />}
          {linkCopied ? 'Copied' : 'Copy'}
        </button>
      </Tile>

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:auto-rows-[140px]">
        <Metric label="Products listed" value={availableProducts.length} accent />
        <Metric label="Store views" value={142} />
        <Metric label="Inquiries" value={28} />
        <Metric label="Conversions" value={12} hint="this month" />
      </div>

      {/* Preview */}
      <Tile flush className="mt-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <Label>Storefront preview</Label>
          <SegmentTabs
            tabs={['Desktop', 'Mobile']}
            value={previewMode === 'desktop' ? 0 : 1}
            onChange={(i) => setPreviewMode(i === 0 ? 'desktop' : 'mobile')}
          />
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-faint">
          {previewMode === 'desktop' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
        </div>
        <div className="mt-2 rounded-[var(--radius-tile)] bg-surface-inset/50 p-4 sm:p-8">
          <StorefrontPreview />
        </div>
      </Tile>

      {/* ── Edit Profile Dialog (MUI, themed) ──────────────────────────── */}
      <Dialog open={editMode} onClose={() => setEditMode(false)} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>Edit business profile</Typography>
            <IconButton onClick={() => setEditMode(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField label="Business name" fullWidth value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Tagline" fullWidth value={editData.tagline} onChange={(e) => setEditData({ ...editData, tagline: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Description" fullWidth multiline rows={3} value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Phone" fullWidth value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Email" fullWidth value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Address" fullWidth value={editData.address} onChange={(e) => setEditData({ ...editData, address: e.target.value })} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>Social links</Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="WhatsApp number"
                fullWidth
                value={editData.socialLinks?.whatsapp || ''}
                onChange={(e) => setEditData({ ...editData, socialLinks: { ...editData.socialLinks, whatsapp: e.target.value } })}
                InputProps={{ startAdornment: <WhatsAppIcon sx={{ mr: 1, color: '#25D366' }} /> }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Instagram handle"
                fullWidth
                value={editData.socialLinks?.instagram || ''}
                onChange={(e) => setEditData({ ...editData, socialLinks: { ...editData.socialLinks, instagram: e.target.value } })}
                InputProps={{ startAdornment: <InstagramIcon sx={{ mr: 1, color: '#E4405F' }} /> }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Facebook page"
                fullWidth
                value={editData.socialLinks?.facebook || ''}
                onChange={(e) => setEditData({ ...editData, socialLinks: { ...editData.socialLinks, facebook: e.target.value } })}
                InputProps={{ startAdornment: <FacebookIcon sx={{ mr: 1, color: '#1877F2' }} /> }}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <MuiButton onClick={() => setEditMode(false)}>Cancel</MuiButton>
            <MuiButton variant="contained" onClick={handleSaveProfile}>Save changes</MuiButton>
          </Box>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Storefront;
