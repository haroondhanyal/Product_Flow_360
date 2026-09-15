'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ShieldCheck, Sparkles } from 'lucide-react';
import './command-assistant-tools.css';

export function CommandAssistantTools(){
 const [root,setRoot]=useState<HTMLElement|null>(null),[mode,setMode]=useState('local'),[message,setMessage]=useState('Local Workspace Assistant uses your saved PF360 records and never sends data outside the browser.');
 useEffect(()=>{const open=()=>window.setTimeout(()=>setRoot(document.querySelector('.flow-assistant')),0);window.addEventListener('pf360-command-center-open',open);return()=>window.removeEventListener('pf360-command-center-open',open)},[]);
 function choose(value:string){setMode(value);setMessage(value==='local'?'Local Workspace Assistant is active: deterministic delivery guidance, no external transfer.':'OpenAI API-ready mode selected. Connect a server-side API route and protected environment key to enable a real model response.');}
 function brief(){const text=`# PF360 Delivery Brief\n\nGenerated: ${new Date().toLocaleString()}\n\n## Recommended flow\n1. Prioritize the highest-impact RFC.\n2. Map requirements in RTM.\n3. Execute SIT, QA and UAT test cases.\n4. Attach evidence and close quality blockers.\n5. Review release readiness.\n`;const url=URL.createObjectURL(new Blob([text],{type:'text/markdown'}));const link=document.createElement('a');link.href=url;link.download='PF360-delivery-brief.md';link.click();URL.revokeObjectURL(url);setMessage('Delivery brief downloaded.');}
 if(!root)return null;
 return createPortal(<div className="assistant-tools"><div className="assistant-tools-heading"><Sparkles size={16}/><strong>Assistant mode</strong></div><select aria-label="Assistant mode" value={mode} onChange={event=>choose(event.target.value)}><option value="local">Local Workspace Assistant</option><option value="openai">OpenAI API-ready Assistant</option></select><p>{message}</p><div><button type="button" onClick={brief}><Download size={14}/>Export delivery brief</button><span><ShieldCheck size={14}/>Guardrails on</span></div></div>,root);
}
