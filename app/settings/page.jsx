'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuth } from '@/components/AuthProvider'

export default function Settings() {
  const { user } = useAuth()
  const [defaultCost, setDefaultCost] = useState('4.00')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    async function loadSettings() {
      if (!user) return
      
      const docRef = doc(db, 'users', user.id)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists() && docSnap.data().default_item_cost !== undefined) {
        setDefaultCost(docSnap.data().default_item_cost.toString())
      }
      setLoading(false)
    }
    loadSettings()
  }, [user])

  const saveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const docRef = doc(db, 'users', user.id)
      await setDoc(docRef, { 
        default_item_cost: parseFloat(defaultCost) 
      }, { merge: true })
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Failed to save settings.' })
    }
    
    setSaving(false)
  }

  if (loading) return <div>Loading settings...</div>

  return (
    <div>
      <header style={{ marginBottom: '32px' }}>
        <h1>Settings</h1>
      </header>
      
      <div className="glass-panel" style={{ maxWidth: '500px' }}>
        <h3>Inventory Defaults</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Set your default values to speed up data entry.
        </p>

        {message && (
          <div style={{ color: message.type === 'error' ? 'var(--danger)' : 'var(--success)', marginBottom: '16px', fontSize: '0.9rem' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={saveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label>Default Cost Per Item ($)</label>
            <input 
              type="number" 
              step="0.01" 
              value={defaultCost} 
              onChange={(e) => setDefaultCost(e.target.value)} 
              required
            />
          </div>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  )
}
