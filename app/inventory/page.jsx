'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

export default function Inventory() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  // Form State
  const [itemName, setItemName] = useState('')
  const [category, setCategory] = useState('Clothing')
  const [dateSourced, setDateSourced] = useState(new Date().toISOString().split('T')[0])
  const [costPrice, setCostPrice] = useState('4.00')
  const [status, setStatus] = useState('Listed')

  useEffect(() => {
    async function loadData() {
      if (!user) return
      
      const { data: settings } = await supabase
        .from('user_settings')
        .select('default_item_cost')
        .eq('user_id', user.id)
        .single()
        
      if (settings?.default_item_cost) {
        setCostPrice(settings.default_item_cost)
      }

      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        
      if (inventory) setItems(inventory)
      setLoading(false)
    }
    loadData()
  }, [user])

  const resetForm = () => {
    setItemName('')
    setEditingId(null)
    setStatus('Listed')
    setShowForm(false)
    setErrorMsg(null)
  }

  const handleSaveItem = async (e) => {
    e.preventDefault()
    setErrorMsg(null)

    const itemData = {
      user_id: user.id,
      item_name: itemName,
      category,
      date_sourced: dateSourced,
      cost_price: parseFloat(costPrice),
      status
    }

    if (editingId) {
      const { data, error } = await supabase.from('inventory').update(itemData).eq('id', editingId).select()
      if (data) {
        setItems(items.map(i => i.id === editingId ? data[0] : i))
        resetForm()
      } else if (error) {
        setErrorMsg(error.message)
      }
    } else {
      const { data, error } = await supabase.from('inventory').insert([itemData]).select()
      if (data) {
        setItems([data[0], ...items])
        resetForm()
      } else if (error) {
        setErrorMsg(error.message)
      }
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setItemName(item.item_name)
    setCategory(item.category)
    setDateSourced(item.date_sourced)
    setCostPrice(item.cost_price)
    setStatus(item.status)
    setShowForm(true)
    setErrorMsg(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    setErrorMsg(null)
    const { error } = await supabase.from('inventory').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') { // Foreign key constraint
        setErrorMsg("Cannot delete this item because it is linked to a Sale. Delete the sale first.")
      } else {
        setErrorMsg(error.message)
      }
    } else {
      setItems(items.filter(i => i.id !== id))
    }
  }

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1>Inventory</h1>
        <button className="btn" onClick={() => {
          if (showForm) {
            resetForm()
          } else {
            setShowForm(true)
            setDateSourced(new Date().toISOString().split('T')[0])
          }
        }}>
          {showForm ? 'Cancel' : '+ Add Item'}
        </button>
      </header>

      {errorMsg && (
        <div style={{ color: 'var(--danger)', marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>
          {errorMsg}
        </div>
      )}

      {showForm && (
        <div className="glass-panel" style={{ marginBottom: '32px' }}>
          <h3>{editingId ? 'Edit Item' : 'Add New Item'}</h3>
          <form onSubmit={handleSaveItem} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div className="input-group">
              <label>Item Name</label>
              <input type="text" required value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Vintage Nike Hoodie" />
            </div>
            <div className="input-group">
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option>Clothing</option>
                <option>Shoes</option>
                <option>Accessories</option>
                <option>Quick Sale</option>
                <option>Other</option>
              </select>
            </div>
            <div className="input-group">
              <label>Date Sourced</label>
              <input type="date" required value={dateSourced} onChange={e => setDateSourced(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Cost Price ($)</label>
              <input type="number" step="0.01" required value={costPrice} onChange={e => setCostPrice(e.target.value)} />
            </div>
            
            {editingId && (
              <div className="input-group">
                <label>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}>
                  <option>Listed</option>
                  <option>Sold</option>
                  <option>Delisted</option>
                </select>
              </div>
            )}

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn">{editingId ? 'Update Item' : 'Save Item'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px' }}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>No items found. Add your first item!</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Date Sourced</th>
                <th>Cost Price</th>
                <th>Status</th>
                <th style={{ width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.item_name}</td>
                  <td>{item.category}</td>
                  <td>{new Date(item.date_sourced).toLocaleDateString()}</td>
                  <td>${Number(item.cost_price).toFixed(2)}</td>
                  <td>
                    <span style={{ 
                      background: item.status === 'Listed' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)', 
                      color: item.status === 'Listed' ? 'var(--warning)' : 'var(--success)', 
                      padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem' 
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEdit(item)} className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)', cursor: 'pointer' }}>Delete</button>
                    </div>
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
