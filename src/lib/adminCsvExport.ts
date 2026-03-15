import { format } from 'date-fns';
import { watermarkCsv, type WatermarkPayload } from './exportWatermark';

/**
 * Reusable CSV export utility for admin modules.
 * Supports UTF-8 BOM for Thai character compatibility.
 * Optionally embeds invisible watermarks for PDPA traceability.
 */

export interface CsvColumn<T> {
  key: string;
  header: string;
  /** Custom formatter. Receives the row and returns a string. */
  format?: (row: T) => string;
}

/** Generate a standardized filename: testd_{module}_{date}.csv */
export function csvFilename(module: string, dateRange?: { from?: string; to?: string }): string {
  const datePart = dateRange?.from && dateRange?.to
    ? `${dateRange.from}_to_${dateRange.to}`
    : format(new Date(), 'yyyy-MM-dd');
  return `testd_${module}_${datePart}.csv`;
}

/** Escape a CSV cell value (handles commas, quotes, newlines) */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Format a date string to a human-readable format */
export function formatCsvDate(dateStr: string | null | undefined, includeTime = true): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return includeTime
      ? format(d, 'yyyy-MM-dd HH:mm:ss')
      : format(d, 'yyyy-MM-dd');
  } catch {
    return dateStr || '';
  }
}

/** Convert rows to CSV string with UTF-8 BOM for Thai support */
export function rowsToCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const BOM = '\uFEFF';
  const headerRow = columns.map(c => escapeCell(c.header)).join(',');
  const dataRows = rows.map(row =>
    columns.map(col => {
      if (col.format) return escapeCell(col.format(row));
      const value = (row as Record<string, unknown>)[col.key];
      return escapeCell(value);
    }).join(',')
  );
  return BOM + [headerRow, ...dataRows].join('\n');
}

/** Download a CSV string as a file */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** All-in-one: export rows to a downloadable CSV file */
export function exportToCsv<T>(
  rows: T[],
  columns: CsvColumn<T>[],
  module: string,
  dateRange?: { from?: string; to?: string }
): void {
  const csv = rowsToCsv(rows, columns);
  const filename = csvFilename(module, dateRange);
  downloadCsv(csv, filename);
}
