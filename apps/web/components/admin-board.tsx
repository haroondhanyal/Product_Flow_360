'use client';

import { useEffect, useMemo, useState } from 'react';
import { Ban, Check, Clock3, Download, Filter, Plus, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { formatDemoCredentials } from '../lib/demo-accounts';
import { AUTH_DEMO_CREDENTIALS_KEY } from '../lib/auth';
import { getDepartmentMapping, type AuthUser, type UserRole, loadDepartments, loadUsers, saveDepartments, saveUsers } from '../lib/auth';
import { notifyUser } from '../lib/feedback';

type StatusFilter = 'All statuses' | 'Approved' | 'Pending' | 'Rejected';

const isSeededDemoAccount = (user: AuthUser) => user.id.startsWith('demo-demo-ptcl-') || /^DEMO-PTCL-\d{4}$/.test(user.employeeNo);

function AccountStatus({ status }: { status: AuthUser['status'] }) {
  const StatusIcon = status === 'Approved' ? Check : status === 'Pending' ? Clock3 : Ban;
  return <span className={`account-status ${status.toLowerCase()}`}><StatusIcon size={13}/>{status === 'Approved' ? 'Active' : status}</span>;
}

export function AdminBoard({ currentUser, onChange }: { currentUser: AuthUser; onChange: () => void }) {
  const [users, setUsers] = useState(loadUsers);
  const [departments, setDepartments] = useState(loadDepartments);
  const [department, setDepartment] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { if (message) notifyUser(message, /could not|unable|failed|error|cannot/i.test(message) ? 'error' : 'success'); }, [message]);
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All statuses');

  function updateUsers(next: AuthUser[], text: string) {
    saveUsers(next);
    setUsers(next);
    setMessage(text);
    onChange();
  }

  function setStatus(id: string, status: AuthUser['status']) {
    updateUsers(users.map(user => user.id === id ? { ...user, status } : user), status === 'Approved' ? 'Account activated.' : status === 'Rejected' ? 'Account suspended.' : 'Account set to pending.');
  }

  function activateDemoAccounts() {
    const inactive = users.filter(user => isSeededDemoAccount(user) && user.status !== 'Approved');
    if (!inactive.length) {
      setMessage('All seeded demo accounts are active.');
      return;
    }
    if (!window.confirm(`Activate ${inactive.length} local demo accounts?`)) return;
    const inactiveIds = new Set(inactive.map(user => user.id));
    updateUsers(users.map(user => inactiveIds.has(user.id) ? { ...user, status: 'Approved' } : user), `${inactive.length} local demo accounts activated.`);
  }

  function setRole(id: string, role: UserRole) {
    updateUsers(users.map(user => user.id === id ? { ...user, role } : user), 'Role updated.');
  }

  function reviewPasswordReset(id: string, status: 'Approved' | 'Rejected') {
    const code = status === 'Approved' ? crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase() : undefined;
    updateUsers(users.map(user => user.id === id && user.passwordReset
      ? { ...user, passwordReset: { ...user.passwordReset, status, code, reviewedAt: new Date().toISOString(), reviewedBy: currentUser.id } }
      : user), status === 'Approved' ? 'Password reset approved. Share the recovery code with the verified employee through an approved channel.' : 'Password reset request rejected.');
  }

  function addDepartment(event: React.FormEvent) {
    event.preventDefault();
    const value = department.trim();
    if (!value || departments.some(item => item.toLowerCase() === value.toLowerCase())) return;
    const next = [...departments, value].sort();
    saveDepartments(next);
    setDepartments(next);
    setDepartment('');
    setMessage('Department added.');
  }

  function removeDepartment(value: string) {
    if (departments.length <= 1 || !window.confirm(`Remove ${value} from signup departments?`)) return;
    const next = departments.filter(item => item !== value);
    saveDepartments(next);
    setDepartments(next);
    setMessage('Department removed.');
  }

  function downloadDemoCredentials() {
    let credentials: Record<string, string> = {};
    try { credentials = JSON.parse(localStorage.getItem(AUTH_DEMO_CREDENTIALS_KEY) ?? '{}'); } catch { /* Use the local demo defaults. */ }
    const url = URL.createObjectURL(new Blob([formatDemoCredentials(credentials)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'PF360-demo-accounts.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Downloaded the active synthetic demo account list. Reserved .example addresses and shared credentials are for local use only.');
  }

  const pending = users.filter(user => user.status === 'Pending');
  const resetRequests = users.filter(user => user.passwordReset);
  const demoAccounts = users.filter(isSeededDemoAccount);
  const inactiveDemoAccounts = demoAccounts.filter(user => user.status !== 'Approved').length;
  const visibleUsers = useMemo(() => users.filter(user => {
    const matchesQuery = `${user.fullName} ${user.email} ${user.employeeNo} ${user.department} ${getDepartmentMapping(user).category} ${getDepartmentMapping(user).team}`.toLowerCase().includes(userSearch.trim().toLowerCase());
    return matchesQuery && (statusFilter === 'All statuses' || user.status === statusFilter);
  }).slice(0, 250), [users, userSearch, statusFilter]);

  return <div className="admin-board">
    <div className="test-intro">
      <div><span className="eyebrow">ADMIN CONTROL CENTER</span><h2>Accounts, roles and departments.</h2><p>Approve PTCL employees before they can access the workspace.</p></div>
      <span className="metric-icon green"><ShieldCheck size={23}/></span>
    </div>

    {message && <p className="success-message" role="status">{message}</p>}

    <div className="test-summary">
      <article><span>Pending approval</span><strong>{pending.length}</strong></article>
      <article><span>Password resets</span><strong>{resetRequests.filter(user => user.passwordReset?.status === 'Pending').length}</strong></article>
      <article><span>Active users</span><strong>{users.filter(user => user.status === 'Approved').length}</strong></article>
      <article><span>Administrators</span><strong>{users.filter(user => user.role === 'Admin').length}</strong></article>
    </div>

    <section className="requests">
      <div className="section-title">
        <div><h2>Team account directory <span className="count">{users.length}</span></h2><p>Search accounts, filter access status, and manage employee access.</p></div>
        <div className="admin-directory-actions">
          <button className="text-button" onClick={activateDemoAccounts} disabled={!inactiveDemoAccounts} title={inactiveDemoAccounts ? `Activate ${inactiveDemoAccounts} suspended demo accounts` : 'All demo accounts are active'}><ShieldCheck size={15}/>{inactiveDemoAccounts ? `Activate ${inactiveDemoAccounts} demo users` : 'All demo users active'}</button>
          <button className="text-button" onClick={downloadDemoCredentials}><Download size={15}/>Download demo credentials</button>
        </div>
      </div>

      <div className="admin-directory-filters">
        <label className="search admin-account-search"><Users size={16}/><input value={userSearch} onChange={event => setUserSearch(event.target.value)} placeholder="Search name, email, employee ID or department…"/><span>{visibleUsers.length} shown</span></label>
        <label className="filter admin-status-filter"><Filter size={15}/><select aria-label="Filter accounts by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)}>{(['All statuses', 'Approved', 'Pending', 'Rejected'] as const).map(status => <option key={status} value={status}>{status === 'Approved' ? 'Active' : status === 'Rejected' ? 'Suspended' : status}</option>)}</select></label>
      </div>

      <div className="table-scroll"><table>
        <thead><tr><th>EMPLOYEE</th><th>EMPLOYEE NO.</th><th>DEPARTMENT GROUP</th><th>TEAM</th><th>DESIGNATION</th><th>STATUS</th><th>ROLE</th><th>ACTIONS</th></tr></thead>
        <tbody>{visibleUsers.map(user => <tr key={user.id}>
          <td><div className="admin-user">{user.photo ? <img src={user.photo} alt=""/> : <span>{user.fullName.split(' ').map(word => word[0]).slice(0, 2).join('')}</span>}<div><strong>{user.fullName}</strong><small>{user.email}<br/>{user.mobile}</small></div></div></td>
          <td>{user.employeeNo}</td><td>{getDepartmentMapping(user).category}</td><td>{getDepartmentMapping(user).team}</td><td>{user.designation}</td>
          <td><AccountStatus status={user.status}/></td>
          <td><select aria-label={`Role for ${user.fullName}`} disabled={user.id === currentUser.id} value={user.role} onChange={event => setRole(user.id, event.target.value as UserRole)}>{(['Employee', 'Department Manager', 'Admin'] as const).map(role => <option key={role}>{role}</option>)}</select></td>
          <td className="admin-actions">{user.status === 'Pending' && <><button className="row-action" onClick={() => setStatus(user.id, 'Approved')}><Check size={15}/>Activate</button><button className="row-action danger-action" onClick={() => setStatus(user.id, 'Rejected')}><X size={15}/>Reject</button></>}{user.status === 'Rejected' && <button className="row-action" onClick={() => setStatus(user.id, 'Approved')}><Check size={15}/>Activate</button>}{user.status === 'Approved' && user.id !== currentUser.id && <button className="row-action danger-action" onClick={() => setStatus(user.id, 'Rejected')}><Ban size={15}/>Suspend</button>}</td>
        </tr>)}{!visibleUsers.length && <tr><td colSpan={8}>No account matches these filters.</td></tr>}</tbody>
      </table></div>
    </section>

    <section className="requests">
      <div className="section-title"><div><h2>Password reset requests</h2><p>Review employee recovery requests. Administrator accounts use the secured administrator recovery process.</p></div></div>
      <div className="table-scroll"><table>
        <thead><tr><th>EMPLOYEE</th><th>EMAIL</th><th>REQUESTED</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
        <tbody>{resetRequests.map(user => <tr key={user.id}><td>{user.fullName}</td><td>{user.email}</td><td>{new Date(user.passwordReset!.requestedAt).toLocaleString()}</td><td><AccountStatus status={user.passwordReset!.status}/>{user.passwordReset!.status === 'Approved' && user.passwordReset!.code && <small>Recovery code: <strong>{user.passwordReset!.code}</strong></small>}</td><td className="admin-actions">{user.passwordReset!.status === 'Pending' && <><button className="row-action" onClick={() => reviewPasswordReset(user.id, 'Approved')}><Check size={15}/>Approve reset</button><button className="row-action danger-action" onClick={() => reviewPasswordReset(user.id, 'Rejected')}><X size={15}/>Reject reset</button></>}</td></tr>)}{!resetRequests.length && <tr><td colSpan={5}>No password reset requests.</td></tr>}</tbody>
      </table></div>
    </section>

    <section className="test-editor department-admin">
      <div className="section-title"><div><h2>Signup departments</h2><p>These appear in the PTCL employee signup form.</p></div></div>
      <form onSubmit={addDepartment} className="department-form"><input aria-label="New department" value={department} onChange={event => setDepartment(event.target.value)} maxLength={100} placeholder="Add department"/><button className="primary"><Plus size={16}/>Add department</button></form>
      <div className="department-chips">{departments.map(item => <span key={item}>{item}<button aria-label={`Remove ${item}`} onClick={() => removeDepartment(item)}><Trash2 size={13}/></button></span>)}</div>
    </section>
  </div>;
}
