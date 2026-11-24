import { createDemoAccountDefinitions, LOCAL_DEMO_PASSWORD } from './demo-accounts';

export const AUTH_USERS_KEY = 'pf360-auth-users';
export const AUTH_DEPARTMENTS_KEY = 'pf360-auth-departments';
export const AUTH_SESSION_KEY = 'pf360-auth-session';
export const AUTH_DEMO_CREDENTIALS_KEY = 'pf360-demo-credentials';

export type UserRole = 'Admin' | 'Department Manager' | 'Employee';
export type UserStatus = 'Approved' | 'Pending' | 'Rejected';
export type PasswordResetStatus = 'Pending' | 'Approved' | 'Rejected';
export type PasswordResetRequest = { status: PasswordResetStatus; requestedAt: string; reviewedAt?: string; reviewedBy?: string; code?: string };
export type AuthUser = { id: string; fullName: string; employeeNo: string; designation: string; department: string; departmentCategory?: string; departmentTeam?: string; email: string; mobile: string; photo?: string; passwordHash: string; role: UserRole; status: UserStatus; createdAt: string; passwordReset?: PasswordResetRequest };

export function getDepartmentMapping(user: Pick<AuthUser, 'department' | 'departmentCategory' | 'departmentTeam'>) {
  if (user.departmentCategory && user.departmentTeam) return {category: user.departmentCategory, team: user.departmentTeam};
  const separator = user.department.lastIndexOf(' / ');
  return separator > 0
    ? {category: user.department.slice(0, separator), team: user.department.slice(separator + 3)}
    : {category: 'Other / existing departments', team: user.department};
}

export const DEFAULT_DEPARTMENTS = ['Consumer Business', 'Enterprise Business', 'Technology', 'IT', 'Network', 'Digital', 'Customer Experience', 'Finance', 'Human Resources', 'Corporate Affairs'];

export function loadUsers(): AuthUser[] { try { const data = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) ?? '[]'); return Array.isArray(data) ? data : []; } catch { return []; } }
export function saveUsers(users: AuthUser[]) { localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users)); }
export function loadDepartments(): string[] { try { const data = JSON.parse(localStorage.getItem(AUTH_DEPARTMENTS_KEY) ?? 'null'); return Array.isArray(data) && data.every(item => typeof item === 'string') ? data : DEFAULT_DEPARTMENTS; } catch { return DEFAULT_DEPARTMENTS; } }
export function saveDepartments(departments: string[]) { localStorage.setItem(AUTH_DEPARTMENTS_KEY, JSON.stringify(departments)); }
export async function passwordHash(password: string) { const bytes = new TextEncoder().encode(password); const hash = await crypto.subtle.digest('SHA-256', bytes); return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join(''); }
function readDemoCredentials(): Record<string,string> { try { const value=JSON.parse(localStorage.getItem(AUTH_DEMO_CREDENTIALS_KEY)??'{}'); return value&&typeof value==='object'&&!Array.isArray(value)?value:{}; } catch { return {}; } }
function writeDemoCredentials(credentials:Record<string,string>) { localStorage.setItem(AUTH_DEMO_CREDENTIALS_KEY,JSON.stringify(credentials)); }
let demoAccountSeed: Promise<void> | null = null;
export function ensureDemoAccounts(): Promise<void> {
  if (demoAccountSeed) return demoAccountSeed;
  demoAccountSeed = (async () => {
    const initial=loadUsers(),credentials=readDemoCredentials(),definitions=createDemoAccountDefinitions();
    const seedIds=new Set(definitions.map(account=>`demo-${account.employeeNo.toLowerCase()}`));
    const users=initial.filter(user=>seedIds.has(user.id)||/^DEMO-PTCL-\d{4}$/.test(user.employeeNo));
    for(const user of users) delete credentials[user.email.toLowerCase()];
    const passwordHashValue=await passwordHash(LOCAL_DEMO_PASSWORD),now=new Date().toISOString();
    const next=[...initial];
    for(const account of definitions){
      const id=`demo-${account.employeeNo.toLowerCase()}`;
      const index=next.findIndex(user=>user.id===id||user.employeeNo===account.employeeNo);
      const previous=index>=0?next[index]:undefined;
      const updated:AuthUser={...previous,...account,id,passwordHash:passwordHashValue,role:'Employee',status:'Approved',createdAt:previous?.createdAt??now};
      if(index>=0)next[index]=updated;else next.push(updated);
      credentials[account.email.toLowerCase()]=LOCAL_DEMO_PASSWORD;
    }
    saveUsers(next);
    writeDemoCredentials(credentials);
  })().catch(error=>{demoAccountSeed=null;throw error;});
  return demoAccountSeed;
}
export async function ensureDemoAdmin() {
  const users = loadUsers(),email='admin@ptcl.com',passwordHashValue=await passwordHash(LOCAL_DEMO_PASSWORD);
  const existing=users.find(user=>user.email.toLowerCase()===email);
  const admin:AuthUser=existing?{...existing,passwordHash:passwordHashValue,role:'Admin',status:'Approved'}:{id:'pf360-demo-admin',fullName:'PF360 Administrator',employeeNo:'PTCL-ADMIN-001',designation:'Workspace Administrator',department:'Technology',email,mobile:'+92 300 0000000',passwordHash:passwordHashValue,role:'Admin',status:'Approved',createdAt:new Date().toISOString()};
  saveUsers(existing?users.map(user=>user.id===existing.id?admin:user):[...users,admin]);
  saveDepartments(loadDepartments());
  const credentials=readDemoCredentials();credentials[email]=LOCAL_DEMO_PASSWORD;writeDemoCredentials(credentials);
}
