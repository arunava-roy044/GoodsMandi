'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'
import { errorMessage } from '@/lib/utils'

// College emails are Microsoft 365 (Outlook) inboxes
const OUTLOOK_URL = 'https://outlook.office.com/mail/'
const RESEND_COOLDOWN_SECONDS = 60

type Props = {
  email: string
  // Shown at the top, e.g. why they're seeing this screen
  intro?: string
  onBack: () => void
  backLabel: string
  // 0 lets them resend straight away (e.g. the original email is long gone)
  initialCooldown?: number
}

// Shown after sign-up (and when someone tries to log in before confirming) so they know
// to open their college Outlook mail and click the verify link.
export function CheckEmailScreen({ email, intro, onBack, backLabel, initialCooldown = RESEND_COOLDOWN_SECONDS }: Props) {
  const [cooldown, setCooldown] = useState(initialCooldown)
  const [resending, setResending] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleResend = async () => {
    setResending(true)
    try {
      const { error } = await createClient().auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        showToast(error.message || 'Could not send the email again. Try again in a minute.', 'error')
      } else {
        showToast('Sent again. Check your Outlook inbox and Junk folder.', 'success')
        setCooldown(RESEND_COOLDOWN_SECONDS)
      }
    } catch (err) {
      showToast(errorMessage(err, 'Could not send the email again.'), 'error')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="glass-card p-8 rounded-lg w-full">
      <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <h2 className="text-2xl font-semibold text-white mb-2 text-center">Verify your college email</h2>
      {intro && <p className="text-slate-300 text-center mb-2">{intro}</p>}
      <p className="text-slate-400 text-center mb-6">
        We sent a verification link to{' '}
        <span className="text-white font-medium break-all">{email}</span>.
        You need to click it before you can log in.
      </p>

      <ol className="space-y-3 mb-6 text-sm text-slate-300">
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-center">1</span>
          <span>Open your college email in <span className="text-white font-medium">Outlook</span> (sign in with the same college email and its password).</span>
        </li>
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-center">2</span>
          <span>Find the email from GoodsMandi and click <span className="text-white font-medium">Confirm your email</span>.</span>
        </li>
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-center">3</span>
          <span>Come back here and log in.</span>
        </li>
      </ol>

      <a
        href={OUTLOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary w-full py-2.5 flex justify-center items-center gap-2"
      >
        Open Outlook
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>

      <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
        Can&apos;t find it? Check your <span className="font-medium">Junk Email</span> folder and the{' '}
        <span className="font-medium">Other</span> tab in Outlook. It can take a couple of minutes to arrive.
      </div>

      <button
        type="button"
        onClick={handleResend}
        disabled={resending || cooldown > 0}
        className="btn-secondary w-full py-2.5 mt-4 flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {resending ? <Spinner size="sm" /> : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
      </button>

      <p className="mt-4 text-xs text-slate-500 text-center">
        Opened the link on your phone or another browser? That&apos;s fine. Your email still gets confirmed, so just log in here.
      </p>

      <div className="mt-6 text-center text-sm">
        <button type="button" onClick={onBack} className="text-emerald-400 hover:text-emerald-300 font-medium">
          {backLabel}
        </button>
      </div>
    </div>
  )
}
