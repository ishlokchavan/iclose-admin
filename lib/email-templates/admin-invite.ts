import { baseTemplate, btn, heading, subheading, para, infoTable, divider, smallNote } from './base'

export function adminInviteEmail(opts: {
  recipientName: string
  inviterName: string
  role: string
  inviteUrl: string
}): { subject: string; html: string } {
  const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin',
    agent_manager: 'Agent Manager',
    content_manager: 'Content Manager',
    auditor: 'Auditor',
  }

  const roleLabel = ROLE_LABELS[opts.role] ?? opts.role
  const firstName = opts.recipientName.split(' ')[0]

  const body = `
    ${heading(`You've been invited to iClose Admin`)}
    ${subheading(`${opts.inviterName} has invited you to join the iClose admin panel as <strong>${roleLabel}</strong>.`)}
    ${infoTable([
      ['Your name', opts.recipientName],
      ['Role', roleLabel],
      ['Platform', 'iClose Admin'],
    ])}
    <div style="margin:28px 0 8px;">
      ${btn('Accept invite & set password', opts.inviteUrl)}
    </div>
    ${divider()}
    ${smallNote(`This invite link expires in 24 hours. If you didn't expect this email, you can safely ignore it.`)}
  `

  return {
    subject: `You've been invited to iClose Admin`,
    html: baseTemplate({
      previewText: `${opts.inviterName} invited you to iClose Admin as ${roleLabel}`,
      body,
      footerNote: 'You received this because an admin invited you to iClose.',
    }),
  }
}
