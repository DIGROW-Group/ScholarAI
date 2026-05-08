import React from 'react';
import { Grid, Card, CardContent, Skeleton } from '@mui/material';

export default function StatCardSkeleton({ count = 4 }) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid item xs={12} sm={6} md={3} key={i}>
          <Card>
            <CardContent>
              <Skeleton width="60%" />
              <Skeleton width="40%" height={48} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
