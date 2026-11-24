'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, Archive, ArrowDown, ArrowUp, BadgeCheck, BarChart3, Ban, Briefcase, CalendarDays, CheckCircle2, ChevronDown, CircleAlert, CircleDashed, CircleDot, CirclePause, CircleX, ClipboardCheck, ClipboardList, Clock3, Code2, Eye, FlaskConical, Gauge, Globe2, Headphones, Layers3, LoaderCircle, MailCheck, Megaphone, Minus, Network, PackageCheck, Radio, Receipt, RotateCcw, Rocket, Router, ShieldCheck, Smartphone, Tag, Users, Wrench, Workflow } from 'lucide-react';
import './status-indicator.css';

const keyOf=(value:string)=>value.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const iconFor=(value:string)=>{
  const key=keyOf(value);
  if(key==='crm'||key.includes('customer-value')||key==='cvm')return Users;
  if(key==='cbs'||key.includes('billing'))return Receipt;
  if(key==='bi'||key.includes('data-analyst')||key.includes('analytics'))return BarChart3;
  if(key.includes('maximo')||key.includes('meximo')||key.includes('devices'))return Wrench;
  if(key.includes('one-window')||key.includes('website'))return Globe2;
  if(key.includes('prisma')||key.includes('product-development'))return Layers3;
  if(key.includes('ocean'))return Workflow;
  if(key.includes('uptcl-app')||key.includes('iptv')||key.includes('mobile-app'))return Smartphone;
  if(key==='evam')return Radio;
  if(key.includes('contact-center')||key==='cc'||key.includes('customer-care'))return Headphones;
  if(key.includes('marketing')||key.includes('brand'))return Megaphone;
  if(key.includes('it-dev')||key.includes('it-planning')||key.includes('digital-team'))return Code2;
  if(key.includes('revenue-assurance')||key==='ra')return Activity;
  if(key.includes('consumer')||key.includes('enterprise')||key.includes('wholesale'))return Briefcase;
  if(key.includes('segment'))return Users;
  if(key==='critical')return CircleAlert;
  if(key==='smoke')return Activity;
  if(key==='regression')return RotateCcw;
  if(key==='sit')return Network;
  if(key==='qa')return ShieldCheck;
  if(key==='uat')return BadgeCheck;
  if(key==='high')return ArrowUp;
  if(key==='medium')return Minus;
  if(key==='low')return ArrowDown;
  if(['in-review','review','under-review'].includes(key))return Eye;
  if(['in-development','development','in-progress','working'].includes(key))return key==='in-progress'||key==='working'?LoaderCircle:Code2;
  if(['in-testing','testing','retesting','retest'].includes(key))return key.includes('retest')?RotateCcw:FlaskConical;
  if(['approved','passed','verified','closed','accepted','ready','fixed','complete','completed','deployed'].includes(key))return ['ready'].includes(key)?BadgeCheck:['deployed'].includes(key)?Rocket:['fixed'].includes(key)?Wrench:['verified'].includes(key)?ShieldCheck:CheckCircle2;
  if(['pending','planned','draft','not-started'].includes(key))return ['draft','planned','not-started'].includes(key)?CalendarDays:Clock3;
  if(['failed','rejected','declined','error'].includes(key))return ['rejected','declined'].includes(key)?Ban:CircleX;
  if(['open','new'].includes(key))return CircleDot;
  if(['blocked','on-hold'].includes(key))return CirclePause;
  if(['retired','archived','rolled-back'].includes(key))return Archive;
  if(['not-run','not-executed'].includes(key))return CircleDashed;
  return Tag;
};

export function StatusIndicator({status,className=''}:{status:string;className?:string}){
  const Icon=iconFor(status),key=keyOf(status);
  return <span className={`status-indicator status-tone-${key} ${className}`.trim()}><Icon size={13} strokeWidth={2}/><span>{status}</span></span>;
}

export function StatusSelect({value,options,onChange,ariaLabel,name,placeholder}:{value:string;options:string[];onChange:(value:string)=>void;ariaLabel:string;name?:string;placeholder?:string}){
  const [open,setOpen]=useState(false),[opensUp,setOpensUp]=useState(false),[selected,setSelected]=useState(value);const root=useRef<HTMLDivElement>(null),items=useRef<Array<HTMLButtonElement|null>>([]);
  useEffect(()=>{const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};document.addEventListener('pointerdown',outside);window.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('keydown',escape)}},[]);
  useEffect(()=>setSelected(value),[value]);
  function toggle(){const rect=root.current?.getBoundingClientRect();const menuHeight=Math.min(options.length*44+16,260);setOpensUp(!!rect&&window.innerHeight-rect.bottom<menuHeight+12&&rect.top>menuHeight+12);setOpen(value=>!value)}
  function choose(option:string){setSelected(option);onChange(option);setOpen(false)}
  function navigate(event:React.KeyboardEvent<HTMLButtonElement>,index:number){if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(!open){toggle();requestAnimationFrame(()=>items.current[0]?.focus());return}const offset=event.key==='ArrowDown'?1:-1;items.current[(index+offset+options.length)%options.length]?.focus()}else if(event.key==='Escape'){event.preventDefault();setOpen(false);root.current?.querySelector('button')?.focus()}}
  return <div className="status-select" ref={root}>{name&&<input type="hidden" name={name} value={selected}/>}<button type="button" role="combobox" className="status-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={toggle} onKeyDown={event=>navigate(event,-1)}>{selected?<StatusIndicator status={selected}/>:<span className="status-select-placeholder">{placeholder??'Choose status'}</span>}<ChevronDown size={14}/></button>{open&&<div className={`status-select-menu${opensUp?' opens-up':''}`} role="listbox" aria-label={ariaLabel}>{options.map((option,index)=><button type="button" role="option" aria-selected={selected===option} key={option} ref={element=>{items.current[index]=element}} onClick={()=>choose(option)} onKeyDown={event=>navigate(event,index)}><StatusIndicator status={option}/>{selected===option&&<CheckCircle2 size={14}/>}</button>)}</div>}</div>;
}

const recordIconFor=(value:string)=>{
  const key=keyOf(value);
  if(key==='crm'||key==='cvm'||key.includes('customer-value'))return Users;
  if(key==='cbs'||key.includes('billing'))return Receipt;
  if(key==='bi'||key.includes('data-analyst')||key.includes('analytics'))return BarChart3;
  if(key.includes('maximo')||key.includes('meximo')||key.includes('device'))return Wrench;
  if(key.includes('one-window')||key.includes('website'))return Globe2;
  if(key.includes('prisma')||key.includes('product-development'))return Layers3;
  if(key.includes('ocean'))return Workflow;
  if(key.includes('uptcl-app')||key.includes('iptv'))return Smartphone;
  if(key==='evam')return Radio;
  if(key.includes('contact-center')||key==='cc'||key.includes('customer-care'))return Headphones;
  if(key.includes('marketing')||key.includes('brand'))return Megaphone;
  if(key.includes('it-dev')||key.includes('it-planning')||key.includes('digital-team'))return Code2;
  if(key.includes('revenue-assurance')||key==='ra')return Activity;
  if(key.includes('consumer')||key.includes('enterprise')||key.includes('wholesale'))return Briefcase;
  if(key.includes('segment'))return Users;
  if(key.includes('pre-bill'))return Receipt;
  if(key.includes('performance')||key.includes('speed'))return Gauge;
  if(key.includes('integration'))return Network;
  if(key==='ui'||key.includes('customer-experience'))return Eye;
  if(key.includes('acceptance')||key.includes('approved'))return BadgeCheck;
  if(key.includes('operational')||key.includes('compliance'))return ShieldCheck;
  if(key.includes('tariff')||key.includes('eligibility'))return Tag;
  if(key.includes('provisioning'))return Router;
  if(key.includes('bundle')||key.includes('migration'))return PackageCheck;
  if(key.includes('requirement')||key.includes('story')||key.includes('criteria'))return ClipboardList;
  if(key.includes('defect')||key.includes('test'))return ClipboardCheck;
  if(key.includes('standard')||key.includes('hotfix')||key.includes('release'))return Rocket;
  if(key.includes('idea'))return Layers3;
  if(key.includes('review'))return MailCheck;
  return Tag;
};

export function RecordTypeSelect({value,options,onChange,ariaLabel,name='type'}:{value:string;options:string[];onChange:(value:string)=>void;ariaLabel:string;name?:string}){
  return <IconSelect value={value} options={options} onChange={onChange} ariaLabel={ariaLabel} name={name}/>;
}

export function IconSelect({value,options,onChange,ariaLabel,name}:{value:string;options:string[];onChange:(value:string)=>void;ariaLabel:string;name:string}){
  const [open,setOpen]=useState(false),[opensUp,setOpensUp]=useState(false),[selected,setSelected]=useState(value);
  const root=useRef<HTMLDivElement>(null),items=useRef<Array<HTMLButtonElement|null>>([]);
  useEffect(()=>setSelected(value),[value]);
  useEffect(()=>{const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};document.addEventListener('pointerdown',outside);window.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('keydown',escape)}},[]);
  function toggle(){const rect=root.current?.getBoundingClientRect();const menuHeight=Math.min(options.length*42+16,260);setOpensUp(!!rect&&window.innerHeight-rect.bottom<menuHeight+12&&rect.top>menuHeight+12);setOpen(value=>!value)}
  function choose(option:string){setSelected(option);onChange(option);setOpen(false)}
  function navigate(event:React.KeyboardEvent<HTMLButtonElement>,index:number){if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(!open){toggle();requestAnimationFrame(()=>items.current[0]?.focus());return}items.current[(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length]?.focus()}else if(event.key==='Escape'){event.preventDefault();setOpen(false);root.current?.querySelector('button')?.focus()}}
  const SelectedIcon=recordIconFor(selected);
  return <div className="record-type-select" ref={root}><input type="hidden" name={name} value={selected}/><button type="button" role="combobox" className="record-type-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={toggle} onKeyDown={event=>navigate(event,-1)}><span><SelectedIcon size={16}/>{selected}</span><ChevronDown size={14}/></button>{open&&<div className={`record-type-menu${opensUp?' opens-up':''}`} role="listbox" aria-label={ariaLabel}>{options.map((option,index)=>{const Icon=recordIconFor(option);return <button type="button" role="option" aria-selected={selected===option} key={option} ref={element=>{items.current[index]=element}} onClick={()=>choose(option)} onKeyDown={event=>navigate(event,index)}><span><Icon size={16}/>{option}</span>{selected===option&&<CheckCircle2 size={14}/>}</button>})}</div>}</div>;
}
