'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ShieldCheck, Sparkles } from 'lucide-react';
import './command-assistant-tools.css';

export function CommandAssistantTools(){
 const [root,setRoot]=useState<HTMLElement|null>(null),[message,setMessage]=useState('Answers are calculated from saved workspace records in this browser. No external AI service or API key is used.');
 useEffect(()=>{const open=()=>window.setTimeout(()=>setRoot(document.querySelector('.flow-assistant')),0);window.addEventListener('pf360-command-center-open',open);return()=>window.removeEventListener('pf360-command-center-open',open)},[]);
 function brief(){const text=`# PF360 Delivery Brief\n\nGenerated: ${new Date().toLocaleString()}\n\n## Recommended flow\n1. Prioritize the highest-impact RFC.\n2. Map requirements in RTM.\n3. Execute SIT, QA and UAT test cases.\n4. Attach evidence and close quality blockers.\n5. Review release readiness.\n`;const url=URL.createObjectURL(new Blob([text],{type:'text/markdown'}));const link=document.createElement('a');link.href=url;link.download='PF360-delivery-brief.md';link.click();URL.revokeObjectURL(url);setMessage('Delivery brief downloaded.');}
 if(!root)return null;
 return createPortal(<div className="assistant-tools"><div className="assistant-tools-heading"><Sparkles size={16}/><strong>Private workspace copilot</strong></div><p>{message}</p><div><button type="button" onClick={brief}><Download size={14}/>Export delivery brief</button><span><ShieldCheck size={14}/>Read-only advice</span></div></div>,root);
}
