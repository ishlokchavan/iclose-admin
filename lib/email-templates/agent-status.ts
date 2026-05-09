import { baseTemplate, btn, heading, subheading, infoTable, divider, smallNote } from './base'

export function agentStatusEmail(opts: {
  agentName: string
  newStatus: string
  reason?: string
  portalUrl?: string
}): { subject: string; html: string } {
  const firstName = opts.agentName.split(' ')[0]

  const STATUS_COPY: Record<string, { subject: string; headline: string; sub: string; color: string }> = {
    contacted: {
      subject: `We've reviewed your application`,
      headline: `Hi ${firstName}, we've reviewed your application`,
      sub: 'Our team will be in touch shortly to discuss next steps.',
      color: '#0071e3',
    },
    approved: {
      subject: `Your iClose application is approved`,
      headline: `Great news, ${firstName} — you're approved!`,
      sub: 'Your agent account is being set up. You\'ll receive another email shortly with your login details.',
      color: '#34c759',
    },
    active: {
      subject: `Your iClose account is now active`,
      headline: `Welcome aboard, ${firstName}!`,
      sub: 'Your account is fully active. Sign in to your portal to get started.',
      color: '#34c759',
    },
    rejected: {
      subject: `Update on your iClose application`,
      headline: `Hi ${firstName}, an update on your application`,
      sub: 'Thank you for your interest in iClose. Unfortunately we\'re unable to proceed with your application at this time.',
      color: '#ff3b30',
    },
  }

  const copy = STATUS_COPY[opts.newStatus] ?? {
    subject: `Your iClose application status has been updated`,
    headline: `Hi ${firstName}, your application status has been updated`,
    sub: `Your application status is now: ${opts.newStatus}.`,
    color: '#0071e3',
  }

  const body = `
    ${heading(copy.headline)}
    ${subheading(copy.sub)}
    ${opts.reason ? `<div style="background:#f5f5f7;border-radius:10px;padding:16px;margin:20px 0;font-size:14px;color:#1d1d1f;line-height:1.6;font-style:italic;">"${opts.reason}"</div>` : ''}
    ${opts.portalUrl && opts.newStatus === 'active' ? `
      <div style="margin:24px 0 8px;">${btn('Access your portal', opts.portalUrl, copy.color)}</div>
    ` : ''}
    ${divider()}
    ${smallNote('If you have questions, reply to this email or contact support@iclose.ae.')}
  `

  return {
    subject: copy.subject,
    html: baseTemplate({
      previewText: copy.sub,
      body,
    }),
  }
}
