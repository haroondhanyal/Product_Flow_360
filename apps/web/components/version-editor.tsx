'use client';

import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { normalizeVersion, parseVersionInput, suggestVersion } from '../lib/versions';

export function VersionEditor({current,onClose,onSave}:{current:string|number;onClose:()=>void;onSave:(version:string)=>void}) {
  const normalized=normalizeVersion(current), suggested=suggestVersion(normalized);
  const [value,setValue]=useState(suggested);
  useEffect(()=>setValue(suggested),[suggested]);
  const parsed=parseVersionInput(value);
  const valid=parsed!==null;
  return <div className="modal-overlay version-editor-overlay" onClick={onClose}><section className="modal version-editor-modal" role="dialog" aria-modal="true" aria-label="Set record version" onClick={event=>event.stopPropagation()}>
    <button className="modal-close icon-button" aria-label="Close version editor" onClick={onClose}><X size={19}/></button>
    <span className="eyebrow">VERSION CONTROL</span><h2>Set version</h2><p>Current version: <strong>v{normalized}</strong>. Enter one number or major.minor; each part must be from 1 to 100. Previous versions remain in history.</p>
    <form onSubmit={event=>{event.preventDefault();if(valid)onSave(parsed)}}>
      <label>New version<span className="version-number-field"><b aria-hidden="true">v</b><input autoFocus type="text" value={value} onChange={event=>setValue(event.target.value.replace(/[^\d.,]/g,'').slice(0,7))} onBlur={()=>setValue(currentValue=>currentValue.replace(',', '.'))} inputMode="decimal" aria-label="New version number" placeholder="1.1"/></span></label>
      {!valid&&<small className="version-error">Use 1–100, optionally followed by a minor number (for example 1.2 or 2.3).</small>}
      <div className="request-form-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="primary" type="submit" disabled={!valid}><Save size={15}/>Save version</button></div>
    </form>
  </section></div>;
}
