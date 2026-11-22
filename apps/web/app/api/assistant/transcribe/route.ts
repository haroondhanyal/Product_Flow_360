import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 180;

const ollama = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const model = process.env.OLLAMA_MODEL || 'lfm3-omni:latest';

export async function POST(request: Request) {
  let body: { audio?: string; language?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Could not read the voice note.' }, { status: 400 }); }
  if (typeof body.audio !== 'string' || body.audio.length > 2_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.audio)) {
    return NextResponse.json({ error: 'Voice note is invalid or longer than the 15-second limit.' }, { status: 413 });
  }
  const language = typeof body.language === 'string' && /^[a-z-]{2,12}$/i.test(body.language) ? body.language : 'ur-PK';
  try {
    const response = await fetch(`${ollama}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(170000),
      body: JSON.stringify({ model, stream: false, keep_alive: '10m', options: { temperature: 0.1, num_predict: 256 }, messages: [{ role: 'user', content: `Transcribe this short voice note exactly in its original language and script. Language hint: ${language}. Do not translate, summarize, or add commentary. Return only the transcription.`, images: [body.audio] }] }),
    });
    if (!response.ok) return NextResponse.json({ error: `Local voice transcription failed (${response.status}).` }, { status: 502 });
    const data = await response.json() as { message?: { content?: string } };
    if (!data.message?.content?.trim()) return NextResponse.json({ error: 'The local model returned an empty transcript. Try a clearer recording.' }, { status: 502 });
    return NextResponse.json({ transcript: data.message.content.trim(), model });
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    return NextResponse.json({ error: detail.includes('fetch failed') || detail.includes('ECONNREFUSED') || detail.includes('timed out') ? 'Local Ollama could not transcribe this note. Check that Ollama is running.' : detail || 'Local voice transcription failed.' }, { status: 503 });
  }
}
