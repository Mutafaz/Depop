'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

export default function Sales() {
  const { user } = useAuth()
  const [sales, setSales] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)

  // Form State
  const [saleMode, setSaleMode] = useState('existing') // 'existing' | 'quick'
  const [selectedItemId, setSelectedItemId] = useState('')
  const [quickItemName, setQuickItemName] = useState('')
  const [quickItemCost, setQuickItemCost] = useState('4.00')
  
  const [platform, setPlatform] = useState('Depop')
  const [salePrice, setSalePrice] = useState('')
  const [shippingCost, setShippingCost] = useState('')
  const [platformFees, setPlatformFees] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    async function loadData() {
      if (!user) return
      
      const [salesRes, invRes, settingsRes] = await Promise.all([
        supabase.from('sales').select('*, inventory(item_name, cost_price)').eq('user_id', user.id).order('sale_date', { ascending: false }),
        supabase.from('inventory').select('*').eq('user_id', user.id).neq('status', 'Sold'),
        supabase.from('user_settings').select('default_item_cost').eq('user_id', user.id).single()
      ])

      if (salesRes.data) setSales(salesRes.data)
      if (invRes.data) {
        setInventory(invRes.data)
        if (invRes.data.length > 0) setSelectedItemId(invRes.data[0].id)
      }
      if (settingsRes.data?.default_item_cost) {
        setQuickItemCost(settingsRes.data.default_item_cost)
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
    setQuickItemName('')
    if (inventory.length > 0) setSelectedItemId(inventory[0].id)
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
        sale_date: saleDate
      }).eq('id', editingId).select('*, inventory(item_name, cost_price)')

      if (data) {
        setSales(sales.map(s => s.id === editingId ? data[0] : s))
        resetForm()
      }
      return
    }

    let finalInventoryId = null
    let finalItemCost = 0

    if (saleMode === 'existing') {
      const item = inventory.find(i => i.id === selectedItemId)
      if (!item) return
      finalInventoryId = item.id
      finalItemCost = item.cost_price
    } else {
      // Quick Sale
      finalItemCost = parseFloat(quickItemCost) || 0
      const { data: newItem, error: invError } = await supabase.from('inventory').insert([{
        user_id: user.id,
        item_name: quickItemName,
        category: 'Quick Sale',
        date_sourced: saleDate,
        cost_price: finalItemCost,
        status: 'Sold'
      }]).select().single()

      if (invError || !newItem) return
      finalInventoryId = newItem.id
    }

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
      sale_date: saleDate
    }]).select('*, inventory(item_name, cost_price)')

    if (data) {
      if (saleMode === 'existing') {
        await supabase.from('inventory').update({ status: 'Sold' }).eq('id', finalInventoryId)
        setInventory(inventory.filter(i => i.id !== finalInventoryId))
      }
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
    setSaleDate(sale.sale_date)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this sale? The linked item will be returned to your active inventory.')) return
    const saleToDelete = sales.find(s => s.id === id)
    
    const { error } = await supabase.from('sales').delete().eq('id', id)
    if (!error) {
      setSales(sales.filter(s => s.id !== id))
      // Revert inventory status
      if (saleToDelete?.inventory_id) {
        await supabase.from('inventory').update({ status: 'Listed' }).eq('id', saleToDelete.inventory_id)
        // Note: It won't instantly appear in the inventory dropdown unless we refetch, which is fine, user can refresh.
      }
    }
  }

  const editingSaleInfo = editingId ? sales.find(s => s.id === editingId) : null

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1>Sales Log</h1>
      </header>

      <div className="split-layout">
        <div className="glass-panel table-container" style={{ padding: 0, alignSelf: 'start' }}>
          {loading ? (
            <div style={{ padding: '24px' }}>Loading...</div>
          ) : sales.length === 0 ? (
            <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>No sales yet. Record your first sale!</div>
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
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
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
            {editingId && <button onClick={resetForm} className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>}
          </div>
          
          {!editingId && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
              <button 
                type="button"
                onClick={() => setSaleMode('existing')}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: saleMode === 'existing' ? 'var(--accent-color)' : 'transparent', color: 'white', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                From Inventory
              </button>
              <button 
                type="button"
                onClick={() => setSaleMode('quick')}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: saleMode === 'quick' ? 'var(--accent-color)' : 'transparent', color: 'white', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Quick Sale
              </button>
            </div>
          )}

          <form onSubmit={handleAddSale} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {editingId ? (
              <div className="input-group">
                <label>Item</label>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                  {editingSaleInfo?.inventory?.item_name || 'Unknown Item'}
                </div>
              </div>
            ) : saleMode === 'existing' ? (
              <div className="input-group">
                <label>Select Item</label>
                <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} required>
                  <option value="" disabled>-- Select Item --</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>{item.item_name} (Cost: ${Number(item.cost_price).toFixed(2)})</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="input-group">
                  <label>Item Name</label>
                  <input type="text" required value={quickItemName} onChange={e => setQuickItemName(e.target.value)} placeholder="e.g. Vintage Nike Hoodie" />
                </div>
                <div className="input-group">
                  <label>Item Cost ($)</label>
                  <input type="number" step="0.01" required value={quickItemCost} onChange={e => setQuickItemCost(e.target.value)} />
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
              <label>Sale Date</label>
              <input type="date" required value={saleDate} onChange={e => setSaleDate(e.target.value)} />
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
            <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={!editingId && saleMode === 'existing' && !selectedItemId}>
              {editingId ? 'Update Sale' : 'Save Sale'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
