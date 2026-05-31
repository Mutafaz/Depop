'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

export default function Sales() {
  const { user } = useAuth()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterMonth, setFilterMonth] = useState('All')
  const [filterYear, setFilterYear] = useState('All')
  const [filterPlatform, setFilterPlatform] = useState('All')

  // Form State
  const [itemName, setItemName] = useState('')
  const [itemCost, setItemCost] = useState('4.00')
  const [platform, setPlatform] = useState('Depop')
  const [salePrice, setSalePrice] = useState('')
  const [shippingCost, setShippingCost] = useState('')
  const [platformFees, setPlatformFees] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 7))
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    async function loadData() {
      if (!user) return
      
      const [salesRes, settingsRes] = await Promise.all([
        supabase.from('sales').select('*, inventory(item_name, cost_price)').eq('user_id', user.id).order('sale_date', { ascending: false }),
        supabase.from('user_settings').select('default_item_cost').eq('user_id', user.id).single()
      ])

      if (salesRes.data) setSales(salesRes.data)
      if (settingsRes.data?.default_item_cost) {
        setItemCost(settingsRes.data.default_item_cost)
      }
      setLoading(false)
    }
    loadData()
  }, [user])

  const resetForm = () => {
    setEditingId(null)
    setSalePrice('')
    setShippingCost('')
    setPlatformFees('')
    setItemName('')
  }

  const handleAddSale = async (e) => {
    e.preventDefault()

    if (editingId) {
      const saleToEdit = sales.find(s => s.id === editingId)
      const cost = saleToEdit.inventory?.cost_price || 0
      
      const price = parseFloat(salePrice) || 0
      const shipping = parseFloat(shippingCost) || 0
      const fees = parseFloat(platformFees) || 0
      const netProfit = price - shipping - fees - cost

      const { data, error } = await supabase.from('sales').update({
        platform,
        sale_price: price,
        shipping_cost: shipping,
        platform_fees: fees,
        net_profit: netProfit,
        sale_date: saleDate + '-01'
      }).eq('id', editingId).select('*, inventory(item_name, cost_price)')

      if (data) {
        setSales(sales.map(s => s.id === editingId ? data[0] : s))
        resetForm()
      }
      return
    }

    const finalItemCost = parseFloat(itemCost) || 0
    
    // Silent Inventory creation
    const { data: newItem, error: invError } = await supabase.from('inventory').insert([{
      user_id: user.id,
      item_name: itemName,
      category: 'Quick Sale',
      date_sourced: saleDate + '-01',
      cost_price: finalItemCost,
      status: 'Sold'
    }]).select().single()

    if (invError || !newItem) return
    const finalInventoryId = newItem.id

    const price = parseFloat(salePrice) || 0
    const shipping = parseFloat(shippingCost) || 0
    const fees = parseFloat(platformFees) || 0
    const netProfit = price - shipping - fees - finalItemCost

    const { data, error } = await supabase.from('sales').insert([{
      user_id: user.id,
      inventory_id: finalInventoryId,
      platform,
      sale_price: price,
      shipping_cost: shipping,
      platform_fees: fees,
      net_profit: netProfit,
      sale_date: saleDate + '-01'
    }]).select('*, inventory(item_name, cost_price)')

    if (data) {
      setSales([data[0], ...sales])
      resetForm()
    }
  }

  const handleEdit = (sale) => {
    setEditingId(sale.id)
    setPlatform(sale.platform)
    setSalePrice(sale.sale_price)
    setShippingCost(sale.shipping_cost)
    setPlatformFees(sale.platform_fees)
    setSaleDate(sale.sale_date ? sale.sale_date.slice(0, 7) : new Date().toISOString().slice(0, 7))
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this sale?')) return
    const { error } = await supabase.from('sales').delete().eq('id', id)
    if (!error) {
      setSales(sales.filter(s => s.id !== id))
    }
  }

  const editingSaleInfo = editingId ? sales.find(s => s.id === editingId) : null

  // Apply Filters
  const filteredSales = sales.filter(s => {
    const d = new Date(s.sale_date);
    const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const y = d.getUTCFullYear().toString();
    const monthMatch = filterMonth === 'All' || m === filterMonth;
    const yearMatch = filterYear === 'All' || y === filterYear;
    const platMatch = filterPlatform === 'All' || s.platform.toLowerCase() === filterPlatform.toLowerCase();
    return monthMatch && yearMatch && platMatch;
  });

  // Extract unique years and platforms for filter dropdowns
  const availableYears = [...new Set(sales.map(s => new Date(s.sale_date).getUTCFullYear().toString()))].sort().reverse();
  const availablePlatforms = [...new Set(sales.map(s => s.platform))].sort();

  return (
    <div>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Sales Log</h1>
        </div>
        
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

      <div className="split-layout">
        <div className="glass-panel table-container" style={{ padding: 0, alignSelf: 'start' }}>
          {loading ? (
            <div style={{ padding: '24px' }}>Loading...</div>
          ) : filteredSales.length === 0 ? (
            <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>No sales match your filters.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Platform</th>
                  <th>Sale Price</th>
                  <th>Net Profit</th>
                  <th style={{ width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => (
                  <tr key={sale.id}>
                    <td>{new Date(sale.sale_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</td>
                    <td>{sale.inventory?.item_name || 'Unknown Item'}</td>
                    <td>{sale.platform}</td>
                    <td>${Number(sale.sale_price).toFixed(2)}</td>
                    <td style={{ color: sale.net_profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>
                      {sale.net_profit >= 0 ? '+' : '-'}${Math.abs(sale.net_profit).toFixed(2)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEdit(sale)} className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => handleDelete(sale.id)} className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)', cursor: 'pointer' }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="glass-panel" style={{ alignSelf: 'start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>{editingId ? 'Edit Sale' : 'Record a Sale'}</h3>
            {editingId && <button type="button" onClick={resetForm} className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>}
          </div>

          <form onSubmit={handleAddSale} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {editingId ? (
              <div className="input-group">
                <label>Item</label>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                  {editingSaleInfo?.inventory?.item_name || 'Unknown Item'}
                </div>
              </div>
            ) : (
              <>
                <div className="input-group">
                  <label>Item Name</label>
                  <input type="text" required value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Vintage Nike Hoodie" />
                </div>
                <div className="input-group">
                  <label>Item Cost ($)</label>
                  <input type="number" step="0.01" required value={itemCost} onChange={e => setItemCost(e.target.value)} />
                </div>
              </>
            )}

            <div className="input-group">
              <label>Platform</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)}>
                <option>Depop</option>
                <option>Whatnot</option>
                <option>Poshmark</option>
                <option>eBay</option>
                <option>Vinted</option>
                <option>Other</option>
              </select>
            </div>
            <div className="input-group">
              <label>Sale Month</label>
              <input type="month" required value={saleDate} onChange={e => setSaleDate(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Sale Price ($)</label>
              <input type="number" step="0.01" required value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="0.00" />
            </div>
            <div className="input-group">
              <label>Shipping Cost ($)</label>
              <input type="number" step="0.01" value={shippingCost} onChange={e => setShippingCost(e.target.value)} placeholder="0.00" />
            </div>
            <div className="input-group">
              <label>Platform Fees ($)</label>
              <input type="number" step="0.01" value={platformFees} onChange={e => setPlatformFees(e.target.value)} placeholder="0.00" />
            </div>
            <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }}>
              {editingId ? 'Update Sale' : 'Save Sale'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
