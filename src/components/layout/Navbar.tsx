'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const pathname = usePathname()
  const [supabase] = useState(() => createClient())

  // Re-check on navigation so a new profile photo shows up after saving settings
  useEffect(() => {
    const loadPhoto = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('profile_photo_url').eq('id', userId).single()
      setPhotoUrl(data?.profile_photo_url ?? null)
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) loadPhoto(user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setPhotoUrl(null)
    })

    return () => subscription.unsubscribe()
  }, [supabase, pathname])

  // Close the mobile menu when tapping outside the navbar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navLinks = [
    { name: 'Home', href: '/', exact: true },
    { name: 'Browse', href: '/listings', exact: true },
    { name: 'Sell', href: '/listings/create', exact: true },
    { name: 'Chat', href: '/chat', exact: false },
  ]

  const isActiveLink = (link: { href: string; exact: boolean }) => {
    if (link.exact) {
      return pathname === link.href || pathname === link.href + '/'
    }
    return pathname.startsWith(link.href)
  }

  const onProfile = pathname === '/profile' || pathname.startsWith('/profile/settings')
  const initial = user?.email?.charAt(0).toUpperCase() || 'U'

  const avatar = (
    <span
      className={`h-8 w-8 shrink-0 overflow-hidden rounded-full bg-emerald-500/20 text-sm text-emerald-400 flex items-center justify-center border ${
        onProfile ? 'border-emerald-400' : 'border-emerald-500/50'
      }`}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  )

  return (
    <nav ref={navRef} className="sticky top-0 z-50 bg-slate-950 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <span className="text-lg font-semibold text-white tracking-tight">GoodsMandi</span>
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActiveLink(link)
                        ? 'bg-white/10 text-white'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center ml-6">
            {user ? (
              <Link
                href="/profile"
                aria-label="Your profile"
                title="Your profile"
                className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                {avatar}
              </Link>
            ) : (
              <div className="flex space-x-4">
                <Link href="/login" className="btn-ghost px-4 py-2 text-sm">
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary px-4 py-2 text-sm">
                  Sign up
                </Link>
              </div>
            )}
          </div>

          <div className="-mr-2 flex items-center gap-1 md:hidden">
            {user && (
              <Link href="/profile" aria-label="Your profile" className="p-1.5" onClick={() => setMobileMenuOpen(false)}>
                {avatar}
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-t border-slate-800">
          <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-md px-3 py-2 text-base font-medium ${
                  isActiveLink(link)
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
          {!user && (
            <div className="border-t border-white/10 pb-3 pt-4 px-5 flex flex-col space-y-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="btn-secondary w-full text-center">
                Log in
              </Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="btn-primary w-full text-center">
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
