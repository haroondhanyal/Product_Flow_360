import { NextResponse } from 'next/server';
import { hashInvitationToken, publicInvitation, readInvitations, writeInvitations } from '../../../../lib/server/project-invitations';

export const runtime = 'nodejs';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { token?: unknown; email?: unknown; response?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: 'Invalid invitation response.' }, { status: 400 }); }
  const token = typeof body.token === 'string' ? body.token : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const response = body.response;
  if (token.length < 32 || token.length > 128 || !emailPattern.test(email) || !['Accepted','Declined'].includes(String(response))) {
    return NextResponse.json({ error: 'Provide the invite link, invited account email and a valid response.' }, { status: 400 });
  }
  try {
    const store = await readInvitations();
    const index = store.invitations.findIndex(item => item.tokenHash === hashInvitationToken(token));
    if (index < 0) return NextResponse.json({ error: 'This invitation link is invalid.' }, { status: 404 });
    const invite = store.invitations[index];
    if (invite.recipientEmail !== email) return NextResponse.json({ error: `Sign in with the invited account: ${invite.recipientEmail}.` }, { status: 403 });
    if (Date.parse(invite.expiresAt) <= Date.now() && invite.status === 'Pending') return NextResponse.json({ error: 'This invitation has expired. Ask the project owner to send a new link.' }, { status: 410 });
    if (invite.status !== 'Pending') return NextResponse.json({ error: `This invitation was already ${invite.status.toLowerCase()}.` }, { status: 409 });
    const updated = { ...invite, status: response as 'Accepted' | 'Declined', respondedAt: new Date().toISOString() };
    store.invitations[index] = updated;
    await writeInvitations(store);
    return NextResponse.json({ invitation: publicInvitation(updated) });
  } catch {
    return NextResponse.json({ error: 'Your response could not be saved on this app server.' }, { status: 500 });
  }
}
