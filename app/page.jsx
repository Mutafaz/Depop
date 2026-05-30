'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({ revenue: 0, profit: 0, expenses: 0, activeInventory: 0 })
  const [recentSales, setRecentSales] = useState([])

  useEffect(() => {
    async function loadData() {
      if (!user) return

      const [salesRes, invRes, expRes] = await Promise.all([
        supabase.from('sales').select('sale_price, net_profit, sale_date, platform, inventory(item_name)').eq('user_id', user.id).order('sale_date', { ascending: false }),
        supabase.from('inventory').select('id').eq('user_id', user.id).neq('status', 'Sold'),
        supabase.from('expenses').select('amount').eq('user_id', user.id)
      ])

      const sales = salesRes.data || []
      const revenue = sales.reduce((acc, sale) => acc + Number(sale.sale_price), 0)
      const profit = sales.reduce((acc, sale) => acc + Number(sale.net_profit), 0)
      const expenses = (expRes.data || []).reduce((acc, exp) => acc + Number(exp.amount), 0)
      const activeInventory = (invRes.data || []).length

      setMetrics({ revenue, profit, expenses, activeInventory })
      setRecentSales(sales.slice(0, 5)) // top 5 recent
      setLoading(false)
    }
    loadData()
  }, [user])

  if (loading) return <div style={{ padding: '32px' }}>Loading Dashboard...</div>

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1>Overview</h1>
        <a href="/sales" className="btn">+ Add Sale</a>
      </header>

      <div className="dashboard-grid">
        <div className="glass-panel">
          <div className="metric-label">Total Revenue</div>
          <div className="metric-value">${metrics.revenue.toFixed(2)}</div>
          <div style={{ color: 'var(--success)', fontSize: '0.9rem' }}>Lifetime</div>
        </div>
        
        <div className="glass-panel">
          <div className="metric-label">Net Profit</div>
          <div className="metric-value">${metrics.profit.toFixed(2)}</div>
          <div style={{ color: 'var(--success)', fontSize: '0.9rem' }}>Lifetime</div>
        </div>

        <div className="glass-panel">
          <div className="metric-label">Active Inventory</div>
          <div className="metric-value">{metrics.activeInventory}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>items listed</div>
        </div>
        
        <div className="glass-panel">
          <div className="metric-label">Total Expenses</div>
          <div className="metric-value" style={{ background: 'linear-gradient(to right, #f43f5e, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ${metrics.expenses.toFixed(2)}
          </div>
          <div style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>Lifetime</div>
        </div>
      </div>

      <h2>Recent Sales</h2>
      <div className="glass-panel table-container" style={{ padding: 0 }}>
        {recentSales.length === 0 ? (
          <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>No recent sales.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Platform</th>
                <th>Sale Price</th>
                <th>Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale, i) => (
                <tr key={i}>
                  <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                  <td>{sale.inventory?.item_name || 'Unknown Item'}</td>
                  <td>{sale.platform}</td>
                  <td>${Number(sale.sale_price).toFixed(2)}</td>
                  <td style={{ color: sale.net_profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>
                    {sale.net_profit >= 0 ? '+' : '-'}${Math.abs(sale.net_profit).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
