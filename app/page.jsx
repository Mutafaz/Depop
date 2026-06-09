'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useAuth } from '@/components/AuthProvider'

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])

  // Filters
  const [filterMonth, setFilterMonth] = useState('All')
  const [filterYear, setFilterYear] = useState('All')
  const [filterPlatform, setFilterPlatform] = useState('All')

  useEffect(() => {
    async function loadDashboard() {
      if (!user) return
      
      try {
        const salesQ = query(collection(db, 'sales'), where('userId', '==', user.id))
        const expensesQ = query(collection(db, 'expenses'), where('userId', '==', user.id))
        
        const [salesSnap, expensesSnap] = await Promise.all([
          getDocs(salesQ),
          getDocs(expensesQ)
        ])

        let fetchedSales = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        let fetchedExpenses = expensesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        fetchedSales.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
        
        setSales(fetchedSales)
        setExpenses(fetchedExpenses)
      } catch (err) {
        console.error('Error loading dashboard:', err)
      }
      
      setLoading(false)
    }

    if (!authLoading) {
      loadDashboard()
    }
  }, [user, authLoading])

  // Filter Sales
  const filteredSales = sales.filter(s => {
    const d = new Date(s.saleDate);
    const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const y = d.getUTCFullYear().toString();
    const monthMatch = filterMonth === 'All' || m === filterMonth;
    const yearMatch = filterYear === 'All' || y === filterYear;
    const platMatch = filterPlatform === 'All' || s.platform.toLowerCase() === filterPlatform.toLowerCase();
    return monthMatch && yearMatch && platMatch;
  });

  // Filter Expenses (Ignore platform filter for general business expenses)
  const filteredExpenses = expenses.filter(exp => {
    const d = new Date(exp.expenseDate);
    const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const y = d.getUTCFullYear().toString();
    const monthMatch = filterMonth === 'All' || m === filterMonth;
    const yearMatch = filterYear === 'All' || y === filterYear;
    return monthMatch && yearMatch;
  });

  const totalRevenue = filteredSales.reduce((acc, sale) => acc + Number(sale.salePrice), 0)
  const totalProfit = filteredSales.reduce((acc, sale) => acc + Number(sale.netProfit), 0)
  const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + Number(exp.amount), 0)
  
  // Real Net Profit = Profit from sales - Business Expenses
  const trueNetProfit = totalProfit - totalExpenses

  const availableYears = [...new Set([
    ...sales.map(s => new Date(s.saleDate).getUTCFullYear().toString()),
    ...expenses.map(e => new Date(e.expenseDate).getUTCFullYear().toString())
  ])].sort().reverse();
  const availablePlatforms = [...new Set(sales.map(s => s.platform))].sort();

  if (authLoading || loading) return <div style={{ padding: '32px' }}>Loading dashboard...</div>

  return (
    <div>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        <h1>Dashboard</h1>
        
        {/* Filter Bar */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Month:</label>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ padding: '8px' }}>
              <option value="All">All</option>
              <option value="01">Jan</option><option value="02">Feb</option><option value="03">Mar</option>
              <option value="04">Apr</option><option value="05">May</option><option value="06">Jun</option>
              <option value="07">Jul</option><option value="08">Aug</option><option value="09">Sep</option>
              <option value="10">Oct</option><option value="11">Nov</option><option value="12">Dec</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Year:</label>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ padding: '8px' }}>
              <option value="All">All</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Platform:</label>
            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} style={{ padding: '8px' }}>
              <option value="All">All</option>
              {availablePlatforms.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="glass-panel">
          <div className="metric-label">Total Revenue</div>
          <div className="metric-value">${totalRevenue.toFixed(2)}</div>
        </div>
        <div className="glass-panel">
          <div className="metric-label">Sales Profit</div>
          <div className="metric-value">${totalProfit.toFixed(2)}</div>
        </div>
        <div className="glass-panel">
          <div className="metric-label">Expenses</div>
          <div className="metric-value" style={{ background: 'var(--danger)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ${totalExpenses.toFixed(2)}
          </div>
        </div>
        <div className="glass-panel" style={{ border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div className="metric-label">True Net Profit</div>
          <div className="metric-value" style={{ background: trueNetProfit >= 0 ? 'var(--success)' : 'var(--danger)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {trueNetProfit >= 0 ? '+' : '-'}${Math.abs(trueNetProfit).toFixed(2)}
          </div>
        </div>
      </div>

      <h2>Recent Sales</h2>
      <div className="glass-panel table-container" style={{ padding: 0 }}>
        {filteredSales.length === 0 ? (
          <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>No sales match your filters.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Platform</th>
                <th>Sale Price</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.slice(0, 10).map(sale => (
                <tr key={sale.id}>
                  <td>{new Date(sale.saleDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</td>
                  <td>{sale.itemName || 'Unknown Item'}</td>
                  <td>{sale.platform}</td>
                  <td>${Number(sale.salePrice).toFixed(2)}</td>
                  <td style={{ color: sale.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {sale.netProfit >= 0 ? '+' : '-'}${Math.abs(sale.netProfit).toFixed(2)}
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
