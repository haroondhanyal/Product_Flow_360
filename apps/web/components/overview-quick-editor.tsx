'use client';

import { useEffect, useState } from 'react';
import { Edit3, Save, X } from 'lucide-react';
import './overview-quick-editor.css';

type Request = {id:string;title:string;product:string;status:string;priority:string;owner:string;date:string};
function read(): Request[] { try { const items=JSON.parse(localStorage.getItem('pf360-requests')??'[]'); return Array.isArray(items)?items:[]; } catch { return []; } }

export function OverviewQuickEditor() {
 const [open,setOpen]=useState(false),[visible,setVisible]=useState(true),[requests,setRequests]=useState<Request[]>([]),[notice,setNotice]=useState('');
 useEffect(()=>{const handle=(event:Event)=>setVisible((event as CustomEvent<string>).detail==='Overview'||(event as CustomEvent<string>).detail==='Change requests');window.addEventListener('pf360-active-module',handle);return()=>window.removeEventListener('pf360-active-module',handle)},[]);
 function openEditor(){setRequests(read());setNotice('');setOpen(true)}
 function update(id:string,key:'priority'|'status',value:string){setRequests(items=>items.map(item=>item.id===id?{...item,[key]:value}:item))}
 function save(){try{localStorage.setItem('pf360-requests',JSON.stringify(requests));window.dispatchEvent(new Event('pf360-requests-changed'));setNotice('Board priorities and statuses updated.')}catch{setNotice('Updates could not be saved in this browser.')}}
 if(!visible)return null;
 return <><button className="overview-edit-launch" onClick={openEditor}><Edit3 size={16}/>Edit overview board</button>{open&&<div className="overview-edit-overlay" onClick={()=>setOpen(false)}><section className="overview-edit-panel" role="dialog" aria-modal="true" aria-label="Edit overview board" onClick={event=>event.stopPropagation()}><div className="section-title"><div><span className="eyebrow">OVERVIEW BOARD</span><h2>Edit requests</h2><p>Update priority and delivery status without leaving the dashboard.</p></div><button className="icon-button" onClick={()=>setOpen(false)} aria-label="Close editor"><X size={19}/></button></div>{notice&&<p className="success-message">{notice}</p>}<div className="overview-edit-list">{requests.map(request=><article key={request.id}><div><small>{request.id} · {request.product}</small><strong>{request.title}</strong><span>{request.owner} · {request.date}</span></div><label>Priority<select value={request.priority} onChange={event=>update(request.id,'priority',event.target.value)}>{['Critical','High','Medium','Low'].map(item=><option key={item}>{item}</option>)}</select></label><label>Status<select value={request.status} onChange={event=>update(request.id,'status',event.target.value)}>{['In review','In development','In testing','Approved'].map(item=><option key={item}>{item}</option>)}</select></label></article>)}</div><div className="modal-actions"><button className="primary" onClick={save}><Save size={16}/>Save board updates</button><button className="text-button" onClick={()=>setOpen(false)}>Close</button></div></section></div>}</>;
}
