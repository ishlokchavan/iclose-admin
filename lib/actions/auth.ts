'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { profiles } from '@/db/schema'
import { z } from 'zod'

// ─── Validation schemas ───────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
})

const verifyMfaSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Digits only'),
  factorId: z.string().min(1),
  challengeId: z.string().min(1),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthResult =
  | { ok: true; mfaRequired?: boolean; factorId?: string; challengeId?: string }
  | { ok: false; error: string }

// ─── Sign in ──────────────────────────────────────────────────────────────────

export async function signIn(formData: FormData): Promise<AuthResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Generic message — don't reveal whether email or password was wrong
    if (
      error.message.includes('Invalid login credentials') ||
      error.message.includes('invalid_credentials')
    ) {
      return { ok: false, error: 'Incorrect email or password.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { ok: false, error: 'Please verify your email address first.' }
    }
    return { ok: false, error: 'Sign in failed. Please try again.' }
  }

  // Check if MFA is required
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (
    aalData &&
    aalData.nextLevel === 'aal2' &&
    aalData.nextLevel !== aalData.currentLevel
  ) {
    // User has MFA enrolled — issue a challenge
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totpFactor = factors?.totp?.[0]

    if (totpFactor) {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id })

      if (challengeError || !challenge) {
        return { ok: false, error: 'Failed to initiate MFA challenge.' }
      }

      return {
        ok: true,
        mfaRequired: true,
        factorId: totpFactor.id,
        challengeId: challenge.id,
      }
    }
  }

  return { ok: true }
}

// ─── Verify MFA ───────────────────────────────────────────────────────────────

export async function verifyMfa(formData: FormData): Promise<AuthResult> {
  const parsed = verifyMfaSchema.safeParse({
    code: formData.get('code'),
    factorId: formData.get('factorId'),
    challengeId: formData.get('challengeId'),
  })

  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.verify({
    factorId: parsed.data.factorId,
    challengeId: parsed.data.challengeId,
    code: parsed.data.code,
  })

  if (error) {
    return { ok: false, error: 'Invalid code. Please try again.' }
  }

  return { ok: true }
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ─── Reset password (send email) ──────────────────────────────────────────────

export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse({
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message }
  }

  // Use our custom email via Resend instead of Supabase's rate-limited email
  const { sendPasswordReset } = await import('@/lib/email')
  const { createServiceClient } = await import('@/lib/supabase/service')
  const sb = createServiceClient()

  // Look up the user's name (best effort)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: authData } = await (sb.auth.admin as any).listUsers({ perPage: 1000 })
  const user = (authData?.users ?? []).find((u: {email?: string}) => u.email === parsed.data.email)
  const name = user?.user_metadata?.full_name ?? parsed.data.email.split('@')[0]

  await sendPasswordReset({ recipientEmail: parsed.data.email, recipientName: name })

  // Always return ok — don't reveal whether email exists
  return { ok: true }
}

// ─── Update password (after reset link) ──────────────────────────────────────

export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { ok: false, error: 'Failed to update password. Please try again.' }
  }

  redirect('/dashboard')
}

// ─── MFA: enroll ─────────────────────────────────────────────────────────────

export async function enrollMfa(): Promise<
  { ok: true; factorId: string; qrCode: string; secret: string } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'iClose Admin',
  })

  if (error || !data) {
    return { ok: false, error: 'Failed to start MFA enrollment.' }
  }

  return {
    ok: true,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  }
}

// ─── MFA: confirm enrollment ─────────────────────────────────────────────────

export async function confirmMfaEnrollment(formData: FormData): Promise<AuthResult> {
  const factorId = formData.get('factorId') as string
  const code = formData.get('code') as string

  if (!factorId || !code || code.length !== 6) {
    return { ok: false, error: 'Invalid code.' }
  }

  const supabase = await createClient()

  // Challenge then verify to confirm enrollment
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId })

  if (challengeError || !challenge) {
    return { ok: false, error: 'Failed to create challenge.' }
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })

  if (verifyError) {
    return { ok: false, error: 'Invalid code. Check your authenticator app.' }
  }

  return { ok: true }
}

// ─── MFA: unenroll ───────────────────────────────────────────────────────────

export async function unenrollMfa(factorId: string): Promise<AuthResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.unenroll({ factorId })

  if (error) {
    return { ok: false, error: 'Failed to remove MFA.' }
  }

  return { ok: true }
}

// ─── Create profile (called server-side after invite accepted) ────────────────

export async function createProfile({
  id,
  fullName,
  role = 'agent',
}: {
  id: string
  fullName: string
  role?: 'super_admin' | 'content_manager' | 'agent_manager' | 'agent' | 'auditor'
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await db.insert(profiles).values({ id, fullName, role }).onConflictDoNothing()
    return { ok: true }
  } catch (err) {
    console.error('[createProfile]', err)
    return { ok: false, error: 'Failed to create profile.' }
  }
}
