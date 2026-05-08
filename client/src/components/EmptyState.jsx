import React from 'react';
import { Box, Typography, Button } from '@mui/material';

export default function EmptyState({
  icon = '📭',
  title = 'No items',
  description = '',
  actionLabel,
  onAction,
  variant = 'empty',
}) {
  const isError = variant === 'error';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        border: '1.5px dashed',
        borderColor: isError ? '#d32f2f' : 'grey.200',
        borderRadius: 3,
        bgcolor: isError ? '#fff5f5' : '#fafafa',
        textAlign: 'center',
      }}
    >
      <Typography sx={{ fontSize: 52 }}>{icon}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 320 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          sx={{ mt: 2, bgcolor: '#ea9b20', '&:hover': { bgcolor: '#d78412' } }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
