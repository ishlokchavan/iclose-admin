import 'server-only'
import type { Agent } from '@/db/schema'

/**
 * Email helpers using Resend.
 * Falls back to console.log in development if RESEND_API_KEY is not set.
 */

async function sendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[email:dev] Would send email:', { to: opts.to, subject: opts.subject })
      return
    }
    throw new Error('RESEND_API_KEY is not configured')
  }

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from: 'iClose Admin <noreply@iclose.ae>',
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
  })

  if (error) {
    console.error('[email] Send failed:', error)
    throw new Error(`Email send failed: ${error.message}`)
  }
}

/**
 * Notify agent managers when a new agent application is submitted.
 */
export async function sendNewAgentNotification(
  agent: Pick<Agent, 'fullName' | 'isLicensedAgent' | 'applicationStatus' | 'appliedAt'>,
  managerEmails: string[]
): Promise<void> {
  if (managerEmails.length === 0) return

  const agentType = agent.isLicensedAgent ? 'Licensed Agent' : 'Connector / Referrer'
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.iclose.ae'

  await sendEmail({
    to: managerEmails,
    subject: `New agent application — ${agent.fullName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1d1d1f;">
        <div style="padding: 40px 0 24px;">
          <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.02em;">
            New agent application
          </h1>
          <p style="font-size: 15px; color: #6e6e73; margin: 0;">
            A new agent has registered on iClose.
          </p>
        </div>

        <div style="background: #f5f5f7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #6e6e73; width: 120px;">Name</td>
              <td style="padding: 6px 0; font-size: 14px; font-weight: 500;">${agent.fullName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #6e6e73;">Type</td>
              <td style="padding: 6px 0; font-size: 14px;">${agentType}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #6e6e73;">Status</td>
              <td style="padding: 6px 0; font-size: 14px;">Applied</td>
            </tr>
          </table>
        </div>

        <a
          href="${adminUrl}/dashboard/agents"
          style="display: inline-block; background: #0071e3; color: white; text-decoration: none;
                 font-size: 14px; font-weight: 500; padding: 10px 20px; border-radius: 980px;"
        >
          Review application →
        </a>

        <p style="margin-top: 32px; font-size: 12px; color: #86868b;">
          This is an automated notification from iClose Admin.
        </p>
      </div>
    `,
  })
}

/**
 * Send invite email when an agent is approved (Supabase Auth invite).
 * Note: Supabase sends its own invite email — this is a supplemental welcome.
 */
export async function sendAgentApprovalEmail(
  agentEmail: string,
  agentName: string
): Promise<void> {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.iclose.ae'

  await sendEmail({
    to: agentEmail,
    subject: 'Your iClose agent account has been approved',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1d1d1f;">
        <div style="padding: 40px 0 24px;">
          <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.02em;">
            Welcome to iClose, ${agentName.split(' ')[0]}
          </h1>
          <p style="font-size: 15px; color: #6e6e73; margin: 0;">
            Your agent application has been approved.
          </p>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #1d1d1f;">
          You&apos;ll receive a separate email with a link to set up your password and access your agent portal.
        </p>
        <p style="margin-top: 32px; font-size: 12px; color: #86868b;">
          iClose · Dubai, UAE
        </p>
      </div>
    `,
  })
}
