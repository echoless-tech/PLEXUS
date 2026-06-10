import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  LinearProgress,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  Lightbulb as InsightIcon,
  Warning as AlertIcon,
  CheckCircle as SuccessIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAppStore } from '../../stores/appStore';
import { getInsights, buildBusinessContext } from '../../services/ai';

interface Insight {
  id: number;
  type: 'success' | 'warning' | 'info' | 'prediction';
  title: string;
  description: string;
  confidence?: number;
}

const DEFAULT_INSIGHTS: Insight[] = [
  { id: 1, type: 'prediction', title: 'Ready to Analyze', description: 'Tap refresh to get AI-powered insights based on your business data', confidence: undefined },
  { id: 2, type: 'success', title: 'AI Engine Online', description: 'NODAL AI is connected and ready to analyze your operations', confidence: undefined },
  { id: 3, type: 'info', title: 'Smart Benchmarking', description: 'Compare your metrics against 2,400+ similar SMEs on the AI Hub', confidence: undefined },
  { id: 4, type: 'warning', title: 'Stay Updated', description: 'Refresh periodically to get the latest AI recommendations', confidence: undefined },
];

interface AIInsightsPanelProps {
  insights?: Insight[];
}

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'prediction':
      return <TrendUpIcon sx={{ fontSize: 18 }} />;
    case 'warning':
      return <AlertIcon sx={{ fontSize: 18 }} />;
    case 'success':
      return <SuccessIcon sx={{ fontSize: 18 }} />;
    case 'info':
    default:
      return <InsightIcon sx={{ fontSize: 18 }} />;
  }
};

const getInsightColor = (type: string) => {
  switch (type) {
    case 'prediction':
      return { bg: 'rgba(124, 58, 237, 0.06)', color: '#7c3aed' };
    case 'warning':
      return { bg: 'rgba(217, 119, 6, 0.06)', color: '#d97706' };
    case 'success':
      return { bg: 'rgba(22, 163, 74, 0.06)', color: '#16a34a' };
    case 'info':
    default:
      return { bg: 'rgba(124, 58, 237, 0.06)', color: '#7c3aed' };
  }
};

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ insights: propInsights }) => {
  const { products, sales, cashFlow, businessProfile, getAiCache, setAiCache } = useAppStore();
  const [loading, setLoading] = useState(false);

  const cached = getAiCache('dashboard_insights');
  const insights: Insight[] = cached || propInsights || DEFAULT_INSIGHTS;

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const context = buildBusinessContext({ products, sales, cashFlow, businessProfile });
      const result = await getInsights('dashboard', context);
      setAiCache('dashboard_insights', result.map((r, i) => ({ id: i + 1, ...r })));
    } catch {
      // Keep current data
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card
      sx={{
        height: '100%',
        bgcolor: '#fff',
        border: '1px solid',
        borderColor: 'rgba(0,0,0,0.08)',
        boxShadow: 'none',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: '#7c3aed',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              width: 36,
              height: 36,
            }}
          >
            <AIIcon sx={{ color: 'white' }} />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="white">
              Insights
            </Typography>
          </Box>
        </Box>
        <Tooltip title={cached ? 'Refresh insights' : 'Get live AI insights'}>
          <IconButton size="small" onClick={handleRefresh} disabled={loading} sx={{ color: 'white' }}>
            <RefreshIcon sx={{ fontSize: 20, animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
          </IconButton>
        </Tooltip>
      </Box>

      <CardContent sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={24} sx={{ color: '#7c3aed' }} />
            <Typography variant="body2" color="text.secondary">Generating live insights...</Typography>
          </Box>
        )}
        {!loading && insights.map((insight, index) => {
          const colors = getInsightColor(insight.type);
          return (
            <Box
              key={insight.id}
              sx={{
                p: 2,
                borderBottom: index < insights.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.02)',
                },
                transition: 'background-color 0.2s',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: colors.bg,
                    color: colors.color,
                    flexShrink: 0,
                  }}
                >
                  {getInsightIcon(insight.type)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                    {insight.title}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ mt: 0.25, lineHeight: 1.4 }}
                  >
                    {insight.description}
                  </Typography>
                  {insight.confidence && (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          AI Confidence
                        </Typography>
                        <Typography variant="caption" fontWeight={600} color={colors.color}>
                          {insight.confidence}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={insight.confidence}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          bgcolor: 'rgba(0,0,0,0.06)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 2,
                              backgroundColor: colors.color,
                          },
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
      </CardContent>

      {/* Footer */}
      <Box
        sx={{
          p: 1.5,
          bgcolor: 'rgba(0,0,0,0.02)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Updated just now
        </Typography>
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: '#16a34a',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 },
            },
          }}
        />
      </Box>
    </Card>
  );
};

export default AIInsightsPanel;
