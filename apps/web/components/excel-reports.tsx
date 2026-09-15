'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, Paperclip, Pencil, Plus, Save, Search, SlidersHorizontal, Trash2, UploadCloud, X } from 'lucide-react';
import { allLocal, deleteLocal, putLocal } from '../lib/local-db';
import { RfcDocuments } from './rfc-documents';
import { findColumn, normalizeStatus, sheetTable, summarize, type ExcelReport, type SheetData } from '../lib/reporting';
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
  const [dataQuery, setDataQuery] = useState(''), [dataStatus, setDataStatus] = useState('All statuses'), [dataOwner, setDataOwner] = useState('All owners'), [sortBy, setSortBy] = useState('original');
  const [editingRow, setEditingRow] = useState<number | null>(null), [rowDraft, setRowDraft] = useState<string[]>([]);
  const [addingRow, setAddingRow] = useState(false), [evidenceRow, setEvidenceRow] = useState<number | null>(null);
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
  const dataRows = sheet ? sheet.rows.slice(headerRow + 1).map((row, offset) => ({row, sourceIndex: headerRow + offset + 1})).filter(({row}) => row.some(value => value.trim())) : [];
  const statusColumn = statusOverride ?? findColumn(table.headers, ['Status', 'Result', 'Test result', 'Test status', 'Execution status', 'Outcome']);
  const ownerColumn = findColumn(table.headers, ['Owner', 'Tester', 'Assigned to', 'Executed by', 'Assignee']);
  const summary = summarize(table.rows, statusColumn, ownerColumn);
  const statusOptions = useMemo(() => Object.keys(summary.counts).sort(), [summary.counts]);
  const ownerOptions = useMemo(() => Object.keys(summary.owners).sort(), [summary.owners]);
  const filteredDataRows = useMemo(() => dataRows.filter(({row}) => {
    const matchesQuery = !dataQuery.trim() || row.join(' ').toLowerCase().includes(dataQuery.trim().toLowerCase());
    const matchesStatus = dataStatus === 'All statuses' || (statusColumn >= 0 && normalizeStatus(row[statusColumn] ?? '') === dataStatus);
    const matchesOwner = dataOwner === 'All owners' || (ownerColumn >= 0 && (row[ownerColumn] ?? '').trim().toLowerCase() === dataOwner.toLowerCase());
    return matchesQuery && matchesStatus && matchesOwner;
  }).sort((a, b) => sortBy === 'original' ? a.sourceIndex - b.sourceIndex : (a.row[Number(sortBy)] ?? '').localeCompare(b.row[Number(sortBy)] ?? '', undefined, {numeric: true})), [dataRows, dataOwner, dataQuery, dataStatus, ownerColumn, sortBy, statusColumn]);
  const dashboard = useMemo(() => reports.reduce((total, saved) => {
    const savedTable = saved.sheets[0] ? sheetTable(saved.sheets[0], 0) : {headers: [], rows: []};
    const savedStatus = findColumn(savedTable.headers, ['Status', 'Result', 'Test result', 'Test status', 'Execution status', 'Outcome']);
    const savedSummary = summarize(savedTable.rows, savedStatus);
    return {reports: total.reports + 1, rows: total.rows + savedSummary.total, failed: total.failed + savedSummary.failed + savedSummary.blocked};
  }, {reports: 0, rows: 0, failed: 0}), [reports]);

  function resetSelection() { setSheetIndex(0); setHeaderRow(0); setStatusOverride(null); setPage(0); setDataQuery(''); setDataStatus('All statuses'); setDataOwner('All owners'); setSortBy('original'); setEditingRow(null); setAddingRow(false); setEvidenceRow(null); }
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
      const exportedRows = filteredDataRows.map(({row}) => row);
      const exportedSummary = summarize(exportedRows, statusColumn, ownerColumn);
      const overview = workbook.addWorksheet('Summary');
      overview.addRows([['PF360 report', report.fileName], ['Sheet', sheet.name], ['Generated at', new Date().toISOString()], ['Exported rows', exportedSummary.total], ['Passed', exportedSummary.passed], ['Failed', exportedSummary.failed], ['Blocked', exportedSummary.blocked], ['Pass rate (Passed / Passed + Failed)', exportedSummary.passRate === null ? 'N/A' : `${exportedSummary.passRate}%`], [], ['Status', 'Count'], ...Object.entries(exportedSummary.counts)]);
      const data = workbook.addWorksheet('Extracted data'); data.addRow(table.headers); data.addRows(exportedRows);
      for (const tab of [overview, data]) { tab.getRow(1).font = {bold: true}; tab.columns.forEach(column => { column.width = 28; }); tab.views = [{state: 'frozen', ySplit: 1}]; }
      const bytes = await workbook.xlsx.writeBuffer();
      saveDownload(new Uint8Array(bytes), 'PF360-filtered-report.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch { setError('The report could not be exported. Please try again.'); }
  }
  async function deleteReport() {
    if (!report) return;
    if (!window.confirm(`Delete “${report.fileName}”? Its extracted data will be removed from this browser.`)) return;
    setError(''); setMessage('');
    try {
      await deleteLocal(report.id);
      const remaining = reports.filter(item => item.id !== report.id);
      setReports(remaining); setReport(remaining[0] ?? null); resetSelection();
      setMessage('Report deleted.');
    } catch { setError('The report could not be deleted. Please try again.'); }
  }
  async function saveReportData(next: ExcelReport, success: string) {
    try { await putLocal(next); setReport(next); setReports(items => items.map(item => item.id === next.id ? next : item)); setMessage(`${success} Summary, charts and the downloaded report now use the updated data.`); setError(''); }
    catch { setError('Your changes could not be saved. Browser storage may be full.'); }
  }
  async function updateRow(sourceIndex: number, values: string[]) {
    if (!report) return;
    const next = {...report, sheets: report.sheets.map((candidate, index) => index === sheetIndex ? {...candidate, rows: candidate.rows.map((row, rowIndex) => rowIndex === sourceIndex ? values : row)} : candidate)};
    await saveReportData(next, 'Extracted data updated.'); setEditingRow(null);
  }
  async function addRow() {
    if (!report || !rowDraft.some(value => value.trim())) { setError('Add at least one value before saving the row.'); return; }
    const next = {...report, sheets: report.sheets.map((candidate, index) => index === sheetIndex ? {...candidate, rows: [...candidate.rows, rowDraft]} : candidate)};
    await saveReportData(next, 'New row added to extracted data.'); setAddingRow(false); setRowDraft([]);
  }
  async function deleteRow(sourceIndex: number) {
    if (!report || !window.confirm('Delete this extracted data row?')) return;
    const next = {...report, sheets: report.sheets.map((candidate, index) => index === sheetIndex ? {...candidate, rows: candidate.rows.map((row, rowIndex) => rowIndex === sourceIndex ? Array.from({length: row.length}, () => '') : row)} : candidate)};
    await saveReportData(next, 'Extracted data row deleted.');
    if (evidenceRow === sourceIndex) setEvidenceRow(null);
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
    {reports.length > 0 && <div className="test-summary report-library-summary"><article><span>Saved reports</span><strong>{dashboard.reports}</strong></article><article><span>Extracted rows</span><strong>{dashboard.rows}</strong></article><article><span>Failed / blocked</span><strong>{dashboard.failed}</strong></article><article><span>Report health</span><strong>{dashboard.rows ? `${Math.round((dashboard.rows - dashboard.failed) / dashboard.rows * 100)}%` : '—'}</strong></article></div>}
    {reports.length > 0 && <section className="saved-reports" aria-label="Saved report actions"><label>Saved reports<select aria-label="Saved reports" value={report?.id ?? ''} onChange={event => { const chosen = reports.find(item => item.id === event.target.value); if (chosen) { setReport(chosen); resetSelection(); setMessage(''); setError(''); } }}><option value="" disabled>Select a saved report</option>{reports.map(item => <option key={item.id} value={item.id}>{item.fileName} · {new Date(item.createdAt).toLocaleString()}</option>)}</select></label><div className="report-actions"><button className="text-button" onClick={() => input.current?.click()}><Plus size={16}/>Add another report</button><button className="text-button danger-action" disabled={!report} onClick={() => void deleteReport()}><Trash2 size={16}/>Delete selected report</button></div></section>}
    {report && sheet && <>
      <section className="report-controls feature-form"><div className="section-title"><div><h2>{report.fileName}</h2><p>{report.sheets.length} sheets extracted · Source values are preserved</p></div><button className="text-button" onClick={() => void exportReport()}><Download size={16}/>Download filtered report</button></div><div className="form-row"><label>Worksheet<select aria-label="Worksheet" value={sheetIndex} onChange={event => { setSheetIndex(Number(event.target.value)); setHeaderRow(0); setStatusOverride(null); setPage(0); setEditingRow(null); setEvidenceRow(null); }}>{report.sheets.map((sheet, index) => <option key={index} value={index}>{sheet.name}</option>)}</select></label><label>Header row (non-empty rows)<select aria-label="Header row" value={headerRow} onChange={event => { setHeaderRow(Number(event.target.value)); setStatusOverride(null); setPage(0); setEditingRow(null); setEvidenceRow(null); }}>{sheet.rows.slice(0,20).map((_,index) => <option key={index} value={index}>Row {index + 1}</option>)}</select></label><label>Status column<select aria-label="Status column" value={statusColumn} onChange={event => setStatusOverride(Number(event.target.value))}><option value={-1}>No status column</option>{table.headers.map((header,index) => <option key={index} value={index}>{header}</option>)}</select></label></div></section>
      <div className="test-summary report-summary">{[['Data rows',summary.total],['Passed',summary.passed],['Failed / blocked',summary.failed + summary.blocked],['Pass rate',summary.passRate === null ? 'N/A' : `${summary.passRate}%`]].map(([label,value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <p className="report-note">Pass rate = Passed ÷ (Passed + Failed). Blocked, unrun and unclassified rows are excluded from the rate. Formula cells use saved Excel results; formulas are not recalculated.</p>
      <div className="report-charts"><Breakdown title="Execution breakdown" entries={Object.entries(summary.counts)} total={summary.total}/><Breakdown title="Work by owner" entries={Object.entries(summary.owners)} total={summary.total}/></div>
      <section className="requests extracted-data"><div className="section-title"><div><h2>Extracted data</h2><span className="subtle">{filteredDataRows.length} of {table.rows.length} rows · {table.headers.length} columns</span></div><button className="text-button" onClick={() => { setAddingRow(true); setEditingRow(null); setRowDraft(Array.from({length: table.headers.length}, () => '')); }}><Plus size={16}/>Add row</button></div><p className="report-note">Every row keeps its own actions together: edit/update, attach screenshots or evidence, and delete.</p><div className="table-toolbar report-data-toolbar"><label className="search"><Search size={17}/><input aria-label="Search extracted data" placeholder="Search any extracted value…" value={dataQuery} onChange={event => { setDataQuery(event.target.value); setPage(0); }}/></label><label className="filter"><SlidersHorizontal size={15}/><select aria-label="Filter extracted status" value={dataStatus} onChange={event => { setDataStatus(event.target.value); setPage(0); }}><option>All statuses</option>{statusOptions.map(value => <option key={value}>{value}</option>)}</select></label><label className="filter"><select aria-label="Filter extracted owner" value={dataOwner} onChange={event => { setDataOwner(event.target.value); setPage(0); }}><option>All owners</option>{ownerOptions.map(value => <option key={value}>{value}</option>)}</select></label><label className="filter"><select aria-label="Sort extracted data" value={sortBy} onChange={event => { setSortBy(event.target.value); setPage(0); }}><option value="original">Original order</option>{table.headers.map((header,index) => <option key={index} value={index}>Sort by {header}</option>)}</select></label></div><div className="table-scroll"><table><thead><tr>{table.headers.map((header,index) => <th key={index}>{header}</th>)}<th className="action-column">Actions</th></tr></thead><tbody>{filteredDataRows.slice(page * 25, page * 25 + 25).map(({row,sourceIndex}) => <Fragment key={sourceIndex}><tr>{table.headers.map((header,column) => <td key={column}>{editingRow === sourceIndex ? <input aria-label={`Edit ${header}`} value={rowDraft[column] ?? ''} onChange={event => setRowDraft(values => values.map((value,index) => index === column ? event.target.value : value))}/> : row[column] || '—'}</td>)}<td className="row-actions">{editingRow === sourceIndex ? <><button className="row-action" onClick={() => void updateRow(sourceIndex, rowDraft)}><Save size={15}/>Update</button><button className="row-action" onClick={() => setEditingRow(null)}><X size={15}/>Cancel</button></> : <><button className="row-action" onClick={() => { setEditingRow(sourceIndex); setAddingRow(false); setRowDraft(Array.from({length: table.headers.length}, (_, index) => row[index] ?? '')); }}><Pencil size={15}/>Edit</button><button className="row-action" onClick={() => setEvidenceRow(open => open === sourceIndex ? null : sourceIndex)}><Paperclip size={15}/>Evidence</button><button className="row-action danger-action" onClick={() => void deleteRow(sourceIndex)}><Trash2 size={15}/>Delete</button></>}</td></tr>{evidenceRow === sourceIndex && <tr className="row-evidence"><td colSpan={table.headers.length + 1}><RfcDocuments requestId={`report-evidence:${report.id}:${sheetIndex}:${sourceIndex}`} evidence title={`Evidence for extracted row ${sourceIndex + 1}`} /></td></tr>}</Fragment>)}{addingRow && <tr className="new-row">{table.headers.map((header,column) => <td key={column}><input aria-label={`New ${header}`} value={rowDraft[column] ?? ''} onChange={event => setRowDraft(values => values.map((value,index) => index === column ? event.target.value : value))}/></td>)}<td className="row-actions"><button className="row-action" onClick={() => void addRow()}><Save size={15}/>Save</button><button className="row-action" onClick={() => setAddingRow(false)}><X size={15}/>Cancel</button></td></tr>}</tbody></table></div><div className="table-footer"><button className="text-button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {Math.max(1,Math.ceil(filteredDataRows.length / 25))}</span><button className="text-button" disabled={(page + 1) * 25 >= filteredDataRows.length} onClick={() => setPage(page + 1)}>Next</button></div></section>
      <section className="test-editor feature-form"><h2>Turn this sheet into test cases</h2><p className="report-note">Requires Title, Steps and Expected result columns. Imported cases start as QA drafts; spreadsheet statuses do not create execution history.</p><label>Target RFC<select aria-label="Target RFC" value={importRFC} onChange={event => setImportRFC(event.target.value)}><option value="">Choose RFC</option>{requests.map(request => <option key={request.id} value={request.id}>{request.id} · {request.title}</option>)}</select></label><button className="primary" disabled={!table.rows.length} onClick={importTests}>Import as draft test cases</button></section>
    </>}
  </div>;
}

function Breakdown({title,entries,total}: {title: string; entries: [string,number][]; total: number}) {
  return <section className="breakdown"><h3>{title}</h3>{!entries.length && <p>No matching column detected.</p>}{entries.sort((a,b) => b[1] - a[1]).slice(0,12).map(([name,count]) => <div key={name}><span>{name}</span><strong>{count}</strong><div className="breakdown-track"><i style={{width: `${total ? count / total * 100 : 0}%`}}/></div></div>)}{entries.length > 12 && <p>Showing the 12 largest groups. All rows are included in totals and export.</p>}</section>;
}
