'use client'
import { useAuth } from './AuthProvider'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthWrapper({ children }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login')
    } else if (!loading && user && pathname === '/login') {
      router.push('/')
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>Loading...</div>
  }

  if (!user && pathname !== '/login') {
    return null
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (pathname === '/login') {
    return <main>{children}</main>
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div style={{ fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ProfitTracker
        </div>
        <nav className="nav-links">
          <a href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>Dashboard</a>
          <a href="/sales" className={`nav-link ${pathname === '/sales' ? 'active' : ''}`}>Sales</a>
          <a href="/expenses" className={`nav-link ${pathname === '/expenses' ? 'active' : ''}`}>Expenses</a>
          <a href="/settings" className={`nav-link ${pathname === '/settings' ? 'active' : ''}`}>Settings</a>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="btn btn-outline" style={{ width: '100%' }}>Log Out</button>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
