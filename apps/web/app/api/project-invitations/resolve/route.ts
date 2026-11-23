import { NextResponse } from 'next/server';
import { hashInvitationToken, publicInvitation, readInvitations } from '../../../../lib/server/project-invitations';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (token.length < 32 || token.length > 128) return NextResponse.json({ error: 'This invitation link is invalid.' }, { status: 400 });
  try {
    const { invitations } = await readInvitations();
    const invite = invitations.find(item => item.tokenHash === hashInvitationToken(token));
    if (!invite) return NextResponse.json({ error: 'This invitation link is invalid or has already been removed.' }, { status: 404 });
    if (Date.parse(invite.expiresAt) <= Date.now() && invite.status === 'Pending') return NextResponse.json({ error: 'This invitation has expired. Ask the project owner to send a new link.' }, { status: 410 });
    return NextResponse.json({ invitation: publicInvitation(invite) });
  } catch {
    return NextResponse.json({ error: 'Project invitations are temporarily unavailable.' }, { status: 500 });
  }
}
