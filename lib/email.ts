import 'server-only'

/**
 * Central email sending via Resend.
 * Uses generateLink() from Supabase admin API to create auth URLs
 * without triggering Supabase's own emails (rate-limited on Free plan).
 *
 * Flow:
 *   1. supabase.auth.admin.generateLink() → get token URL (no email sent)
 *   2. Send our own branded email via Resend with that URL
 */

// ─── Core send ────────────────────────────────────────────────────────────────

export async function sendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    // Dev fallback — log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📧 [email:dev] ─────────────────────────')
      console.log('To:', opts.to)
      console.log('Subject:', opts.subject)
      console.log('────────────────────────────────────────\n')
      return { ok: true }
    }
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const { error } = await resend.emails.send({
      from: 'iClose <noreply@iclose.ae>',
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      replyTo: opts.replyTo ?? 'support@iclose.ae',
      subject: opts.subject,
      html: opts.html,
    })

    if (error) {
      console.error('[email] Resend error:', error)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[email] Send failed:', msg)
    return { ok: false, error: msg }
  }
}

// ─── Generate auth link (no Supabase email sent) ──────────────────────────────

/**
 * Creates a Supabase invite link for a new user WITHOUT sending Supabase's email.
 * We then send our own branded email instead.
 */
export async function generateInviteLink(email: string): Promise<string | null> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const sb = createServiceClient()

    const { data, error } = await sb.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_ADMIN_URL}/login`,
      },
    })

    if (error || !data?.properties?.action_link) {
      console.error('[email] generateInviteLink error:', error?.message)
      return null
    }

    return data.properties.action_link
  } catch (err) {
    console.error('[email] generateInviteLink failed:', err)
    return null
  }
}

/**
 * Generates a password reset link without sending Supabase's email.
 */
export async function generatePasswordResetLink(email: string): Promise<string | null> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const sb = createServiceClient()

    const { data, error } = await sb.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_ADMIN_URL}/login`,
      },
    })

    if (error || !data?.properties?.action_link) {
      console.error('[email] generatePasswordResetLink error:', error?.message)
      return null
    }

    return data.properties.action_link
  } catch (err) {
    console.error('[email] generatePasswordResetLink failed:', err)
    return null
  }
}

// ─── High-level send functions ────────────────────────────────────────────────

export async function sendAdminInvite(opts: {
  recipientEmail: string
  recipientName: string
  inviterName: string
  role: string
}): Promise<{ ok: boolean; error?: string }> {
  const { adminInviteEmail } = await import('./email-templates/admin-invite')

  // Generate link without triggering Supabase email
  const inviteUrl = await generateInviteLink(opts.recipientEmail)
  if (!inviteUrl) return { ok: false, error: 'Failed to generate invite link' }

  const { subject, html } = adminInviteEmail({
    recipientName: opts.recipientName,
    inviterName: opts.inviterName,
    role: opts.role,
    inviteUrl,
  })

  return sendEmail({ to: opts.recipientEmail, subject, html })
}

export async function sendAgentInvite(opts: {
  agentEmail: string
  agentName: string
  plan?: string
}): Promise<{ ok: boolean; error?: string }> {
  const { agentInviteEmail } = await import('./email-templates/agent-invite')

  const inviteUrl = await generateInviteLink(opts.agentEmail)
  if (!inviteUrl) return { ok: false, error: 'Failed to generate invite link' }

  const { subject, html } = agentInviteEmail({
    agentName: opts.agentName,
    inviteUrl,
    plan: opts.plan,
  })

  return sendEmail({ to: opts.agentEmail, subject, html })
}

export async function sendPasswordReset(opts: {
  recipientEmail: string
  recipientName: string
}): Promise<{ ok: boolean; error?: string }> {
  const { passwordResetEmail } = await import('./email-templates/password-reset')

  const resetUrl = await generatePasswordResetLink(opts.recipientEmail)
  if (!resetUrl) return { ok: false, error: 'Failed to generate reset link' }

  const { subject, html } = passwordResetEmail({
    recipientName: opts.recipientName,
    resetUrl,
  })

  return sendEmail({ to: opts.recipientEmail, subject, html })
}

export async function sendAgentStatusEmail(opts: {
  agentEmail: string
  agentName: string
  newStatus: string
  reason?: string
}): Promise<{ ok: boolean; error?: string }> {
  const { agentStatusEmail } = await import('./email-templates/agent-status')

  const portalUrl = `${process.env.NEXT_PUBLIC_ADMIN_URL}/portal`

  const { subject, html } = agentStatusEmail({
    agentName: opts.agentName,
    newStatus: opts.newStatus,
    reason: opts.reason,
    portalUrl,
  })

  return sendEmail({ to: opts.agentEmail, subject, html })
}

export async function sendNewAgentNotification(
  agent: { fullName: string; isLicensedAgent: boolean; applicationStatus: string; appliedAt: Date },
  managerEmails: string[]
): Promise<void> {
  if (managerEmails.length === 0) return

  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://iclose-admin.xlestates.com'
  const agentType = agent.isLicensedAgent ? 'Licensed Agent' : 'Connector / Referrer'

  const { baseTemplate, heading, subheading, btn, infoTable, divider, smallNote } = await import('./email-templates/base')

  const body = `
    ${heading('New agent application')}
    ${subheading('A new agent has registered on iClose and is waiting for review.')}
    ${infoTable([
      ['Name', agent.fullName],
      ['Type', agentType],
      ['Status', 'Applied'],
    ])}
    <div style="margin:24px 0 8px;">${btn('Review application →', `${adminUrl}/dashboard/agents`)}</div>
    ${divider()}
    ${smallNote('You received this as an iClose agent manager.')}
  `

  await sendEmail({
    to: managerEmails,
    subject: `New agent application — ${agent.fullName}`,
    html: baseTemplate({ previewText: `${agent.fullName} applied to join iClose`, body }),
  })
}
