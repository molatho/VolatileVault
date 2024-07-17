import {
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableBody,
} from '@mui/material';
import { createRef, useEffect } from 'react';
import { useTheme } from '@mui/material';

interface EventTableProps {
  entries: EventEntry[];
}
export interface EventEntry {
  timestamp: Date;
  category: string;
  content: string;
  variant: 'error' | 'success' | undefined;
}

export function createLogEntry(
  category: string,
  content: string,
  variant?: 'error' | 'success'
): EventEntry {
  return {
    timestamp: new Date(Date.now()),
    category: category,
    content: content,
    variant: variant,
  };
}

export default function EventTable({ entries }: EventTableProps) {
  const summaryRef = createRef<HTMLTableRowElement>();

  useEffect(
    () => summaryRef.current?.scrollIntoView({ behavior: 'smooth' }),
    [entries]
  );

  const theme = useTheme();

  const createRow = (entry: EventEntry, idx: number) => {
    const backgroundColor = entry.variant
      ? entry.variant == 'success'
        ? theme.palette.success.main
        : theme.palette.error.main
      : undefined;
    const color = entry.variant
      ? theme.palette.getContrastText(backgroundColor as string)
      : theme.palette.text.primary;
    return (
      <TableRow key={idx}>
        <TableCell sx={{ backgroundColor, color }}>
          {entry.timestamp.toISOString().split('T')[1].split('.')[0]}
        </TableCell>
        <TableCell sx={{ backgroundColor, color }}>{entry.category}</TableCell>
        <TableCell sx={{ backgroundColor, color }}>{entry.content}</TableCell>
      </TableRow>
    );
  };

  return (
    <>
      <TableContainer component={Paper} sx={{ maxHeight: '300px' }}>
        <Table aria-label="simple table" size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Timestamp</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map(createRow)}
            <tr key="ref" ref={summaryRef}></tr>
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
