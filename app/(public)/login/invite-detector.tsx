'use client'

import { useEffect, useState } from 'react'
import LoginForm from './login-form'
import InviteHandler from './invite-handler'

/**
 * Detects whether the URL contains a Supabase invite/recovery token.
 * Shows InviteHandler if so, otherwise shows the normal LoginForm.
 * Renders LoginForm immediately on server (no spinner flash).
 */
export default function InviteDetector() {
  const [mode, setMode] = useState<'login' | 'invite'>('login')

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const type = params.get('type')
    const token = params.get('access_token')
    if (token && (type === 'invite' || type === 'recovery')) {
      setMode('invite')
    }
  }, [])

  return mode === 'invite' ? <InviteHandler /> : <LoginForm />
}
