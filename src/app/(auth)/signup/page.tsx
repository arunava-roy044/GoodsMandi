'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('1')
  const [branchCourse, setBranchCourse] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.endsWith('@stu.upes.ac.in')) {
      showToast('Registration is restricted to UPES students (@stu.upes.ac.in)', 'error')
      return
    }
    
    if (!acceptedTerms) {
      showToast('You must accept the terms of service', 'error')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            year_of_study: parseInt(yearOfStudy),
            branch_course: branchCourse,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) {
        showToast(error.message, 'error')
      } else {
        setSuccess(true)
        showToast('Registration successful! Check your email to verify.', 'success')
      }
    } catch (err: any) {
      showToast('An unexpected error occurred.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="glass-card p-8 rounded-2xl w-full text-center">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">Check your email</h2>
        <p className="text-slate-400 mb-6">
          We've sent a verification link to <span className="text-white font-medium">{email}</span>.
        </p>
        <Link href="/login" className="btn-secondary w-full py-2.5 inline-block">
          Return to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="glass-card p-8 rounded-2xl w-full">
      <h2 className="text-2xl font-semibold text-white mb-6">Create an account</h2>
      
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field w-full"
            placeholder="John Doe"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">College Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field w-full"
            placeholder="you@stu.upes.ac.in"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field w-full"
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Year of Study</label>
            <select
              value={yearOfStudy}
              onChange={(e) => setYearOfStudy(e.target.value)}
              className="input-field w-full appearance-none bg-surface-900 bg-slate-900 text-slate-200 border-white/10"
              required
            >
              {[1, 2, 3, 4, 5].map(year => (
                <option key={year} value={year} className="bg-slate-900 text-slate-200">Year {year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Branch/Course</label>
            <input
              type="text"
              value={branchCourse}
              onChange={(e) => setBranchCourse(e.target.value)}
              className="input-field w-full"
              placeholder="e.g. B.Tech CSE"
            />
          </div>
        </div>

        <div className="flex items-start mt-2">
          <input
            type="checkbox"
            id="terms"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 mr-2 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
          />
          <label htmlFor="terms" className="text-sm text-slate-400">
            I agree to the <Link href="/terms" className="text-emerald-400 hover:underline">Terms of Service</Link> and certify I am a student.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5 flex justify-center items-center mt-4"
        >
          {loading ? <Spinner size="sm" /> : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Log in
        </Link>
      </div>
    </div>
  )
}
