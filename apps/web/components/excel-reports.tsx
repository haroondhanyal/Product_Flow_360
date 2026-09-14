'use client';

import { useEffect, useRef, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { allLocal, putLocal } from '../lib/local-db';
import { findColumn, sheetTable, summarize, type ExcelReport, type SheetData } from '../lib/reporting';
import { parseTestCases, TEST_STORAGE_KEY, type TestCase } from '../lib/test-cases';

function saveDownload(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], {type}));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExcelReports({requests}: {requests: {id: string; title: string}[]}) {
  const [reports, setReports] = useState<ExcelReport[]>([]);
  const [report, setReport] = useState<ExcelReport | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0), [headerRow, setHeaderRow] = useState(0);
  const [statusOverride, setStatusOverride] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [importRFC, setImportRFC] = useState('');
  const [page, setPage] = useState(0);
  const input = useRef<HTMLInputElement>(null), worker = useRef<Worker | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const operation = useRef(0);
  useEffect(() => {
    let mounted = true;
    allLocal<ExcelReport>().then(items => { if (mounted) setReports(items.filter(item => item.id.startsWith('report:')).sort((a,b) => b.createdAt.localeCompare(a.createdAt))); }).catch(() => { if (mounted) setError('Saved reports could not be loaded.'); });
    return () => { mounted = false; operation.current++; worker.current?.terminate(); if (timeout.current) clearTimeout(timeout.current); };
  }, []);
  const sheet = report?.sheets[sheetIndex];
  const table = sheet ? sheetTable(sheet, headerRow) : {headers: [], rows: []};
  const statusColumn = statusOverride ?? findColumn(table.headers, ['Status', 'Result', 'Test result', 'Test status', 'Execution status', 'Outcome']);
  const ownerColumn = findColumn(table.headers, ['Owner', 'Tester', 'Assigned to', 'Executed by', 'Assignee']);
  const summary = summarize(table.rows, statusColumn, ownerColumn);

  function resetSelection() { setSheetIndex(0); setHeaderRow(0); setStatusOverride(null); setPage(0); }
  function stop() { operation.current++; worker.current?.terminate(); worker.current = null; if (timeout.current) clearTimeout(timeout.current); setBusy(false); }
  async function loadFile(file?: File) {
    if (!file || busy) return;
    setError(''); setMessage('');
    if (!/\.(xlsx|csv)$/i.test(file.name)) { setError('Choose an .xlsx or .csv file. Save older .xls files as .xlsx in Excel first.'); return; }
    if (!file.size || file.size > 50 * 1024 * 1024) { setError('Choose a non-empty workbook up to 50 MB.'); return; }
    setBusy(true);
    const current = ++operation.current;
    try {
      const buffer = await file.arrayBuffer();
      if (current !== operation.current) return;
      const parser = new Worker(new URL('../lib/excel.worker.ts', import.meta.url));
      worker.current = parser;
      timeout.current = setTimeout(() => { if (current === operation.current) { stop(); setError('Workbook processing timed out. Split it into smaller files and try again.'); } }, 30_000);
      parser.onerror = () => { if (current === operation.current) { stop(); setError('Unable to process this workbook. Try a smaller XLSX or CSV file.'); } };
      parser.onmessage = async (event: MessageEvent<{sheets?: SheetData[]; error?: string}>) => {
        if (current !== operation.current) return;
        parser.terminate(); worker.current = null; if (timeout.current) clearTimeout(timeout.current);
        if (event.data.error || !event.data.sheets) { setBusy(false); setError(event.data.error ?? 'No sheets found.'); return; }
        const next: ExcelReport = {id: `report:${crypto.randomUUID()}`, fileName: file.name, createdAt: new Date().toISOString(), sheets: event.data.sheets};
        setReport(next); resetSelection();
        try {
          await putLocal(next);
          if (current === operation.current) { setReports(items => [next, ...items]); setMessage('Report generated and saved. Select a sheet to explore its results.'); }
        } catch { if (current === operation.current) setError('Report generated but could not be saved. Browser storage may be full. Download it before leaving this page.'); }
        finally { if (current === operation.current) setBusy(false); }
      };
      parser.postMessage({buffer, name: file.name}, [buffer]);
    } catch (error) { if (current === operation.current) { stop(); setError(error instanceof Error ? error.message : 'Unable to read file.'); } }
    finally { if (input.current) input.current.value = ''; }
  }

  async function exportReport() {
    if (!report || !sheet) return;
    setError('');
    try {
      const {Workbook} = await import('exceljs');
      const workbook = new Workbook();
      const overview = workbook.addWorksheet('Summary');
      overview.addRows([['PF360 report', report.fileName], ['Sheet', sheet.name], ['Generated at', new Date().toISOString()], ['Total rows', summary.total], ['Passed', summary.passed], ['Failed', summary.failed], ['Blocked', summary.blocked], ['Pass rate (Passed / Passed + Failed)', summary.passRate === null ? 'N/A' : `${summary.passRate}%`], [], ['Status', 'Count'], ...Object.entries(summary.counts)]);
      const data = workbook.addWorksheet('Extracted data'); data.addRow(table.headers); data.addRows(table.rows);
      for (const tab of [overview, data]) { tab.getRow(1).font = {bold: true}; tab.columns.forEach(column => { column.width = 28; }); tab.views = [{state: 'frozen', ySplit: 1}]; }
      const bytes = await workbook.xlsx.writeBuffer();
      saveDownload(new Uint8Array(bytes), 'PF360-report.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch { setError('The report could not be exported. Please try again.'); }
  }
  function importTests() {
    setError(''); setMessage('');
    if (!requests.some(request => request.id === importRFC)) { setError('Choose the RFC for these test cases.'); return; }
    const title = findColumn(table.headers, ['Title', 'Test case', 'Test case title', 'Test name', 'Scenario']);
    const steps = findColumn(table.headers, ['Steps', 'Test steps', 'Procedure']);
    const expected = findColumn(table.headers, ['Expected', 'Expected result', 'Expected outcome']);
    if ([title, steps, expected].some(index => index < 0)) { setError('Import requires Title (or Test case), Steps and Expected result columns. Reporting works without these columns.'); return; }
    const invalid = table.rows.map((row, index) => [title, steps, expected].every(column => row[column]?.trim()) ? -1 : index + headerRow + 2).filter(index => index >= 0);
    if (invalid.length) { setError(`No tests imported. Required values are missing in data rows: ${invalid.slice(0,10).join(', ')}${invalid.length > 10 ? '…' : ''}.`); return; }
    if (table.rows.length > 1000) { setError('Import up to 1,000 test cases at a time. Reporting still includes all rows.'); return; }
    try {
      const existing = parseTestCases(localStorage.getItem(TEST_STORAGE_KEY) ?? '[]');
      const importKey = `${report?.id}:${sheetIndex}:${headerRow}:${importRFC}`;
      if (existing.some(test => test.importKey === importKey)) { setError('This sheet has already been imported into this RFC.'); return; }
      const tests: TestCase[] = table.rows.map(row => ({id: `TC-${crypto.randomUUID().slice(0,8).toUpperCase()}`, requestId: importRFC, title: row[title].trim(), steps: row[steps].trim(), expected: row[expected].trim(), owner: row[ownerColumn]?.trim() || 'Unassigned', stage: 'QA', status: 'Draft', priority: 'Medium', preconditions: '', runs: [], importKey}));
      localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify([...tests, ...existing]));
      setMessage(`${tests.length} draft test cases imported. Review them in Test management before execution.`);
    } catch { setError('Test import could not be saved. Existing tests have not been changed.'); }
  }

  return <div className="report-workspace">
    <div className="test-intro"><div><span className="eyebrow">FROM SPREADSHEET TO INSIGHT</span><h2>Your Excel data. A report, automatically.</h2><p>Upload a workbook to extract rows, understand results and share a report.</p></div><span className="metric-icon green"><BarChart3 size={23}/></span></div>
    <div className="document-dropzone report-dropzone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void loadFile(event.dataTransfer.files[0]); }}><UploadCloud size={30}/><strong>{busy ? 'Reading workbook and building report…' : 'Drop an Excel workbook or CSV here'}</strong><span>XLSX / CSV · Up to 50 MB · 20,000 rows · 100 columns</span><button className="primary" disabled={busy} onClick={() => input.current?.click()}><FileSpreadsheet size={17}/>Choose spreadsheet</button>{busy && <button className="text-button" onClick={stop}>Cancel processing</button>}<input type="file" ref={input} className="sr-only" tabIndex={-1} aria-label="Upload spreadsheet" accept=".xlsx,.csv" disabled={busy} onChange={event => void loadFile(event.target.files?.[0])}/></div>
    {error && <div role="alert" className="inline-error">{error}</div>}{message && <p role="status" className="success-message">{message}</p>}
    {reports.length > 0 && <label className="saved-reports">Saved reports<select aria-label="Saved reports" value={report?.id ?? ''} onChange={event => { const chosen = reports.find(item => item.id === event.target.value); if (chosen) { setReport(chosen); resetSelection(); setMessage(''); setError(''); } }}><option value="" disabled>Select a saved report</option>{reports.map(item => <option key={item.id} value={item.id}>{item.fileName} · {new Date(item.createdAt).toLocaleString()}</option>)}</select></label>}
    {report && sheet && <>
      <section className="report-controls feature-form"><div className="section-title"><div><h2>{report.fileName}</h2><p>{report.sheets.length} sheets extracted · Source values are preserved</p></div><button className="text-button" onClick={() => void exportReport()}><Download size={16}/>Download report</button></div><div className="form-row"><label>Worksheet<select aria-label="Worksheet" value={sheetIndex} onChange={event => { setSheetIndex(Number(event.target.value)); setHeaderRow(0); setStatusOverride(null); setPage(0); }}>{report.sheets.map((sheet, index) => <option key={index} value={index}>{sheet.name}</option>)}</select></label><label>Header row (non-empty rows)<select aria-label="Header row" value={headerRow} onChange={event => { setHeaderRow(Number(event.target.value)); setStatusOverride(null); setPage(0); }}>{sheet.rows.slice(0,20).map((_,index) => <option key={index} value={index}>Row {index + 1}</option>)}</select></label><label>Status column<select aria-label="Status column" value={statusColumn} onChange={event => setStatusOverride(Number(event.target.value))}><option value={-1}>No status column</option>{table.headers.map((header,index) => <option key={index} value={index}>{header}</option>)}</select></label></div></section>
      <div className="test-summary report-summary">{[['Data rows',summary.total],['Passed',summary.passed],['Failed / blocked',summary.failed + summary.blocked],['Pass rate',summary.passRate === null ? 'N/A' : `${summary.passRate}%`]].map(([label,value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <p className="report-note">Pass rate = Passed ÷ (Passed + Failed). Blocked, unrun and unclassified rows are excluded from the rate. Formula cells use saved Excel results; formulas are not recalculated.</p>
      <div className="report-charts"><Breakdown title="Execution breakdown" entries={Object.entries(summary.counts)} total={summary.total}/><Breakdown title="Work by owner" entries={Object.entries(summary.owners)} total={summary.total}/></div>
      <section className="requests"><div className="section-title"><h2>Extracted data</h2><span className="subtle">{table.rows.length} rows · {table.headers.length} columns</span></div><div className="table-scroll"><table><thead><tr>{table.headers.map((header,index) => <th key={index}>{header}</th>)}</tr></thead><tbody>{table.rows.slice(page * 25, page * 25 + 25).map((row,index) => <tr key={index}>{table.headers.map((_,column) => <td key={column}>{row[column] || '—'}</td>)}</tr>)}</tbody></table></div><div className="table-footer"><button className="text-button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {Math.max(1,Math.ceil(table.rows.length / 25))}</span><button className="text-button" disabled={(page + 1) * 25 >= table.rows.length} onClick={() => setPage(page + 1)}>Next</button></div></section>
      <section className="test-editor feature-form"><h2>Turn this sheet into test cases</h2><p className="report-note">Requires Title, Steps and Expected result columns. Imported cases start as QA drafts; spreadsheet statuses do not create execution history.</p><label>Target RFC<select aria-label="Target RFC" value={importRFC} onChange={event => setImportRFC(event.target.value)}><option value="">Choose RFC</option>{requests.map(request => <option key={request.id} value={request.id}>{request.id} · {request.title}</option>)}</select></label><button className="primary" disabled={!table.rows.length} onClick={importTests}>Import as draft test cases</button></section>
    </>}
  </div>;
}

function Breakdown({title,entries,total}: {title: string; entries: [string,number][]; total: number}) {
  return <section className="breakdown"><h3>{title}</h3>{!entries.length && <p>No matching column detected.</p>}{entries.sort((a,b) => b[1] - a[1]).slice(0,12).map(([name,count]) => <div key={name}><span>{name}</span><strong>{count}</strong><div className="breakdown-track"><i style={{width: `${total ? count / total * 100 : 0}%`}}/></div></div>)}{entries.length > 12 && <p>Showing the 12 largest groups. All rows are included in totals and export.</p>}</section>;
}
