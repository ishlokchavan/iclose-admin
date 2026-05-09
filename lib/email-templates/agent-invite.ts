import { baseTemplate, btn, heading, subheading, para, infoTable, divider, smallNote } from './base'

export function agentInviteEmail(opts: {
  agentName: string
  inviteUrl: string
  plan?: string
}): { subject: string; html: string } {
  const firstName = opts.agentName.split(' ')[0]

  const body = `
    ${heading(`Welcome to iClose, ${firstName} 👋`)}
    ${subheading('Your agent account has been approved. Set your password to access your portal.')}
    <div style="margin:8px 0 24px;">
      ${btn('Set up your account', opts.inviteUrl)}
    </div>
    <div style="background:#f5f5f7;border-radius:12px;padding:20px;margin:24px 0;">
      <p style="font-size:13px;color:#6e6e73;margin:0 0 12px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;">What you get with iClose</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${[
          ['Up to 100% commission', 'Keep more of every deal you close'],
          ['Same-day payouts', 'No waiting weeks for your money'],
          ['Stay anonymous', 'Your clients and deals stay private'],
          ['Deal desk access', 'Support on every transaction'],
        ].map(([title, desc]) => `
          <tr>
            <td style="padding:6px 0;vertical-align:top;width:20px;font-size:15px;">✓</td>
            <td style="padding:6px 0 6px 8px;">
              <span style="font-size:14px;font-weight:500;color:#1d1d1f;">${title}</span>
              <span style="font-size:13px;color:#6e6e73;"> — ${desc}</span>
            </td>
          </tr>`).join('')}
      </table>
    </div>
    ${divider()}
    ${smallNote('This invite link expires in 24 hours. If you have any questions, reply to this email or contact your account manager.')}
  `

  return {
    subject: `Your iClose agent account is ready`,
    html: baseTemplate({
      previewText: `Welcome to iClose, ${firstName} — your account is ready`,
      body,
      footerNote: 'You received this because you applied to join iClose as an agent.',
    }),
  }
}
