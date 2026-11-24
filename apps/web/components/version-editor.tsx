'use client';

import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';

export function VersionEditor({current,onClose,onSave}:{current:number;onClose:()=>void;onSave:(version:number)=>void}) {
  const suggested=Math.min(Math.max(current+1,1),100);
  const [value,setValue]=useState(String(suggested));
  useEffect(()=>setValue(String(suggested)),[suggested]);
  const parsed=Number(value);
  const valid=/^\d{1,3}$/.test(value)&&Number.isInteger(parsed)&&parsed>=1&&parsed<=100;
  return <div className="modal-overlay version-editor-overlay" onClick={onClose}><section className="modal version-editor-modal" role="dialog" aria-modal="true" aria-label="Set record version" onClick={event=>event.stopPropagation()}>
    <button className="modal-close icon-button" aria-label="Close version editor" onClick={onClose}><X size={19}/></button>
    <span className="eyebrow">VERSION CONTROL</span><h2>Set version</h2><p>Current version: <strong>v{current}</strong>. Enter a version from 1 to 100; previous versions remain in history.</p>
    <form onSubmit={event=>{event.preventDefault();if(valid)onSave(parsed)}}>
      <label>New version<span className="version-number-field"><b aria-hidden="true">v</b><input autoFocus type="text" value={value} onChange={event=>setValue(event.target.value.replace(/\D/g,'').slice(0,3))} inputMode="numeric" pattern="[0-9]*" maxLength={3} aria-label="New version number" placeholder="2"/></span></label>
      {!valid&&<small className="version-error">Enter a whole number from 1 to 100.</small>}
      <div className="request-form-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="primary" type="submit" disabled={!valid}><Save size={15}/>Save version</button></div>
    </form>
  </section></div>;
}
