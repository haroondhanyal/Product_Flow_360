'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, CircleAlert, LoaderCircle, Mail, ShieldCheck, X } from 'lucide-react';
import type { AuthUser } from '../lib/auth';
import './project-invitation-landing.css';

type Invitation = {
  id: string; projectId: string; projectCode: string; projectName: string; projectDescription: string; workspaceId: string; workspaceName: string;
  senderUserId: string; senderName: string; senderEmail: string; recipientEmail: string; recipientName: string;
  status: 'Pending' | 'Accepted' | 'Declined'; createdAt: string; expiresAt: string;
};

export function ProjectInvitationLanding({user,signOut}:{user:AuthUser;signOut:()=>void}) {
  const [token,setToken]=useState(''),[invite,setInvite]=useState<Invitation|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  useEffect(()=>{const value=new URLSearchParams(window.location.search).get('token')??'';setToken(value);if(!value){setError('This project invitation link is missing its token.');setLoading(false);return}fetch(`/api/project-invitations/resolve?token=${encodeURIComponent(value)}`).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error??'This invitation could not be opened.');setInvite(body.invitation)}).catch(reason=>setError(reason instanceof Error?reason.message:'This invitation could not be opened.')).finally(()=>setLoading(false))},[]);
  const matches=Boolean(invite&&user.email.trim().toLowerCase()===invite.recipientEmail.toLowerCase());
  function addProjectToWorkspace(item:Invitation){
    const spaces=JSON.parse(localStorage.getItem('pf360-workspaces')??'[]') as Array<Record<string,unknown>>;
    if(!spaces.some(space=>space.id===item.workspaceId))spaces.push({id:item.workspaceId,name:item.workspaceName,description:`Joined through a project invitation from ${item.senderName}.`,owner:item.senderName,createdAt:item.createdAt});
    const projects=JSON.parse(localStorage.getItem('pf360-projects')??'[]') as Array<Record<string,unknown>>;
    if(!projects.some(project=>project.id===item.projectId))projects.unshift({id:item.projectId,name:item.projectName,code:item.projectCode,description:item.projectDescription,ownerId:item.senderUserId,workspaceId:item.workspaceId,createdAt:item.createdAt});
    const key='pf360-project-access-v1',access=JSON.parse(localStorage.getItem(key)??'{}') as Record<string,{ownerId:string;memberIds:string[];requests:unknown[]}>;
    const current=access[item.projectId]??{ownerId:item.senderUserId,memberIds:[item.senderUserId],requests:[]};
    access[item.projectId]={...current,memberIds:Array.from(new Set([...current.memberIds,user.id]))};
    localStorage.setItem('pf360-workspaces',JSON.stringify(spaces));localStorage.setItem('pf360-projects',JSON.stringify(projects));localStorage.setItem(key,JSON.stringify(access));localStorage.setItem('pf360-active-workspace',item.workspaceId);
    window.dispatchEvent(new Event('pf360-workspace-changed'));window.dispatchEvent(new Event('pf360-workspace-opened'));window.dispatchEvent(new Event('pf360-projects-changed'));window.dispatchEvent(new Event('pf360-project-access-changed'));
  }
  async function respond(response:'Accepted'|'Declined'){
    if(!invite||!matches)return;setBusy(true);setError('');setMessage('');
    try{const result=await fetch('/api/project-invitations/respond',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,email:user.email,response})});const body=await result.json();if(!result.ok)throw new Error(body.error??'Your response could not be saved.');setInvite(body.invitation);if(response==='Accepted'){addProjectToWorkspace(body.invitation);setMessage(`${body.invitation.projectName} was added to your workspace. Open ProductFlow to continue.`)}else setMessage(`Invitation to ${invite.projectName} declined.`)}catch(reason){setError(reason instanceof Error?reason.message:'Your response could not be saved.')}finally{setBusy(false)}
  }
  const done=invite?.status==='Accepted'||invite?.status==='Declined';
  return <main className="project-invite-page"><section className="project-invite-card"><div className="project-invite-brand"><span>P</span><div><strong>ProductFlow <b>360</b></strong><small>PROJECT INVITATION</small></div></div>{loading?<div className="project-invite-loading"><LoaderCircle size={22}/>Loading invitation…</div>:error&&!invite?<div className="project-invite-message error"><CircleAlert size={20}/><p>{error}</p></div>:invite?<><div className="project-invite-heading"><span className="project-invite-icon"><Mail size={23}/></span><div><span className="eyebrow">{invite.projectCode} · DELIVERY PROJECT</span><h1>Join {invite.projectName}</h1><p>{invite.senderName} invited you to collaborate in the {invite.workspaceName} workspace.</p></div></div><div className="project-invite-facts"><div><small>INVITED ACCOUNT</small><strong>{invite.recipientEmail}</strong></div><div><small>WORKSPACE</small><strong>{invite.workspaceName}</strong></div><div><small>PROJECT</small><strong>{invite.projectCode} · {invite.projectName}</strong></div><div><small>LINK EXPIRES</small><strong>{new Date(invite.expiresAt).toLocaleDateString()}</strong></div></div>{error&&<div className="project-invite-message error"><CircleAlert size={18}/><p>{error}</p></div>}{message&&<div className="project-invite-message success"><ShieldCheck size={18}/><p>{message}</p></div>}{!matches&&invite.status==='Pending'&&<div className="project-invite-message error"><CircleAlert size={18}/><p>This link was sent to <strong>{invite.recipientEmail}</strong>. You are signed in as {user.email}. <button className="invite-signout" onClick={signOut}>Sign out</button> and sign in with the invited account.</p></div>}{invite.status==='Pending'&&matches&&<div className="project-invite-actions"><button className="primary" disabled={busy} onClick={()=>void respond('Accepted')}>{busy?<LoaderCircle size={16}/>:<Check size={16}/>}Accept &amp; join project</button><button className="text-button" disabled={busy} onClick={()=>void respond('Declined')}><X size={16}/>Decline</button></div>}{done&&<a className="primary project-open-workspace" href="/">Open my workspace <ArrowRight size={16}/></a>}<p className="project-invite-note">Use the invited email account to accept. After joining, this project is added to your workspace picker. Project records remain in each browser’s local demo data.</p></>:null}</section></main>;
}
