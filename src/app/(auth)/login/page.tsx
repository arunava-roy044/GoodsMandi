'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          showToast('Please confirm your email before logging in. Check your inbox for the verification link.', 'error')
        } else {
          showToast(error.message, 'error')
        }
      } else {
        showToast('Successfully logged in!', 'success')
        router.push('/listings')
        router.refresh()
      }
    } catch (err: any) {
      showToast('An unexpected error occurred.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card p-8 rounded-2xl w-full">
      <h2 className="text-2xl font-semibold text-white mb-6">Welcome back</h2>
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            College Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field w-full"
            placeholder="you@stu.upes.ac.in"
            required
          />
          <p className="text-xs text-slate-500 mt-1">Please use your college email address.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field w-full"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5 flex justify-center items-center"
        >
          {loading ? <Spinner size="sm" /> : 'Log In'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-400">
        Don't have an account?{' '}
        <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Sign up
        </Link>
      </div>
    </div>
  )
}
