import React from 'react';
import { Grid, Card, CardContent, Skeleton, Box } from '@mui/material';

export default function DocumentCardSkeleton({ count = 3 }) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid item xs={12} sm={6} md={4} key={i}>
          <Card>
            <CardContent>
              <Skeleton variant="rectangular" width={80} height={24} />
              <Skeleton width="60%" sx={{ mt: 1 }} />
              <Skeleton width="40%" sx={{ mt: 0.5 }} />
              <Box sx={{ mt: 1 }}>
                <Skeleton width="100%" height={48} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
