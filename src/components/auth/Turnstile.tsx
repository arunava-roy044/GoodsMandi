'use client'

// Cloudflare Turnstile: a free "are you a person?" check for the forms that create accounts,
// log in, or send an email. The browser gets a one-time token from Cloudflare; we pass it to
// Supabase Auth, which verifies it with Cloudflare before doing anything.
//
// It only shows up when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. Without it every form works as
// before, so the code can ship first and the check be switched on afterwards (SETUP.md,
// "Bot protection").

import { useCallback, useEffect, useRef, useState } from 'react'

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''
export const captchaEnabled = TURNSTILE_SITE_KEY !== ''

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => {
        scriptPromise = null // let the next attempt try again
        reject(new Error('Could not load the security check'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

type Props = {
  onToken: (token: string | null) => void
  // Change this number to get a fresh token (see useCaptcha)
  resetSignal?: number
  // 'interaction-only' shows nothing unless Cloudflare needs the person to do something
  appearance?: 'always' | 'interaction-only'
}

export function Turnstile({ onToken, resetSignal = 0, appearance = 'always' }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    onTokenRef.current = onToken
  })

  // A new token is needed after every attempt, because each one works only once
  useEffect(() => {
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current)
  }, [resetSignal])

  useEffect(() => {
    if (!captchaEnabled) return
    let cancelled = false

    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return
        widgetId.current = window.turnstile.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          size: 'flexible',
          appearance,
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
      onTokenRef.current(null)
    }
  }, [appearance])

  if (!captchaEnabled) return null

  return (
    <div className="mt-4">
      <div ref={box} />
      {failed && (
        <p className="text-sm text-amber-300 text-center">
          The security check could not load. Turn off any ad blocker for this site, or try another browser, then reload the page.
        </p>
      )}
    </div>
  )
}

// Keeps the token for one form. Tokens work once, so call reset() after every attempt
// (successful or not) to get a fresh one.
export function useCaptcha() {
  const [token, setToken] = useState<string | null>(null)
  const [resetSignal, setResetSignal] = useState(0)

  const reset = useCallback(() => {
    setToken(null)
    setResetSignal((n) => n + 1)
  }, [])

  return {
    enabled: captchaEnabled,
    token,
    setToken,
    resetSignal,
    reset,
    // What to give Supabase Auth: undefined when the check is switched off
    authToken: token ?? undefined,
  }
}
