'use client';

import { AuthPortal } from '../../../components/auth-portal';
import { ProjectInvitationLanding } from '../../../components/project-invitation-landing';

export default function ProjectInvitationPage() {
  return <AuthPortal>{session=><ProjectInvitationLanding user={session.user} signOut={session.signOut}/>}</AuthPortal>;
}
