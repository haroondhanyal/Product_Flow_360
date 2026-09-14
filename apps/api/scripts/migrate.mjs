import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query('create table if not exists schema_migration (name text primary key, applied_at timestamptz not null default now())');
for (const name of (await readdir(new URL('../migrations/', import.meta.url))).filter(name => name.endsWith('.sql')).sort()) {
  const applied = await pool.query('select 1 from schema_migration where name=$1',[name]);
  if (applied.rowCount) continue;
  const sql = await readFile(join(new URL('../migrations/', import.meta.url).pathname,name),'utf8');
  const client = await pool.connect();
  try { await client.query('begin'); await client.query(sql); await client.query('insert into schema_migration(name) values($1)',[name]); await client.query('commit'); console.log(`Applied ${name}`); }
  catch (error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
}
await pool.end();
