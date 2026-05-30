import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Skeleton, Paper } from '@mui/material';

export default function AttendanceTableSkeleton({ rows = 5 }) {
  const cols = ['Date', 'Status', 'Check-In', 'Check-Out', 'Anomalies'];
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {cols.map((c) => (
              <TableCell key={c}><Skeleton width="80%" /></TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TableRow key={r}>
              {cols.map((c, i) => (
                <TableCell key={i}><Skeleton /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
