import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const [email, displayName, password, workspaceName = 'PTCL QA Workspace', role = 'Super Admin'] = process.argv.slice(2);
if (!email || !displayName || !password || password.length < 12) throw new Error('Usage: npm run provision:user -- email name password(12+ chars) [workspace] [role]');
const allowed = new Set(['Super Admin','Admin','Project Manager','Product Manager','QA Lead','QA Engineer','Developer','Viewer']);
if (!allowed.has(role)) throw new Error('Invalid role.');
const file = resolve(process.env.LOCAL_DATA_FILE ?? '.data/pf360.json');
let data;
try { data = JSON.parse(await readFile(file, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; data = { version: 1, users: [], workspaces: [], memberships: [], records: [], audits: [] }; }
const salt = randomBytes(16); const hash = scryptSync(password, salt, 64); const passwordHash = `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
const now = new Date().toISOString();
let workspace = data.workspaces.find(candidate => candidate.name === workspaceName);
if (!workspace) { workspace = { id: randomUUID(), name: workspaceName, createdAt: now }; data.workspaces.push(workspace); }
let user = data.users.find(candidate => candidate.email.toLowerCase() === email.toLowerCase());
if (!user) { user = { id: randomUUID(), email: email.toLowerCase(), displayName, passwordHash, active: true, createdAt: now }; data.users.push(user); }
else Object.assign(user, { displayName, passwordHash, active: true });
const membership = data.memberships.find(candidate => candidate.workspaceId === workspace.id && candidate.userId === user.id);
if (membership) membership.role = role; else data.memberships.push({ workspaceId: workspace.id, userId: user.id, role });
await mkdir(dirname(file), { recursive: true }); const temporary = `${file}.tmp`; await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`); await rename(temporary, file);
console.log(`Provisioned ${email} in ${workspaceName} as ${role}.`);
