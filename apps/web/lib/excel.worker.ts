import ExcelJS from 'exceljs';
import { checkWorkbookArchive, MAX_REPORT_COLUMNS, MAX_REPORT_ROWS, parseCSV, type SheetData } from './reporting';

self.onmessage = async (event: MessageEvent<{buffer: ArrayBuffer; name: string}>) => {
  try {
    const { buffer, name } = event.data;
    const sheets: SheetData[] = [];
    if (name.toLowerCase().endsWith('.csv')) sheets.push({name: 'CSV data', rows: parseCSV(new TextDecoder().decode(buffer))});
    else {
      checkWorkbookArchive(buffer);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      if (workbook.worksheets.length > 30) throw new Error('Maximum 30 sheets per workbook.');
      let totalRows = 0;
      workbook.eachSheet(sheet => {
        if (sheet.columnCount > MAX_REPORT_COLUMNS) throw new Error('Maximum 100 columns per sheet.');
        const rows: string[][] = [];
        sheet.eachRow(row => {
          const values: string[] = [];
          row.eachCell({includeEmpty: true}, (cell, column) => {
            // Formula results are cached workbook values. Formulas/macros are never executed.
            const value = cell.value;
            const text = value && typeof value === 'object' && 'formula' in value
              ? value.result == null ? '' : String(value.result)
              : cell.text;
            if (text.length > 32767) throw new Error('A cell exceeds 32,767 characters.');
            values[column - 1] = text;
          });
          if (values.some(value => value?.trim())) {
            rows.push(Array.from({length: values.length}, (_, i) => values[i] ?? ''));
            totalRows++;
            if (totalRows > MAX_REPORT_ROWS + 30) throw new Error('Maximum 20,000 data rows per workbook.');
          }
        });
        if (rows.length) sheets.push({name: sheet.name, rows});
      });
    }
    if (!sheets.length) throw new Error('No data was found in this workbook.');
    self.postMessage({sheets});
  } catch (error) { self.postMessage({error: error instanceof Error ? error.message : 'Unable to read this workbook.'}); }
};
