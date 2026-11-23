import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type InvitationStatus = 'Pending' | 'Accepted' | 'Declined';
export type ProjectInvitation = {
  id: string; tokenHash: string; projectId: string; projectCode: string; projectName: string; projectDescription: string;
  workspaceId: string; workspaceName: string; senderUserId: string; senderName: string; senderEmail: string;
  recipientEmail: string; recipientName: string; status: InvitationStatus; createdAt: string; expiresAt: string; respondedAt?: string;
};
type Store = { version: 1; invitations: ProjectInvitation[] };
const empty = (): Store => ({ version: 1, invitations: [] });
const storePath = () => join(process.cwd(), '.data', 'project-invitations.json');
export const hashInvitationToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function readInvitations(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(storePath(), 'utf8')) as Partial<Store>;
    if (parsed.version !== 1 || !Array.isArray(parsed.invitations)) throw new Error('Project invitation store is invalid.');
    return { version: 1, invitations: parsed.invitations };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return empty();
    throw error;
  }
}

export async function writeInvitations(store: Store) {
  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, path);
}

export function makeInvitation(input: Omit<ProjectInvitation, 'id' | 'tokenHash' | 'status' | 'createdAt' | 'expiresAt' | 'respondedAt'>) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  const invitation: ProjectInvitation = {
    ...input,
    id: randomUUID(),
    tokenHash: hashInvitationToken(token),
    status: 'Pending',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  return { invitation, token };
}

export function publicInvitation(invitation: ProjectInvitation) {
  const { tokenHash: _tokenHash, ...safe } = invitation;
  return safe;
}
