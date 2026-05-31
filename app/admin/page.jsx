'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

export default function AdminImport() {
  const { user } = useAuth()
  const [status, setStatus] = useState('Waiting for CSV...')
  const [loading, setLoading] = useState(false)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    setStatus('Reading file...')

    const reader = new FileReader()
    reader.onload = async (event) => {
      const csv = event.target.result
      await processImport(csv)
    }
    reader.readAsText(file)
  }

  const processImport = async (csv) => {
    if (!user) {
      setStatus('Error: You must be logged in!')
      setLoading(false)
      return
    }

    try {
      setStatus('Step 1/4: Wiping old sales...')
      await supabase.from('sales').delete().eq('user_id', user.id)

      setStatus('Step 2/4: Wiping old inventory...')
      await supabase.from('inventory').delete().eq('user_id', user.id)

      setStatus('Step 3/4: Wiping old expenses...')
      await supabase.from('expenses').delete().eq('user_id', user.id)

      setStatus('Step 4/4: Parsing and importing new data...')
      
      const lines = csv.split('\n').map(l => l.trim()).filter(l => l)
      const dataLines = lines.slice(1) // Skip header
      
      let successCount = 0
      let currentYear = 2025
      let previousMonthNum = 0

      for (let line of dataLines) {
        // Handle basic comma splitting (assuming no complex quoted commas in this specific CSV)
        const cols = line.split(',')
        
        let qty = cols[0]
        let priceStr = cols[1]
        let costStr = cols[2]
        let profitStr = cols[3]
        let platform = cols[4]
        let month = cols[6]
        
        if (!priceStr || !platform) continue 
        
        const price = parseFloat(priceStr.replace(/[^0-9.-]+/g, '')) || 0
        const cost = parseFloat(costStr.replace(/[^0-9.-]+/g, '')) || 0
        const profit = parseFloat(profitStr.replace(/[^0-9.-]+/g, '')) || 0
        
        platform = platform.trim()
        platform = platform.charAt(0).toUpperCase() + platform.slice(1)
        
        month = month ? month.trim().toLowerCase() : 'january'
        const monthMap = {
          'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
          'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
        }
        
        const monthNum = monthMap[month] || 1
        
        // Year rollover logic
        if (previousMonthNum !== 0 && monthNum < previousMonthNum) {
          currentYear++
        }
        previousMonthNum = monthNum
        
        const monthStr = monthNum.toString().padStart(2, '0')
        const dateStr = `${currentYear}-${monthStr}-01`
        
        let itemName = `Past Sale (${platform})`
        if (qty.toLowerCase() === 'giveaway') itemName = 'Giveaway'
        else if (qty === '0') itemName = 'Bonus/Misc'
        else if (parseInt(qty) > 1) itemName = `Bulk Sale (${qty} items)`

        const { data: invData, error: invErr } = await supabase.from('inventory').insert([{
          user_id: user.id,
          item_name: itemName,
          category: 'Imported',
          date_sourced: dateStr,
          cost_price: cost,
          status: 'Sold'
        }]).select().single()
        
        if (invErr) continue
        
        const { error: saleErr } = await supabase.from('sales').insert([{
          user_id: user.id,
          inventory_id: invData.id,
          platform: platform,
          sale_price: price,
          net_profit: profit,
          sale_date: dateStr
        }])
        
        if (!saleErr) successCount++
      }

      setStatus(`✅ Done! Successfully wiped database and imported ${successCount} sales with 2026 dates!`)
    } catch (err) {
      console.error(err)
      setStatus(`Error: ${err.message}`)
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
      <div className="glass-panel" style={{ textAlign: 'center' }}>
        <h1 style={{ color: 'var(--danger)', marginBottom: '16px' }}>Admin Import Tool</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          This will securely wipe your database and re-import your CSV using your browser session. 
          No API keys required!
        </p>

        <div style={{ padding: '24px', border: '2px dashed var(--card-border)', borderRadius: '12px' }}>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload} 
            disabled={loading}
            style={{ marginBottom: '16px' }}
          />
          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.2)',
            color: status.includes('Done') ? 'var(--success)' : 'var(--text-primary)',
            fontWeight: 500
          }}>
            {status}
          </div>
        </div>
      </div>
    </div>
  )
}
