'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore'
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
      
      try {
        // Fetch User Settings
        const docRef = doc(db, 'users', user.id)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists() && docSnap.data().default_item_cost !== undefined) {
          setItemCost(docSnap.data().default_item_cost.toString())
        }

        // Fetch Sales
        const q = query(collection(db, 'sales'), where('userId', '==', user.id))
        const querySnapshot = await getDocs(q)
        
        let fetchedSales = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        // Sort descending by date locally (since orderBy requires composite indexes if combined with where)
        fetchedSales.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
        
        setSales(fetchedSales)
      } catch (err) {
        console.error('Error loading data:', err)
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

    const price = parseFloat(salePrice) || 0
    const shipping = parseFloat(shippingCost) || 0
    const fees = parseFloat(platformFees) || 0

    if (editingId) {
      const saleToEdit = sales.find(s => s.id === editingId)
      const cost = saleToEdit.itemCost || 0
      const netProfit = price - shipping - fees - cost

      const saleRef = doc(db, 'sales', editingId)
      const updatedData = {
        platform,
        salePrice: price,
        shippingCost: shipping,
        platformFees: fees,
        netProfit: netProfit,
        saleDate: saleDate + '-01'
      }

      await updateDoc(saleRef, updatedData)
      setSales(sales.map(s => s.id === editingId ? { ...s, ...updatedData } : s))
      resetForm()
      return
    }

    const finalItemCost = parseFloat(itemCost) || 0
    const netProfit = price - shipping - fees - finalItemCost

    const newSale = {
      userId: user.id,
      itemName,
      itemCost: finalItemCost,
      platform,
      salePrice: price,
      shippingCost: shipping,
      platformFees: fees,
      netProfit: netProfit,
      saleDate: saleDate + '-01'
    }

    const docRef = await addDoc(collection(db, 'sales'), newSale)
    setSales([{ id: docRef.id, ...newSale }, ...sales])
    resetForm()
  }

  const handleEdit = (sale) => {
    setEditingId(sale.id)
    setPlatform(sale.platform)
    setSalePrice(sale.salePrice.toString())
    setShippingCost(sale.shippingCost.toString())
    setPlatformFees(sale.platformFees.toString())
    setSaleDate(sale.saleDate ? sale.saleDate.slice(0, 7) : new Date().toISOString().slice(0, 7))
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this sale?')) return
    await deleteDoc(doc(db, 'sales', id))
    setSales(sales.filter(s => s.id !== id))
  }

  const editingSaleInfo = editingId ? sales.find(s => s.id === editingId) : null

  // Apply Filters
  const filteredSales = sales.filter(s => {
    const d = new Date(s.saleDate);
    const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const y = d.getUTCFullYear().toString();
    const monthMatch = filterMonth === 'All' || m === filterMonth;
    const yearMatch = filterYear === 'All' || y === filterYear;
    const platMatch = filterPlatform === 'All' || s.platform.toLowerCase() === filterPlatform.toLowerCase();
    return monthMatch && yearMatch && platMatch;
  });

  // Extract unique years and platforms for filter dropdowns
  const availableYears = [...new Set(sales.map(s => new Date(s.saleDate).getUTCFullYear().toString()))].sort().reverse();
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
                    <td>{new Date(sale.saleDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</td>
                    <td>{sale.itemName || 'Unknown Item'}</td>
                    <td>{sale.platform}</td>
                    <td>${Number(sale.salePrice).toFixed(2)}</td>
                    <td style={{ color: sale.netProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>
                      {sale.netProfit >= 0 ? '+' : '-'}${Math.abs(sale.netProfit).toFixed(2)}
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
                  {editingSaleInfo?.itemName || 'Unknown Item'}
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
