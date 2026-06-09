'use client'
import { useState } from 'react'
import { auth } from '@/lib/firebase'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(null)
    
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      router.push('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-color)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '24px' }}>Create Account</h1>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} minLength={6} />
          </div>
          <button type="submit" className="btn" style={{ justifyContent: 'center', marginTop: '8px' }}>Sign Up</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-secondary)' }}>
          Already have an account? <a href="/login" style={{ color: 'var(--accent-color)' }}>Log in</a>
        </p>
      </div>
    </div>
  )
}
