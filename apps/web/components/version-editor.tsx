'use client';

import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';

export function VersionEditor({current,onClose,onSave}:{current:number;onClose:()=>void;onSave:(version:number)=>void}) {
  const [value,setValue]=useState(`v${current+1}`);
  useEffect(()=>setValue(`v${current+1}`),[current]);
  const parsed=Number(value.trim().replace(/^v/i,''));
  const valid=/^v?\d+$/i.test(value.trim())&&Number.isSafeInteger(parsed)&&parsed>0;
  return <div className="modal-overlay version-editor-overlay" onClick={onClose}><section className="modal version-editor-modal" role="dialog" aria-modal="true" aria-label="Set record version" onClick={event=>event.stopPropagation()}>
    <button className="modal-close icon-button" aria-label="Close version editor" onClick={onClose}><X size={19}/></button>
    <span className="eyebrow">VERSION CONTROL</span><h2>Set version</h2><p>Current version: <strong>v{current}</strong>. Enter any positive version number; the previous version will remain in history.</p>
    <form onSubmit={event=>{event.preventDefault();if(valid)onSave(parsed)}}>
      <label>New version<input autoFocus value={value} onChange={event=>setValue(event.target.value)} inputMode="numeric" aria-label="New version number" placeholder="v2"/></label>
      {!valid&&<small className="version-error">Enter a version like v{current+1}.</small>}
      <div className="request-form-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="primary" type="submit" disabled={!valid}><Save size={15}/>Save version</button></div>
    </form>
  </section></div>;
}
