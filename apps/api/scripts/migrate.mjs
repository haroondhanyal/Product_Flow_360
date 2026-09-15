import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const file = resolve(process.env.LOCAL_DATA_FILE ?? '.data/pf360.json');
try { JSON.parse(await readFile(file, 'utf8')); console.log(`Local data store is ready at ${file}`); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await writeFile(temporary, `${JSON.stringify({ version: 1, users: [], workspaces: [], memberships: [], records: [], audits: [] }, null, 2)}\n`);
  await rename(temporary, file);
  console.log(`Created local data store at ${file}`);
}
