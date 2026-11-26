import { createClient } from '@/lib/supabase/server'
import { publicOrigin } from '@/lib/origin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // Not new URL(request.url).origin: behind nginx that is localhost:3000 (see lib/origin.ts)
  const origin = publicOrigin(request)
  const code = searchParams.get('code')
  // Only allow same-site paths, so `next` can't send users to another host
  const nextParam = searchParams.get('next')
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.startsWith('/\\')
    ? nextParam
    : '/listings'
  const isPasswordReset = next === '/reset-password'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Supabase itself rejected the link (most often it expired or was already used)
  const linkRejected = searchParams.has('error') || searchParams.has('error_code')

  let message: string
  if (isPasswordReset) {
    message = linkRejected
      ? 'This reset link has expired or was already used. Ask for a new one below.'
      : 'Open the reset link in the same browser you asked for it from, or ask for a new one below.'
  } else {
    // The link is checked by Supabase before it reaches us, so when only the last step fails
    // (the link was opened on another device or browser) the email is already confirmed.
    message = linkRejected
      ? 'This link has expired or was already used. Try logging in. If your email is not verified yet, you can send yourself a new link from there.'
      : 'Your email is confirmed. Log in with your email and password.'
  }

  const url = new URL('/login', origin)
  url.searchParams.set(linkRejected || isPasswordReset ? 'error' : 'notice', message)
  return NextResponse.redirect(url)
}
