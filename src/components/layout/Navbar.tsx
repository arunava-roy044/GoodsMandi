'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
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

  // Unread notifications: counted on each page change, and live while the tab is open
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    const loadUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
      setUnread(count ?? 0)
    }
    loadUnread()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => loadUnread()
      )
      .subscribe()
    window.addEventListener('notifications-read', loadUnread)
    return () => {
      window.removeEventListener('notifications-read', loadUnread)
      supabase.removeChannel(channel)
    }
  }, [supabase, userId, pathname])

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

  // On your own profile the avatar is redundant, so the corner icon becomes Settings
  const onProfile = pathname === '/profile' || pathname.startsWith('/profile/settings')
  const onSettings = pathname.startsWith('/profile/settings')
  const initial = user?.email?.charAt(0).toUpperCase() || 'U'

  const avatar = (
    <span
      className={`h-8 w-8 shrink-0 overflow-hidden rounded-full bg-emerald-500/20 text-sm text-emerald-400 flex items-center justify-center border border-emerald-500/50`}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  )

  const gear = (
    <span
      className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center border transition-colors ${
        onSettings ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
      }`}
    >
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </span>
  )

  const onNotifications = pathname.startsWith('/notifications')
  const unreadShown = user ? unread : 0
  const bell = (
    <Link
      href="/notifications"
      aria-label={unreadShown > 0 ? `Notifications, ${unreadShown} unread` : 'Notifications'}
      title="Notifications"
      onClick={() => setMobileMenuOpen(false)}
      className={`relative h-8 w-8 shrink-0 rounded-full flex items-center justify-center border transition-colors ${
        onNotifications ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
      }`}
    >
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadShown > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-[18px] text-white text-center">
          {unreadShown > 9 ? '9+' : unreadShown}
        </span>
      )}
    </Link>
  )

  const cornerLink = onProfile
    ? { href: '/profile/settings', label: 'Settings', icon: gear }
    : { href: '/profile', label: 'Your profile', icon: avatar }

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

          <div className="hidden md:flex items-center gap-3 ml-6">
            {user && bell}
            {user ? (
              <Link
                href={cornerLink.href}
                aria-label={cornerLink.label}
                title={cornerLink.label}
                className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                {cornerLink.icon}
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
            {user && <span className="p-1.5">{bell}</span>}
            {user && (
              <Link href={cornerLink.href} aria-label={cornerLink.label} className="p-1.5" onClick={() => setMobileMenuOpen(false)}>
                {cornerLink.icon}
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
