import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, Avatar, IconButton, Collapse, Tooltip } from '@mui/material';
import {
  Psychology as BrainIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAppStore } from '../../stores/appStore';
import { getBannerInsights, buildBusinessContext } from '../../services/ai';

const DEFAULT_INSIGHTS: Record<string, string[]> = {
  'Dashboard Intelligence': [
    'AI is ready to analyze your business — tap refresh for live insights',
    'Your dashboard aggregates key metrics across inventory, sales, and cash flow',
    'NODAL AI can benchmark your performance against 2,400+ similar SMEs',
  ],
  'Inventory Intelligence': [
    'AI can detect slow-moving stock and predict reorder timing — tap refresh',
    'Monitor stock levels and reorder points to prevent stockouts',
    'NODAL AI optimizes inventory by analyzing sales velocity patterns',
  ],
  'Sales Intelligence': [
    'AI can identify your best-selling products and peak hours — tap refresh',
    'Track payment statuses and follow up on overdue invoices for better cash flow',
    'NODAL AI finds cross-sell and upsell opportunities from sales patterns',
  ],
  'Cash Flow Intelligence': [
    'AI can forecast your cash position and flag potential shortfalls — tap refresh',
    'Monitor income versus expenses to maintain healthy profit margins',
    'NODAL AI detects spending anomalies and suggests cost optimizations',
  ],
  'Supplier Intelligence': [
    'AI can optimize reorder quantities and timing — tap refresh',
    'Track supplier reliability and negotiate better terms with data',
    'NODAL AI matches you with the best suppliers based on your needs',
  ],
  'Storefront Intelligence': [
    'AI can suggest product placement and pricing for your storefront — tap refresh',
    'Share your digital storefront link on WhatsApp to reach more customers',
    'NODAL AI helps you showcase your best products to drive online sales',
  ],
};

interface AIInsightBannerProps {
  insights?: string[];
  context: string;
  compact?: boolean;
}

const AIInsightBanner: React.FC<AIInsightBannerProps> = ({ insights: defaultInsights, context, compact = false }) => {
  const { products, sales, cashFlow, businessProfile, getAiCache, setAiCache } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(true);
  const [loading, setLoading] = useState(false);

  const cacheKey = `banner_${context}`;
  const cached = getAiCache(cacheKey);
  const insights: string[] = cached || defaultInsights || DEFAULT_INSIGHTS[context] || DEFAULT_INSIGHTS['Dashboard Intelligence'];

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const ctx = buildBusinessContext({ products, sales, cashFlow, businessProfile });
      const result = await getBannerInsights(context, ctx);
      if (Array.isArray(result) && result.length > 0) {
        setAiCache(cacheKey, result);
        setCurrentIndex(0);
      }
    } catch {
      // Keep current data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % insights.length);
        setFade(true);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, [insights.length]);

  if (!visible || insights.length === 0) return null;

  if (compact) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flex: 1,
          minWidth: 0,
        }}
      >
        <BrainIcon sx={{ fontSize: 18, color: '#7c3aed' }} />
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            color: '#7c3aed',
            fontSize: '0.8rem',
            opacity: fade ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          {loading ? 'Generating insights...' : insights[currentIndex]}
        </Typography>
        <Tooltip title="Get AI insights">
          <IconButton size="small" onClick={handleRefresh} disabled={loading} sx={{ color: '#7c3aed' }}>
            <RefreshIcon sx={{ fontSize: 16, animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
          </IconButton>
        </Tooltip>
        <Chip
          label={context}
          size="small"
          sx={{
            bgcolor: 'rgba(124, 58, 237, 0.06)',
            color: '#7c3aed',
            fontWeight: 600,
            fontSize: '10px',
            height: 20,
          }}
        />
      </Box>
    );
  }

  return (
    <Collapse in={visible}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 3,
          py: 2,
          mb: 3,
          borderRadius: 1,
          bgcolor: 'rgba(124, 58, 237, 0.05)',
          border: '1px solid rgba(124, 58, 237, 0.12)',
          position: 'relative',
        }}
      >
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: '#7c3aed',
          }}
        >
          <BrainIcon sx={{ fontSize: 22, color: 'white' }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
            <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 700, letterSpacing: '0.05em' }}>
              NODAL AI · {context}
            </Typography>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: '#16a34a',
                animation: 'aiBannerPulse 2s infinite',
                '@keyframes aiBannerPulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.4 },
                },
              }}
            />
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: 'text.primary',
              fontWeight: 500,
              opacity: fade ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          >
            {loading ? 'Generating live insights...' : insights[currentIndex]}
          </Typography>
        </Box>
        <Tooltip title={cached ? 'Refresh AI insights' : 'Get live AI insights'}>
          <IconButton size="small" onClick={handleRefresh} disabled={loading} sx={{ color: '#7c3aed' }}>
            <RefreshIcon sx={{ fontSize: 18, animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={() => setVisible(false)} sx={{ color: 'text.secondary' }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Collapse>
  );
};

export default AIInsightBanner;
