import { baseTemplate, btn, heading, subheading, divider, smallNote } from './base'

export function passwordResetEmail(opts: {
  recipientName: string
  resetUrl: string
}): { subject: string; html: string } {
  const firstName = opts.recipientName.split(' ')[0]

  const body = `
    ${heading('Reset your password')}
    ${subheading(`Hi ${firstName}, we received a request to reset your iClose password.`)}
    <div style="margin:8px 0 24px;">
      ${btn('Reset password', opts.resetUrl)}
    </div>
    ${divider()}
    ${smallNote('This link expires in 1 hour. If you didn\'t request a password reset, you can safely ignore this email — your password won\'t change.')}
  `

  return {
    subject: 'Reset your iClose password',
    html: baseTemplate({
      previewText: 'Reset your iClose password — link expires in 1 hour',
      body,
      footerNote: 'You received this because a password reset was requested for your account.',
    }),
  }
}
