'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Layers } from 'lucide-react';
import './workspace-directory.css';

type Workspace={id:string;name:string;description:string;owner?:string;startDate?:string;image?:string};
function read():Workspace[]{try{const values=JSON.parse(localStorage.getItem('pf360-workspaces')??'[]');return Array.isArray(values)?values:[]}catch{return[]}}

export function WorkspaceDirectory(){
 const [activeModule,setActiveModule]=useState(''),[root,setRoot]=useState<HTMLElement|null>(null),[items,setItems]=useState<Workspace[]>([]),[active,setActive]=useState('');
 useEffect(()=>{const handle=(event:Event)=>setActiveModule((event as CustomEvent<string>).detail);window.addEventListener('pf360-active-module',handle);return()=>window.removeEventListener('pf360-active-module',handle)},[]);
 useEffect(()=>{if(activeModule!=='Workspace tools'){setRoot(null);return}const timer=window.setTimeout(()=>setRoot(document.querySelector('.workspace-tools')),0);return()=>window.clearTimeout(timer)},[activeModule]);
 useEffect(()=>{if(!root)return;const refresh=()=>{setItems(read());setActive(localStorage.getItem('pf360-active-workspace')??'')};refresh();window.addEventListener('pf360-workspace-changed',refresh);return()=>window.removeEventListener('pf360-workspace-changed',refresh)},[root]);
 function open(id:string){localStorage.setItem('pf360-active-workspace',id);window.dispatchEvent(new Event('pf360-workspace-opened'));window.dispatchEvent(new Event('pf360-workspace-changed'))}
 if(!root)return null;
 return createPortal(<section className="workspace-directory"><div className="section-title"><div><span className="eyebrow">WORKSPACE DIRECTORY</span><h2>All delivery workspaces</h2><p>Select a workspace to open it. Use the header dropdown to edit or delete a workspace.</p></div></div><div className="workspace-directory-grid">{items.map(item=><article key={item.id} className={item.id===active?'active':''}>{item.image?<img src={item.image} alt=""/>:<span className="workspace-directory-mark">{item.name[0]}</span>}<div><span className="workspace-directory-active">{item.id===active?'ACTIVE WORKSPACE':'PTCL WORKSPACE'}</span><h3>{item.name}</h3><p>{item.description||'No description added.'}</p><small>{item.owner||'Owner not assigned'}{item.startDate?` · Started ${item.startDate}`:''}</small></div><button type="button" className="text-button" onClick={()=>open(item.id)}>{item.id===active?'Open workspace':'Switch & open'}<ExternalLink size={15}/></button></article>)}{!items.length&&<div className="workspace-directory-empty"><Layers size={20}/><p>Create your first workspace above.</p></div>}</div></section>,root);
}
