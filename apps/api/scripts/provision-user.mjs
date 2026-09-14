import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';

const [email, displayName, password, workspaceName = 'PTCL QA Workspace', role = 'Super Admin'] = process.argv.slice(2);
if (!process.env.DATABASE_URL || !email || !displayName || !password || password.length < 12) throw new Error('Usage: npm run provision:user -- email name password(12+ chars) [workspace] [role]');
const allowed = new Set(['Super Admin','Admin','Project Manager','Product Manager','QA Lead','QA Engineer','Developer','Viewer']);
if (!allowed.has(role)) throw new Error('Invalid role.');
const salt = randomBytes(16); const hash = scryptSync(password,salt,64); const passwordHash = `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL}); const client = await pool.connect();
try { await client.query('begin'); const workspace = await client.query('insert into workspace(name) values($1) on conflict do nothing returning id',[workspaceName]); const found = workspace.rows[0] ?? (await client.query('select id from workspace where name=$1 limit 1',[workspaceName])).rows[0]; const user = await client.query('insert into app_user(email,display_name,password_hash) values(lower($1),$2,$3) on conflict(email) do update set display_name=excluded.display_name,password_hash=excluded.password_hash,active=true returning id',[email,displayName,passwordHash]); await client.query('insert into workspace_member(workspace_id,user_id,role) values($1,$2,$3) on conflict(workspace_id,user_id) do update set role=excluded.role',[found.id,user.rows[0].id,role]); await client.query('commit'); console.log(`Provisioned ${email} in ${workspaceName} as ${role}.`); } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); await pool.end(); }
