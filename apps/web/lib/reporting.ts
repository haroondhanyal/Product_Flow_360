export type SheetData = { name: string; rows: string[][] };
export type ExcelReport = { id: string; fileName: string; createdAt: string; sheets: SheetData[] };
export const MAX_REPORT_ROWS = 20_000;
export const MAX_REPORT_COLUMNS = 100;

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  const addCell = () => { row.push(cell); cell = ''; if (row.length > MAX_REPORT_COLUMNS) throw new Error('Maximum 100 columns per sheet.'); };
  const addRow = () => { addCell(); if (row.some(value => value.trim())) rows.push(row); row = []; if (rows.length > MAX_REPORT_ROWS + 20) throw new Error('Maximum 20,000 data rows per workbook.'); };
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted || !cell) quoted = !quoted;
      else cell += char;
    } else if (char === ',' && !quoted) addCell();
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && input[i + 1] === '\n') i++; addRow(); }
    else cell += char;
    if (cell.length > 32767) throw new Error('A cell exceeds the 32,767 character limit.');
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  if (cell || row.length) addRow();
  return rows;
}

export function normalizeStatus(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[_-]/g, ' ');
  if (['pass', 'passed', 'success', 'successful', 'ok'].includes(normalized)) return 'Passed';
  if (['fail', 'failed', 'failure', 'not ok'].includes(normalized)) return 'Failed';
  if (['blocked', 'block', 'on hold'].includes(normalized)) return 'Blocked';
  if (['not run', 'not executed', 'pending', 'todo', 'to do', 'draft', 'ready'].includes(normalized)) return 'Not run';
  if (['in progress', 'running', 'executing'].includes(normalized)) return 'In progress';
  return value.trim() || 'Unclassified';
}
export function findColumn(headers: string[], aliases: string[]): number {
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  return headers.findIndex(header => aliases.some(alias => clean(alias) === clean(header)));
}
export function sheetTable(sheet: SheetData, headerRow: number) {
  const source = sheet.rows[headerRow] ?? [];
  const width = Math.max(source.length, ...sheet.rows.slice(headerRow + 1).map(row => row.length), 0);
  const headers = Array.from({length: width}, (_, index) => source[index]?.trim() || `Column ${index + 1}`);
  const rows = sheet.rows.slice(headerRow + 1).filter(row => row.some(value => value.trim()));
  return { headers, rows };
}
export function summarize(rows: string[][], statusColumn: number, ownerColumn = -1) {
  const counts: Record<string, number> = Object.create(null);
  const owners: Record<string, number> = Object.create(null);
  for (const row of rows) {
    const status = statusColumn < 0 ? 'Unclassified' : normalizeStatus(row[statusColumn] ?? '');
    counts[status] = (counts[status] ?? 0) + 1;
    if (ownerColumn >= 0) { const owner = row[ownerColumn]?.trim() || 'Unassigned'; owners[owner] = (owners[owner] ?? 0) + 1; }
  }
  const passed = counts.Passed ?? 0, failed = counts.Failed ?? 0;
  return { counts, owners, total: rows.length, passed, failed, blocked: counts.Blocked ?? 0,
    passRate: passed + failed ? Math.round(passed / (passed + failed) * 1000) / 10 : null };
}

// Validate the ZIP directory before ExcelJS inflates workbook XML in the worker.
export function checkWorkbookArchive(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  let end = -1;
  for (let index = buffer.byteLength - 22; index >= Math.max(0, buffer.byteLength - 65557); index--) {
    if (view.getUint32(index, true) === 0x06054b50) { end = index; break; }
  }
  if (end < 0) throw new Error('This file is not a valid XLSX workbook.');
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true), expanded = 0;
  if (count === 65535 || count > 5000 || offset === 0xffffffff) throw new Error('Workbook archive is too complex. Split it into smaller workbooks.');
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw new Error('Workbook archive is damaged.');
    if (view.getUint16(offset + 8, true) & 1) throw new Error('Password-protected workbooks are not supported.');
    expanded += view.getUint32(offset + 24, true);
    if (expanded > 100 * 1024 * 1024) throw new Error('Expanded workbook exceeds 100 MB. Split it before importing.');
    offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
}
