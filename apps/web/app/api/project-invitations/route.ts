import { NextResponse } from 'next/server';
import { makeInvitation, publicInvitation, readInvitations, writeInvitations } from '../../../lib/server/project-invitations';

export const runtime = 'nodejs';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get('email')?.trim().toLowerCase() ?? '';
  if (!emailPattern.test(email)) return NextResponse.json({ error: 'Provide a valid account email.' }, { status: 400 });
  try {
    const { invitations } = await readInvitations();
    const items = invitations.filter(invite => invite.senderEmail === email || invite.recipientEmail === email).map(publicInvitation);
    return NextResponse.json({ invitations: items });
  } catch {
    return NextResponse.json({ error: 'Project invitations are temporarily unavailable.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: 'Invalid invitation request.' }, { status: 400 }); }
  const projectId = clean(body.projectId, 120), projectCode = clean(body.projectCode, 12), projectName = clean(body.projectName, 120);
  const workspaceId = clean(body.workspaceId, 120), workspaceName = clean(body.workspaceName, 120);
  const senderUserId = clean(body.senderUserId, 120), senderName = clean(body.senderName, 100), senderEmail = clean(body.senderEmail, 254).toLowerCase();
  const recipientEmail = clean(body.recipientEmail, 254).toLowerCase(), recipientName = clean(body.recipientName, 100);
  const projectDescription = clean(body.projectDescription, 500);
  if (!projectId || !projectCode || !projectName || !workspaceId || !workspaceName || !senderUserId || !senderName || !emailPattern.test(senderEmail) || !emailPattern.test(recipientEmail)) {
    return NextResponse.json({ error: 'Project, workspace, sender and recipient details are required.' }, { status: 400 });
  }
  if (senderEmail === recipientEmail) return NextResponse.json({ error: 'Choose another person to invite.' }, { status: 400 });
  try {
    const store = await readInvitations();
    const duplicate = store.invitations.find(invite => invite.projectId === projectId && invite.recipientEmail === recipientEmail && invite.status === 'Pending' && Date.parse(invite.expiresAt) > Date.now());
    if (duplicate) return NextResponse.json({ error: 'A pending invitation already exists for this email and project.' }, { status: 409 });
    const { invitation, token } = makeInvitation({ projectId, projectCode, projectName, projectDescription, workspaceId, workspaceName, senderUserId, senderName, senderEmail, recipientEmail, recipientName });
    store.invitations.unshift(invitation);
    await writeInvitations(store);
    const inviteUrl = new URL(`/invite/project?token=${encodeURIComponent(token)}`, new URL(request.url).origin).toString();
    return NextResponse.json({ invitation: publicInvitation(invitation), inviteUrl }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Project invitation could not be saved on this app server.' }, { status: 500 });
  }
}
