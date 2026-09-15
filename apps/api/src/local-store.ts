import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export type Role = 'Super Admin' | 'Admin' | 'Project Manager' | 'Product Manager' | 'QA Lead' | 'QA Engineer' | 'Developer' | 'Viewer';
export type StoredUser = { id: string; email: string; displayName: string; passwordHash: string; active: boolean; createdAt: string };
export type StoredWorkspace = { id: string; name: string; createdAt: string };
export type StoredMembership = { workspaceId: string; userId: string; role: Role };
export type StoredRecord = { id: string; workspaceId: string; projectId: string | null; entityType: string; title: string; status: string; payload: Record<string, unknown>; createdBy: string; updatedBy: string; createdAt: string; updatedAt: string };
export type StoredAudit = { id: string; workspaceId: string; actorId: string; entityId: string; action: string; before: unknown; after: unknown; createdAt: string };
export type LocalData = { version: 1; users: StoredUser[]; workspaces: StoredWorkspace[]; memberships: StoredMembership[]; records: StoredRecord[]; audits: StoredAudit[] };

const emptyData = (): LocalData => ({ version: 1, users: [], workspaces: [], memberships: [], records: [], audits: [] });
export const localDataPath = () => resolve(process.env.LOCAL_DATA_FILE ?? '.data/pf360.json');

export async function readLocalData(): Promise<LocalData> {
  try {
    const parsed = JSON.parse(await readFile(localDataPath(), 'utf8')) as Partial<LocalData>;
    return { ...emptyData(), ...parsed, users: parsed.users ?? [], workspaces: parsed.workspaces ?? [], memberships: parsed.memberships ?? [], records: parsed.records ?? [], audits: parsed.audits ?? [] };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyData();
    throw error;
  }
}

export async function writeLocalData(data: LocalData) {
  const file = localDataPath();
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temporary, file);
}
