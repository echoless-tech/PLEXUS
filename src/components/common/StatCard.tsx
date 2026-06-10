import React from 'react';
import { Card, CardContent, Box, Typography, Avatar } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  color,
}) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  // Flat solid colors
  const colorMap = {
    primary: '#1e293b',
    secondary: '#334155',
    success: '#1e293b',
    warning: '#1e293b',
    error: '#1e293b',
    info: '#1e293b',
  };

  const bgColorMap = {
    primary: 'rgba(30, 41, 59, 0.06)',
    secondary: 'rgba(30, 41, 59, 0.06)',
    success: 'rgba(30, 41, 59, 0.06)',
    warning: 'rgba(30, 41, 59, 0.06)',
    error: 'rgba(30, 41, 59, 0.06)',
    info: 'rgba(30, 41, 59, 0.06)',
  };

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#ffffff',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '3px',
        boxShadow: 'none',
        '&:hover': {
          borderColor: 'divider',
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.8rem',
                mb: 0.5,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                fontSize: '1.75rem',
                lineHeight: 1.2,
              }}
            >
              {value}
            </Typography>
            {change !== undefined && (
              <Box 
                sx={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  mt: 1,
                }}
              >
                {isPositive && (
                  <TrendingUp
                    sx={{ fontSize: 14, color: '#1e293b' }}
                  />
                )}
                {isNegative && (
                  <TrendingDown
                    sx={{ fontSize: 14, color: '#64748b' }}
                  />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    color: isPositive ? '#1e293b' : isNegative ? '#64748b' : 'text.secondary',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                >
                  {isPositive && '+'}
                  {change}%
                </Typography>
                {changeLabel && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
                    {changeLabel}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '3px',
              bgcolor: bgColorMap[color],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colorMap[color],
              '& svg': {
                fontSize: '1.4rem',
              },
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
