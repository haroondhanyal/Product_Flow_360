import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const ollama = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const model = process.env.OLLAMA_MODEL || 'lfm3-omni:latest';

export async function GET() {
  try {
    const response = await fetch(`${ollama}/api/tags`, { signal: AbortSignal.timeout(1800), cache: 'no-store' });
    if (!response.ok) throw new Error('Ollama did not return its model list.');
    const data = await response.json() as { models?: { name: string }[] };
    const models = (data.models ?? []).map(item => item.name);
    return NextResponse.json({ available: true, model, installed: models.includes(model) || models.some(name => name.startsWith(`${model}:`)), models });
  } catch {
    return NextResponse.json({ available: false, model, installed: false, models: [] });
  }
}

export async function POST(request: Request) {
  let body: { mode?: string; messages?: { role: 'user' | 'assistant'; content: string; images?: string[] }[]; context?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid chat request.' }, { status: 400 }); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  if (!messages.length || messages.some(message => !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string')) {
    return NextResponse.json({ error: 'Add a message before sending.' }, { status: 400 });
  }
  const prompt = body.mode === 'support'
    ? 'You are PTCL Customer Support Copilot. Help with PTCL service questions in a friendly, clear way. Answer in the user’s language. Never claim access to live bills, accounts, outages, tickets, or customer records. Ask for non-sensitive details when needed, never request passwords or OTPs, and direct account-specific requests to official PTCL support. Clearly label estimates and uncertainty.'
    : 'You are ProductFlow 360 Product Copilot for PTCL product and delivery teams. Answer in the user’s language. Ground answers in the supplied workspace snapshot and files. Help with RFCs, requirements, product planning, market/commercial/CVM, testing, defects, release readiness, risks, and next actions. When local project file search results are supplied, cite the exact repository-relative path and line number, explain what the file contains, and do not claim files were opened or changed. Do not invent workspace facts; call out missing information and give actionable steps.';
  const context = typeof body.context === 'string' ? body.context.slice(0, 45000) : '';
  try {
    const response = await fetch(`${ollama}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(115000),
      body: JSON.stringify({ model, stream: false, keep_alive: '10m', options: { temperature: 0.2, num_predict: 512 }, messages: [{ role: 'system', content: `${prompt}\n\n${context ? `Workspace and file context:\n${context}` : ''}` }, ...messages.slice(-8)] }),
    });
    if (!response.ok) {
      const info = await response.text();
      return NextResponse.json({ error: response.status === 404 ? `Ollama model “${model}” is not installed. Run: ollama pull ${model}` : `Ollama request failed (${response.status}). ${info.slice(0, 240)}` }, { status: 502 });
    }
    const data = await response.json() as { message?: { content?: string }; error?: string };
    if (!data.message?.content) throw new Error(data.error || 'The local model returned an empty response.');
    return NextResponse.json({ answer: data.message.content, model });
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    return NextResponse.json({ error: detail.includes('fetch failed') || detail.includes('ECONNREFUSED') || detail.includes('timed out') ? 'Ollama is not responding. Start Ollama and install the selected model to use local AI.' : detail || 'Could not reach the local Ollama model.' }, { status: 503 });
  }
}
