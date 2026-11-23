'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, FileText, FolderSearch, LoaderCircle, Mic, MicOff, Paperclip, Plus, Send, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import type { AuthUser } from '../lib/auth';
import type { WorkRecord } from '../lib/lifecycle';
import type { TestCase } from '../lib/test-cases';
import { answerProductQuestion } from '../lib/product-assistant';

type Message = { role: 'user' | 'assistant'; content: string; images?: string[] };
type Attachment = { name: string; content: string; images?: string[] };
type Request = { id: string; title: string; product: string; status: string; priority: string; owner: string; date: string };
async function wavBase64(blob: Blob): Promise<string> {
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
    const channelCount = decoded.numberOfChannels; const sampleRate = 16000; const sampleCount = Math.ceil(decoded.duration * sampleRate);
    const pcm = new ArrayBuffer(44 + sampleCount * 2); const view = new DataView(pcm);
    const ascii = (offset: number, value: string) => { for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index)); };
    ascii(0, 'RIFF'); view.setUint32(4, 36 + sampleCount * 2, true); ascii(8, 'WAVE'); ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, 'data'); view.setUint32(40, sampleCount * 2, true);
    const channels = Array.from({ length: channelCount }, (_, index) => decoded.getChannelData(index)); const ratio = decoded.sampleRate / sampleRate;
    for (let index = 0; index < sampleCount; index++) { const start = Math.floor(index * ratio); const end = Math.min(decoded.length, Math.max(start + 1, Math.floor((index + 1) * ratio))); let value = 0; for (const channel of channels) { let part = 0; for (let sample = start; sample < end; sample++) part += channel[sample] ?? 0; value += part / (end - start) / channelCount; } const clipped = Math.max(-1, Math.min(1, value)); view.setInt16(44 + index * 2, clipped < 0 ? clipped * 32768 : clipped * 32767, true); }
    let binary = ''; const bytes = new Uint8Array(pcm); for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)); return btoa(binary);
  } finally { await audioContext.close(); }
}

async function readAttachment(file: File): Promise<Attachment> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (file.size > 50 * 1024 * 1024) throw new Error(`${file.name}: files must be under 50 MB.`);
  if (file.type.startsWith('image/')) return { name: file.name, content: `Image attached: ${file.name}`, images: [await imageData(file)] };
  if (['txt', 'csv', 'json', 'log', 'md', 'xml', 'html'].includes(ext ?? '')) return { name: file.name, content: (await file.text()).slice(0, 15000) };
  if (ext === 'xlsx' || ext === 'xls') {
    const { Workbook } = await import('exceljs'); const workbook = new Workbook();
    if (ext === 'xlsx') await workbook.xlsx.load(await file.arrayBuffer());
    else throw new Error(`${file.name}: legacy XLS is not supported; save it as XLSX or CSV.`);
    const content = workbook.worksheets.slice(0, 8).map(sheet => {
      const rows: string[] = []; sheet.eachRow((row, index) => { if (index <= 250) { const values: string[] = []; row.eachCell({ includeEmpty: true }, cell => values.push(cell.text)); rows.push(values.join('\t')); } });
      return `Sheet: ${sheet.name}\n${rows.join('\n')}`;
    }).join('\n\n').slice(0, 15000);
    return { name: file.name, content };
  }
  if (ext === 'docx') {
    const JSZip = (await import('jszip')).default; const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const xml = await zip.file('word/document.xml')?.async('text');
    if (!xml) throw new Error(`${file.name}: could not read the Word document.`);
    const content = xml.replace(/<w:tab\s*\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').slice(0, 15000);
    return { name: file.name, content };
  }
  if (ext === 'pdf') {
    const form = new FormData(); form.set('file', file);
    const response = await fetch('/api/assistant/extract', { method: 'POST', body: form }); const data = await response.json();
    if (!response.ok) throw new Error(`${file.name}: ${data.error || 'PDF could not be read.'}`);
    return { name: file.name, content: data.content };
  }
  if (['mp4', 'webm', 'mov'].includes(ext ?? '')) {
    const images = await videoFrames(file);
    return { name: file.name, content: `Video: ${file.name}. The model can inspect ${images.length} sampled frames; audio/transcription is not included.`, images };
  }
  throw new Error(`${file.name}: supported AI files are TXT, CSV, JSON, LOG, MD, DOCX, XLSX, images and MP4/WebM/MOV video frames.`);
}

async function imageData(file: File): Promise<string> {
  const image = await createImageBitmap(file); const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height); image.close();
  return canvas.toDataURL('image/jpeg', .78).split(',')[1] ?? '';
}
async function videoFrames(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video'); video.preload = 'metadata'; video.muted = true; video.src = url;
    await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('This video format could not be opened in your browser.')); });
    const canvas = document.createElement('canvas'); const scale = Math.min(1, 768 / Math.max(video.videoWidth, video.videoHeight)); canvas.width = Math.max(1, Math.round(video.videoWidth * scale)); canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const times = [...new Set([0, video.duration / 2, Math.max(0, video.duration - .25)])]; const frames: string[] = [];
    for (const time of times) { video.currentTime = time; await new Promise<void>((resolve, reject) => { video.onseeked = () => resolve(); video.onerror = () => reject(new Error('Could not sample a frame from this video.')); }); canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height); frames.push(canvas.toDataURL('image/jpeg', .72).split(',')[1] ?? ''); }
    return frames.filter(Boolean);
  } finally { URL.revokeObjectURL(url); }
}

export function ProductCopilot({ user, requests, tests, work, onClose }: { user: AuthUser; requests: Request[]; tests: TestCase[]; work: WorkRecord[]; onClose?: () => void }) {
  const [mode, setMode] = useState<'copilot' | 'support'>('copilot'); const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(''); const [files, setFiles] = useState<File[]>([]); const [busy, setBusy] = useState(false); const [recording, setRecording] = useState(false); const [transcribing, setTranscribing] = useState(false); const [voiceLanguage, setVoiceLanguage] = useState('ur-PK');
  const [status, setStatus] = useState<{ available: boolean; installed: boolean; model: string } | null>(null); const [notice, setNotice] = useState('');
  const thread = useRef<HTMLDivElement>(null); const composer = useRef<HTMLTextAreaElement>(null); const recorder = useRef<MediaRecorder | null>(null); const stream = useRef<MediaStream | null>(null); const chunks = useRef<Blob[]>([]); const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  async function checkStatus() { try { setStatus(await fetch('/api/assistant', { cache: 'no-store' }).then(response => response.json())); } catch { setStatus({ available: false, installed: false, model: 'lfm3-omni:latest' }); } }
  useEffect(() => { void checkStatus(); return () => { if (stopTimer.current) clearTimeout(stopTimer.current); recorder.current?.stream.getTracks().forEach(track => track.stop()); stream.current?.getTracks().forEach(track => track.stop()); }; }, []);
  useEffect(() => { thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy]);
  function addFiles(selected: FileList | File[]) { const incoming = Array.from(selected); setFiles(current => [...current, ...incoming].slice(0, 5)); if (files.length + incoming.length > 5) setNotice('A chat can include up to five files at a time.'); }
  async function send(event?: React.FormEvent, forceProjectSearch = false) {
    event?.preventDefault(); const question = input.trim(); if ((!question && !files.length) || busy) return;
    setBusy(true); setNotice(''); setInput('');
    const nextMessages: Message[] = [...messages, { role: 'user', content: question || 'Please review the attached files.' }]; setMessages(nextMessages);
    try {
      const attachments: Attachment[] = []; const failures: string[] = [];
      for (const file of files) { try { attachments.push(await readAttachment(file)); } catch (error) { failures.push(error instanceof Error ? error.message : `${file.name}: could not read file.`); } }
      if (failures.length) setNotice(failures.join(' '));
      if (files.length && !attachments.length) { setMessages(current => current.slice(0, -1)); setInput(question); return; }
      setFiles(failures.length ? files.filter(file => failures.some(failure => failure.startsWith(`${file.name}:`))) : []);
      const fileContext = attachments.map(file => `FILE: ${file.name}\n${file.content}`).join('\n\n');
      let projectContext = '';
      const wantsProjectSearch = mode === 'copilot' && (forceProjectSearch || (/(find|search|locate|where|path|file|folder|source|codebase|project)/i.test(question) && /(file|folder|path|source|code|project|component|module|assistant)/i.test(question)));
      if (wantsProjectSearch) {
        setNotice('Searching this ProductFlow project…');
        try {
          const result = await fetch('/api/assistant/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: question }) }).then(response => response.json());
          if (result.results?.length) projectContext = `LOCAL PROJECT FILE SEARCH (paths are relative to the ProductFlow repository root):\n${result.results.map((item: {path:string;line:number;snippet:string}) => `${item.path}:${item.line} — ${item.snippet}`).join('\n')}`;
          else if (result.error) projectContext = `Local project file search: ${result.error}`;
          else projectContext = 'Local project file search found no matching source files.';
        } catch { projectContext = 'Local project file search is unavailable in this environment.'; }
      }
      const images = attachments.flatMap(file => file.images ?? []);
      const withImages = [...nextMessages]; withImages[withImages.length - 1] = { ...withImages.at(-1)!, images };
      const workspace = mode === 'copilot' ? `Signed-in user: ${user.fullName}, ${user.designation}, ${user.department}.\nRFCs: ${JSON.stringify(requests)}\nTests: ${JSON.stringify(tests)}\nDelivery records: ${JSON.stringify(work)}` : '';
      if (wantsProjectSearch) setNotice('');
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: mode === 'support' ? 'support' : 'copilot', messages: withImages.slice(-8), context: [workspace, fileContext, projectContext].filter(Boolean).join('\n\n') }) });
      const data = await response.json();
      if (!response.ok) {
        const fallback = mode === 'copilot' && !attachments.length ? answerProductQuestion({ question, user, requests, tests, work }) : '';
        const localFiles = projectContext ? `\n\nProject file matches:\n${projectContext.replace('LOCAL PROJECT FILE SEARCH (paths are relative to the ProductFlow repository root):\n','')}` : '';
        setMessages(current => [...current, { role: 'assistant', content: `${data.error || 'The local assistant could not reply.'}${fallback ? `\n\nOffline workspace insight:\n${fallback}` : ''}${localFiles}` }]);
      } else setMessages(current => [...current, { role: 'assistant', content: data.answer }]);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not read those files.'); }
    finally { setBusy(false); }
  }
  async function toggleVoice() {
    if (recording) { recorder.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setNotice('Voice notes need a browser with microphone recording. Use a recent Chrome, Safari or Firefox.'); return; }
    try {
      setNotice(''); chunks.current = []; stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      const instance = new MediaRecorder(stream.current); recorder.current = instance;
      instance.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      instance.onerror = () => { setRecording(false); setTranscribing(false); setNotice('Recording failed. Check microphone access and try again.'); stream.current?.getTracks().forEach(track => track.stop()); };
      instance.onstop = () => { setRecording(false); stream.current?.getTracks().forEach(track => track.stop()); const note = new Blob(chunks.current, { type: instance.mimeType || 'audio/webm' }); if (stopTimer.current) clearTimeout(stopTimer.current); if (note.size) void transcribeVoice(note); };
      instance.start(250); setRecording(true); stopTimer.current = setTimeout(() => { if (instance.state === 'recording') instance.stop(); }, 15000);
    } catch { setRecording(false); setNotice('Microphone access was denied or could not start. Allow mic access, then try again.'); stream.current?.getTracks().forEach(track => track.stop()); }
  }
  async function transcribeVoice(note: Blob) {
    setTranscribing(true); setNotice('Transcribing locally with Ollama…');
    try {
      const audio = await wavBase64(note); const response = await fetch('/api/assistant/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio, language: voiceLanguage }) }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not transcribe the voice note.');
      setInput(current => current.trim() ? `${current.trim()} ${data.transcript}` : data.transcript); setNotice('Voice note transcribed locally. Review it, then send.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Local transcription failed.'); }
    finally { setTranscribing(false); }
  }
  function startNewChat() {
    if (recorder.current?.state === 'recording') {
      recorder.current.onstop = null;
      recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
    if (stopTimer.current) clearTimeout(stopTimer.current);
    setMessages([]); setInput(''); setFiles([]); setNotice('');
    requestAnimationFrame(() => composer.current?.focus());
  }
  const modelLabel = status?.model === 'lfm3-omni:latest' ? 'LFM3 Omni · local' : status?.model ?? 'Local AI';
  const suggestions = mode === 'copilot'
    ? [['Portfolio summary', 'Summarize my workspace and recommend the next three actions.'], ['Release risks', 'Which release blockers and high-priority risks need attention?'], ['Product brief', 'Help me draft a product brief for a new PTCL service idea.']]
    : [['Internet issue', 'My PTCL internet is slow. What should I check first?'], ['Billing help', 'How can I review a PTCL bill or request billing support?'], ['Contact support', 'What details should I prepare before contacting PTCL support?']];
  return <section className="flow-assistant copilot-chat" aria-label="AI assistant" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addFiles(event.dataTransfer.files); }}>
    <header className="copilot-head">
      <div className="copilot-title"><span className="copilot-mark"><Sparkles size={19}/></span><div><span className="copilot-kicker">PTCL PRODUCTFLOW 360</span><h2>AI Assistant</h2></div></div>
      <div className="copilot-controls"><button type="button" className={`ollama-status ${status?.available && status.installed ? 'online' : ''}`} onClick={() => void checkStatus()} title="Refresh local model connection" aria-live="polite"><i/>{status?.available && status.installed ? modelLabel : status?.available ? 'Model not found' : 'Connecting…'}</button><button type="button" className="icon-button" aria-label="Start new chat" title="Start a new chat and clear the current conversation" onClick={startNewChat}><Plus size={16}/></button>{onClose && <button type="button" className="icon-button" aria-label="Close assistant" title="Close assistant" onClick={onClose}><X size={17}/></button>}</div>
    </header>
    <div className="copilot-modes" role="tablist" aria-label="Assistant mode"><button role="tab" aria-selected={mode === 'copilot'} className={mode === 'copilot' ? 'active' : ''} onClick={() => setMode('copilot')}><Bot size={15}/>Product Copilot</button><button role="tab" aria-selected={mode === 'support'} className={mode === 'support' ? 'active' : ''} onClick={() => setMode('support')}><UserRound size={15}/>Customer Support</button><span className="assistant-user-chip">{user.fullName}</span></div>
    <div className="copilot-thread" ref={thread} aria-live="polite">
      {!messages.length && <div className="copilot-welcome"><div className="welcome-sparkle"><Sparkles size={23}/><i/></div><span className="copilot-kicker">{mode === 'copilot' ? 'YOUR PRODUCT DELIVERY PARTNER' : 'PTCL CUSTOMER SUPPORT'}</span><strong>{mode === 'copilot' ? `What would you like to move forward, ${user.fullName.split(' ')[0]}?` : 'How can we help you today?'}</strong><p>{mode === 'copilot' ? 'Get clear answers from your workspace, review a file, or plan your next delivery move.' : 'Get guidance for common PTCL service questions. Your account details stay private.'}</p><div className="assistant-prompt-grid">{suggestions.map(([label, prompt]) => <button type="button" key={label} onClick={() => setInput(prompt)}><Sparkles size={14}/><span>{label}</span><small>{prompt}</small></button>)}</div></div>}
      {messages.map((message, index) => <article key={index} className={`copilot-message ${message.role}`}><span>{message.role === 'assistant' ? <Bot size={16}/> : <UserRound size={16}/>}</span><div className="copilot-message-body">{message.role === 'assistant' && <small>PRODUCTFLOW ASSISTANT</small>}<p>{message.content}</p></div></article>)}
      {(busy || transcribing) && <div className="copilot-thinking"><LoaderCircle size={16}/>{transcribing ? 'Transcribing voice note on your local model…' : 'Checking workspace context and preparing your reply…'}</div>}
    </div>
    {files.length > 0 && <div className="copilot-files" aria-label="Files ready to share">{files.map((file, index) => <span key={`${file.name}-${index}`}><FileText size={14}/>{file.name}<button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(current => current.filter((_, item) => item !== index))}><X size={14}/></button></span>)}</div>}
    {notice && <p role="status" className="copilot-notice">{notice}</p>}
    <form className="copilot-compose" onSubmit={send}>
      <textarea ref={composer} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder={mode === 'copilot' ? 'Ask about products, projects, releases…' : 'Ask a PTCL service question…'} rows={2}/>
      <div className="copilot-compose-actions"><label className="copilot-file-picker" aria-label="Add files" title="Attach files for the assistant to review"><Paperclip size={16}/><span>Add files</span><input type="file" multiple disabled={busy} accept=".txt,.csv,.json,.log,.md,.xml,.html,.docx,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov" onChange={event => { addFiles(event.currentTarget.files ?? []); event.currentTarget.value = ''; }}/></label><label className="voice-language" title="Voice note language"><select aria-label="Voice input language" value={voiceLanguage} onChange={event => setVoiceLanguage(event.target.value)} disabled={recording}><option value="ur-PK">Urdu</option><option value="en-PK">English (Pakistan)</option><option value="en-US">English (US)</option><option value="hi-IN">Hindi</option></select></label><button type="button" className={`voice-note-button ${recording ? 'recording' : ''}`} onClick={toggleVoice} disabled={busy || transcribing} aria-label={recording ? 'Stop voice note' : 'Start voice note'} title={recording ? 'Stop voice note' : 'Record a voice note'}>{recording ? <MicOff size={16}/> : transcribing ? <LoaderCircle size={16}/> : <Mic size={16}/>}<span>{recording ? 'Stop' : transcribing ? 'Transcribing…' : 'Voice note'}</span></button><button type="button" className="project-search-button" disabled={busy || !input.trim()} onClick={() => void send(undefined, true)} title="Search ProductFlow source files and ask the local model"><FolderSearch size={16}/><span>Search project</span></button><button className="primary copilot-send" type="submit" disabled={busy || transcribing || recording || (!input.trim() && !files.length)}><Send size={15}/><span>Send</span></button></div>
    </form>
  </section>;
}
