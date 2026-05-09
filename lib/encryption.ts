import 'server-only'

/**
 * Field-level encryption helpers.
 *
 * In Phase 2 these are stubs — Phase 4 wires up pgcrypto via Supabase Vault.
 * The interface is stable so callers don't need to change.
 *
 * Production implementation will use:
 *   SELECT pgp_sym_encrypt(plaintext, key) → encrypted
 *   SELECT pgp_sym_decrypt(encrypted, key) → plaintext
 * with the key stored in Supabase Vault (ENCRYPTION_KEY_ID).
 */

/**
 * Encrypt a plaintext string for storage.
 * Returns the encrypted value (base64 encoded ciphertext in production).
 */
export async function encrypt(plaintext: string): Promise<string> {
  // Phase 4: call Supabase RPC pgp_sym_encrypt with Vault key
  // For now, return as-is (DO NOT deploy to production without Phase 4)
  if (process.env.NODE_ENV === 'production') {
    throw new Error('encrypt() stub called in production — complete Phase 4 first')
  }
  return `enc:${Buffer.from(plaintext).toString('base64')}`
}

/**
 * Decrypt an encrypted string for display.
 * Returns the plaintext value.
 */
export async function decrypt(ciphertext: string): Promise<string> {
  // Phase 4: call Supabase RPC pgp_sym_decrypt with Vault key
  if (process.env.NODE_ENV === 'production') {
    throw new Error('decrypt() stub called in production — complete Phase 4 first')
  }
  if (ciphertext.startsWith('enc:')) {
    return Buffer.from(ciphertext.slice(4), 'base64').toString('utf-8')
  }
  return ciphertext
}

/**
 * Hash a string (e.g. IP address) with SHA-256 + server-side pepper.
 * One-way — cannot be reversed.
 */
export async function hashPii(value: string): Promise<string> {
  const pepper = process.env.ENCRYPTION_KEY_ID ?? 'dev-pepper'
  const input = `${pepper}:${value}`
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Mask PII for display to users without decryption rights.
 */
export function maskValue(value: string): string {
  if (value.length <= 4) return '••••'
  return value.slice(0, 2) + '••••' + value.slice(-2)
}
