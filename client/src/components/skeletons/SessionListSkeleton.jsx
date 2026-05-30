import React from 'react';
import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material';

export default function SessionListSkeleton({ rows = 4 }) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i}>
          <CardContent>
            <Skeleton width="40%" height={24} />
            <Skeleton width="70%" height={18} sx={{ mt: 1 }} />
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Skeleton variant="rounded" width={60} height={28} />
              <Skeleton variant="rounded" width={60} height={28} />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
