import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

export const runtime = 'nodejs';
const run = promisify(execFile);
const maxBytes = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.pdf')) return NextResponse.json({ error: 'Upload a PDF document.' }, { status: 400 });
  if (!file.size || file.size > maxBytes) return NextResponse.json({ error: 'PDF must be between 1 byte and 25 MB.' }, { status: 413 });
  const folder = await mkdtemp(join(tmpdir(), 'pf360-pdf-'));
  try {
    const input = join(folder, 'document.pdf'); const output = join(folder, 'document.txt');
    await writeFile(input, Buffer.from(await file.arrayBuffer()));
    await run('pdftotext', ['-layout', input, output], { timeout: 12000, maxBuffer: 1024 * 1024 });
    const content = (await readFile(output, 'utf8')).slice(0, 15000);
    if (!content.trim()) return NextResponse.json({ error: 'No selectable text was found in this PDF. Scanned documents need OCR first.' }, { status: 422 });
    return NextResponse.json({ name: file.name, content });
  } catch (error) {
    const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT';
    return NextResponse.json({ error: missing ? 'PDF text extraction needs Poppler (pdftotext) installed on the app server.' : 'Could not extract text from this PDF. It may be encrypted or damaged.' }, { status: 422 });
  } finally { await rm(folder, { recursive: true, force: true }); }
}
