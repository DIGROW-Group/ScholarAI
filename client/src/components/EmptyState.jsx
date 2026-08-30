import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { InboxOutlined, ErrorOutline } from '@mui/icons-material';

export default function EmptyState({
  icon,
  title = 'Aucune donnée',
  description = '',
  actionLabel,
  onAction,
  variant = 'empty',
}) {
  const isError = variant === 'error';
  const defaultIcon = isError ? (
    <ErrorOutline sx={{ fontSize: 44, color: '#EF4444' }} />
  ) : (
    <InboxOutlined sx={{ fontSize: 44, color: '#94A3B8' }} />
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        border: '1px dashed',
        borderColor: isError ? '#FCA5A5' : '#E2E8F0',
        borderRadius: 3,
        bgcolor: isError ? '#FEF2F2' : '#F8FAFC',
        textAlign: 'center',
      }}
    >
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {typeof icon === 'string' ? (
          <Typography sx={{ fontSize: 36 }}>{icon}</Typography>
        ) : (
          icon || defaultIcon
        )}
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5, color: isError ? '#991B1B' : 'text.primary' }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 360, fontSize: '0.85rem' }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button
          variant={isError ? "outlined" : "contained"}
          color={isError ? "error" : "primary"}
          onClick={onAction}
          sx={{ mt: 2, textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: '0.85rem' }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
