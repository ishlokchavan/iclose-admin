'use client'

import { useEffect, useState } from 'react'
import LoginForm from './login-form'
import InviteHandler from './invite-handler'

/**
 * Client component that detects whether the URL contains an invite token.
 * Shows InviteHandler if so, otherwise shows the normal LoginForm.
 */
export default function InviteDetector() {
  const [isInvite, setIsInvite] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const type = params.get('type')
    const token = params.get('access_token')
    setIsInvite(!!token && type === 'invite')
    setChecked(true)
  }, [])

  if (!checked) {
    return (
      <div className="flex justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-hairline border-t-accent" />
      </div>
    )
  }

  return isInvite ? <InviteHandler /> : <LoginForm />
}
