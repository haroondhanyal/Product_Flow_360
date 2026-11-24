import { NextResponse } from 'next/server';
import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';

export const runtime = 'nodejs';
export const maxDuration = 15;

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss', '.json', '.md', '.yml', '.yaml', '.sql', '.py', '.html']);
const ignored = new Set(['.git', '.next', 'node_modules', 'dist', 'build', 'coverage', 'test-results', 'allure-results', 'reports', 'fixtures', 'screenshots']);
const stopWords = new Set(['find', 'search', 'locate', 'where', 'what', 'which', 'show', 'tell', 'me', 'is', 'are', 'the', 'a', 'an', 'in', 'on', 'for', 'to', 'of', 'this', 'that', 'file', 'files', 'project', 'source', 'code', 'please', 'path', 'system']);

type SearchMatch = { path: string; line: number; snippet: string; score: number };

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' && process.env.PF360_PROJECT_SEARCH_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Project source search is disabled in this deployment.' }, { status: 403 });
  }
  let query = '';
  try { const body = await request.json() as { query?: unknown }; query = typeof body.query === 'string' ? body.query.trim().slice(0, 180) : ''; }
  catch { return NextResponse.json({ error: 'Enter a project search query.' }, { status: 400 }); }
  if (query.length < 2) return NextResponse.json({ error: 'Enter at least two characters to search.' }, { status: 400 });

  const terms = [...new Set(query.toLowerCase().match(/[a-z0-9_-]{2,}/g) ?? [])].filter(term => !stopWords.has(term));
  if (!terms.length) return NextResponse.json({ results: [] });

  // Search only this ProductFlow repository's application and automation source.
  const root = resolve(process.cwd(), '../..');
  const searchRoots = ['apps/web', 'apps/api', 'playwright'];
  const matches: SearchMatch[] = [];
  let visited = 0;

  async function walk(directory: string, depth: number): Promise<void> {
    if (depth > 9 || visited >= 3500) return;
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (visited >= 3500) return;
      if (entry.name.startsWith('.') || ignored.has(entry.name)) continue;
      const fullPath = resolve(directory, entry.name);
      if (!fullPath.startsWith(`${root}${sep}`)) continue;
      if (entry.isDirectory()) { await walk(fullPath, depth + 1); continue; }
      if (!entry.isFile() || !sourceExtensions.has(extname(entry.name).toLowerCase())) continue;
      visited++;
      const relativePath = relative(root, fullPath).split(sep).join('/');
      if (/(account|credential|secret|password|token|\.env)/i.test(relativePath)) continue;
      let text: string;
      try { const buffer = await readFile(fullPath); if (buffer.byteLength > 400_000 || buffer.includes(0)) continue; text = buffer.toString('utf8'); } catch { continue; }
      const lowerPath = relativePath.toLowerCase();
      const pathScore = terms.reduce((score, term) => score + (lowerPath.includes(term) ? 4 : 0), 0)
        + (terms.some(term => ['assistant', 'copilot'].includes(term)) && lowerPath.includes('product-copilot') ? 14 : 0)
        + (terms.includes('assistant') && lowerPath.includes('command-center-panel') ? 6 : 0);
      let best: SearchMatch | null = null;
      const lines = text.split(/\r?\n/);
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const lower = line.toLowerCase();
        const hitCount = terms.reduce((score, term) => score + (lower.includes(term) ? 1 : 0), 0)
          + (terms.some(term => ['assistant', 'copilot'].includes(term)) && /productcopilot|copilot/.test(lower) ? 1 : 0);
        const definitionScore = /^\s*export\s+(function|const|class|type|interface)\b/.test(line) ? 5 : 0;
        const score = pathScore + hitCount * 2 + definitionScore;
        if (!hitCount || (best && best.score >= score)) continue;
        best = { path: relativePath, line: index + 1, snippet: line.trim().replace(/\s+/g, ' ').slice(0, 220), score };
      }
      if (best) matches.push(best);
    }
  }

  try {
    for (const searchRoot of searchRoots) await walk(resolve(/*turbopackIgnore: true*/ root, searchRoot), 0);
    matches.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
    return NextResponse.json({ results: matches.slice(0, 12).map(({ path, line, snippet }) => ({ path, line, snippet })), searchedFiles: visited, scope: 'ProductFlow repository source' });
  } catch { return NextResponse.json({ error: 'Could not search the ProductFlow project files.' }, { status: 500 }); }
}
