'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Building2, Camera, Eye, EyeOff, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { GlobalWorkspacePicker } from './global-workspace-picker';
import { OverviewQuickEditor } from './overview-quick-editor';
import { DeliveryGuideShortcut } from './delivery-guide-shortcut';
import { CommandCenterPanel } from './command-center-panel';
import { CommandAssistantTools } from './command-assistant-tools';
import { AUTH_SESSION_KEY, DEFAULT_DEPARTMENTS, type AuthUser, ensureDemoAdmin, loadDepartments, loadUsers, passwordHash, saveUsers } from '../lib/auth';

type Session = { user: AuthUser; signOut: () => void; refresh: () => void; updateProfile: (changes: Pick<AuthUser, 'fullName' | 'designation' | 'department' | 'email' | 'mobile' | 'photo'>) => void };
function PasswordInput({name, label, visible, setVisible, confirm = false, login = false}: {name: string; label: string; visible: boolean; setVisible: (value: boolean) => void; confirm?: boolean; login?: boolean}) {
  const [value, setValue] = useState('');
  return <label>{label}<span className="password-field"><input name={name} value={value} onChange={event => setValue(event.target.value)} type={visible ? 'text' : 'password'} required minLength={12} autoComplete={confirm ? 'new-password' : login ? 'current-password' : 'new-password'} placeholder={confirm ? 'Re-enter your password' : login ? 'Enter your password' : 'At least 12 characters'}/><button type="button" aria-label={visible ? `Hide ${label}` : `Show ${label}`} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>;
}
export function AuthPortal({children}: {children: (session: Session) => ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null), [mode, setMode] = useState<'login' | 'signup'>('login');
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [photo, setPhoto] = useState(''), [showLoginPassword, setShowLoginPassword] = useState(false), [showSignupPassword, setShowSignupPassword] = useState(false), [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  async function refresh() {
    try {
      await ensureDemoAdmin();
      const users = loadUsers();
      setDepartments(loadDepartments());
      const id = localStorage.getItem(AUTH_SESSION_KEY) ?? sessionStorage.getItem(AUTH_SESSION_KEY);
      setUser(users.find(candidate => candidate.id === id && candidate.status === 'Approved') ?? null);
    } catch {
      // A blocked browser store or stale session must never leave the UI loading forever.
      setDepartments(loadDepartments());
      setUser(null);
      setError('Saved sign-in data could not be loaded. Please sign in again.');
    }
  }
  useEffect(() => { void refresh(); }, []);
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const target = event.currentTarget; setBusy(true); setError(''); setNotice(''); await ensureDemoAdmin(); const form = new FormData(target); const email = String(form.get('email')).trim().toLowerCase(); const password = String(form.get('password'));
    const found = loadUsers().find(candidate => candidate.email.toLowerCase() === email);
    if (!found || found.passwordHash !== await passwordHash(password)) setError('Email or password is incorrect.');
    else if (found.status === 'Pending') setError('Your account is waiting for administrator approval.');
    else if (found.status === 'Rejected') setError('This account was not approved. Contact your department administrator.');
    else { const remember = form.get('remember') === 'on'; if (remember) { localStorage.setItem(AUTH_SESSION_KEY, found.id); sessionStorage.removeItem(AUTH_SESSION_KEY); } else { sessionStorage.setItem(AUTH_SESSION_KEY, found.id); localStorage.removeItem(AUTH_SESSION_KEY); } setUser(found); }
    setBusy(false);
  }
  async function signup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const target = event.currentTarget; setBusy(true); setError(''); setNotice(''); await ensureDemoAdmin(); const form = new FormData(target); const email = String(form.get('email')).trim().toLowerCase(); const password = String(form.get('password'));
    if (password.length < 12) { setError('Use a password with at least 12 characters.'); setBusy(false); return; }
    if (password !== String(form.get('confirmPassword'))) { setError('Password and confirm password must match.'); setBusy(false); return; }
    const users = loadUsers(); if (users.some(candidate => candidate.email.toLowerCase() === email || candidate.employeeNo === String(form.get('employeeNo')).trim())) { setError('An account already exists with this email or employee number.'); setBusy(false); return; }
    const next: AuthUser = { id: crypto.randomUUID(), fullName: String(form.get('fullName')).trim(), employeeNo: String(form.get('employeeNo')).trim(), designation: String(form.get('designation')).trim(), department: String(form.get('department')), email, mobile: String(form.get('mobile')).trim(), photo: photo || undefined, passwordHash: await passwordHash(password), role: 'Employee', status: 'Pending', createdAt: new Date().toISOString() };
    saveUsers([...users, next]); setMode('login'); setPhoto(''); setNotice('Signup submitted. An administrator must approve your account before login.'); setBusy(false);
  }
  async function choosePhoto(file?: File) { if (!file) return; if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) { setError('Choose an image up to 2 MB.'); return; } const reader = new FileReader(); reader.onload = () => setPhoto(typeof reader.result === 'string' ? reader.result : ''); reader.readAsDataURL(file); }
  if (user) return <><GlobalWorkspacePicker/><OverviewQuickEditor/><DeliveryGuideShortcut/><CommandCenterPanel user={user}/><CommandAssistantTools/>{children({user, signOut: () => { localStorage.removeItem(AUTH_SESSION_KEY); sessionStorage.removeItem(AUTH_SESSION_KEY); setUser(null); }, refresh: () => void refresh(), updateProfile: changes => { const next = {...user, ...changes}; saveUsers(loadUsers().map(candidate => candidate.id === user.id ? next : candidate)); setUser(next); }})}</>;
  return <main className="auth-shell"><section className="auth-panel"><div className="auth-brand"><img src="/logo.svg" alt="PF360"/><div><strong>ProductFlow <b>360</b></strong><span>PTCL DELIVERY WORKSPACE</span></div></div><div className="auth-copy"><span className="eyebrow">SECURE TEAM ACCESS</span><h1>{mode === 'login' ? 'Welcome back.' : 'Create your workspace account.'}</h1><p>{mode === 'login' ? 'Sign in with your approved workspace account.' : 'Your details are sent to an administrator for approval.'}</p></div><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}><LogIn size={16}/>Login</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}><UserPlus size={16}/>Sign up</button></div>{error && <div className="inline-error" role="alert">{error}</div>}{notice && <p className="success-message" role="status">{notice}</p>}{mode === 'login' ? <form className="auth-form" onSubmit={login}><label>Email<input name="email" type="email" autoComplete="email" required placeholder="name@gmail.com"/></label><PasswordInput name="password" label="Password" visible={showLoginPassword} setVisible={setShowLoginPassword} login/><label className="remember-me"><input name="remember" type="checkbox"/>Remember me on this device</label><button className="primary" disabled={busy} type="submit"><LogIn size={17}/>{busy ? 'Signing in…' : 'Login to ProductFlow 360'}</button><p className="form-note"><ShieldCheck size={15}/> Demo admin: <strong>admin@ptcl.com</strong> · <strong>PTCLAdmin!2026</strong></p></form> : <form className="auth-form" onSubmit={signup}><div className="signup-photo"><button type="button" onClick={() => photoInput.current?.click()} className="photo-picker">{photo ? <img src={photo} alt="Profile preview"/> : <Camera size={22}/>}</button><div><strong>Profile picture</strong><small>Optional · JPG, PNG or WebP · 2 MB max</small></div><input ref={photoInput} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => void choosePhoto(event.target.files?.[0])}/></div><label>Full name<input name="fullName" required maxLength={100} placeholder="Your full name"/></label><div className="form-row"><label>Employee number<input name="employeeNo" required maxLength={40} placeholder="e.g. PTCL-12345"/></label><label>Mobile number<input name="mobile" type="tel" required maxLength={30} placeholder="+92 3xx xxxxxxx"/></label></div><label>Designation<input name="designation" required maxLength={100} placeholder="e.g. QA Engineer"/></label><label>Department<select name="department" required>{departments.map(department => <option key={department}>{department}</option>)}</select></label><label>Email<input name="email" type="email" required placeholder="name@gmail.com"/></label><PasswordInput name="password" label="Create password" visible={showSignupPassword} setVisible={setShowSignupPassword}/><PasswordInput name="confirmPassword" label="Confirm password" visible={showConfirmPassword} setVisible={setShowConfirmPassword} confirm/><button className="primary" disabled={busy} type="submit"><Building2 size={17}/>{busy ? 'Submitting…' : 'Submit for approval'}</button></form>}</section></main>;
}
