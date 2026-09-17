export const AUTH_USERS_KEY = 'pf360-auth-users';
export const AUTH_DEPARTMENTS_KEY = 'pf360-auth-departments';
export const AUTH_SESSION_KEY = 'pf360-auth-session';

export type UserRole = 'Admin' | 'Department Manager' | 'Employee';
export type UserStatus = 'Approved' | 'Pending' | 'Rejected';
export type PasswordResetStatus = 'Pending' | 'Approved' | 'Rejected';
export type PasswordResetRequest = { status: PasswordResetStatus; requestedAt: string; reviewedAt?: string; reviewedBy?: string; code?: string };
export type AuthUser = { id: string; fullName: string; employeeNo: string; designation: string; department: string; email: string; mobile: string; photo?: string; passwordHash: string; role: UserRole; status: UserStatus; createdAt: string; passwordReset?: PasswordResetRequest };

export const DEFAULT_DEPARTMENTS = ['Consumer Business', 'Enterprise Business', 'Technology', 'IT', 'Network', 'Digital', 'Customer Experience', 'Finance', 'Human Resources', 'Corporate Affairs'];

export function loadUsers(): AuthUser[] { try { const data = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) ?? '[]'); return Array.isArray(data) ? data : []; } catch { return []; } }
export function saveUsers(users: AuthUser[]) { localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users)); }
export function loadDepartments(): string[] { try { const data = JSON.parse(localStorage.getItem(AUTH_DEPARTMENTS_KEY) ?? 'null'); return Array.isArray(data) && data.every(item => typeof item === 'string') ? data : DEFAULT_DEPARTMENTS; } catch { return DEFAULT_DEPARTMENTS; } }
export function saveDepartments(departments: string[]) { localStorage.setItem(AUTH_DEPARTMENTS_KEY, JSON.stringify(departments)); }
export async function passwordHash(password: string) { const bytes = new TextEncoder().encode(password); const hash = await crypto.subtle.digest('SHA-256', bytes); return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join(''); }
export async function ensureDemoAdmin() {
  const users = loadUsers();
  if (users.some(user => user.email === 'admin@ptcl.com')) return;
  users.push({ id: 'pf360-demo-admin', fullName: 'PF360 Administrator', employeeNo: 'PTCL-ADMIN-001', designation: 'Workspace Administrator', department: 'Technology', email: 'admin@ptcl.com', mobile: '+92 300 0000000', passwordHash: await passwordHash('PTCLAdmin!2026'), role: 'Admin', status: 'Approved', createdAt: new Date().toISOString() });
  saveUsers(users); saveDepartments(loadDepartments());
}
