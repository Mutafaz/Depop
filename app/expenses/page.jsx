'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { useAuth } from '@/components/AuthProvider'

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Filters
  const [filterMonth, setFilterMonth] = useState('All')
  const [filterYear, setFilterYear] = useState('All')

  // Form state
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Shipping Supplies')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    async function loadData() {
      if (!user) return
      try {
        const q = query(collection(db, 'expenses'), where('userId', '==', user.id))
        const querySnapshot = await getDocs(q)
        
        let fetchedExpenses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        fetchedExpenses.sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate))
        
        setExpenses(fetchedExpenses)
      } catch (err) {
        console.error('Error loading expenses:', err)
      }
      setLoading(false)
    }
    loadData()
  }, [user])

  const resetForm = () => {
    setDescription('')
    setAmount('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleSaveExpense = async (e) => {
    e.preventDefault()
    
    const expenseData = {
      userId: user.id,
      description,
      category,
      amount: parseFloat(amount),
      expenseDate: expenseDate + '-01'
    }

    if (editingId) {
      const expenseRef = doc(db, 'expenses', editingId)
      await updateDoc(expenseRef, expenseData)
      setExpenses(expenses.map(exp => exp.id === editingId ? { ...exp, ...expenseData } : exp))
      resetForm()
    } else {
      const docRef = await addDoc(collection(db, 'expenses'), expenseData)
      setExpenses([{ id: docRef.id, ...expenseData }, ...expenses])
      resetForm()
    }
  }

  const handleEdit = (exp) => {
    setEditingId(exp.id)
    setDescription(exp.description)
    setCategory(exp.category)
    setAmount(exp.amount.toString())
    setExpenseDate(exp.expenseDate ? exp.expenseDate.slice(0, 7) : new Date().toISOString().slice(0, 7))
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    await deleteDoc(doc(db, 'expenses', id))
    setExpenses(expenses.filter(exp => exp.id !== id))
  }

  // Apply Filters
  const filteredExpenses = expenses.filter(exp => {
    const d = new Date(exp.expenseDate);
    const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const y = d.getUTCFullYear().toString();
    const monthMatch = filterMonth === 'All' || m === filterMonth;
    const yearMatch = filterYear === 'All' || y === filterYear;
    return monthMatch && yearMatch;
  });

  const availableYears = [...new Set(expenses.map(e => new Date(e.expenseDate).getUTCFullYear().toString()))].sort().reverse();

  return (
    <div>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Business Expenses</h1>
          <button className="btn" onClick={() => {
            if (showForm) {
              resetForm()
            } else {
              setShowForm(true)
              setExpenseDate(new Date().toISOString().slice(0, 7))
            }
          }}>
            {showForm ? 'Cancel' : '+ Add Expense'}
          </button>
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
        </div>
      </header>

      {showForm && (
        <div className="glass-panel" style={{ marginBottom: '32px' }}>
          <h3>{editingId ? 'Edit Expense' : 'Record New Expense'}</h3>
          <form onSubmit={handleSaveExpense} className="form-grid" style={{ marginTop: '16px' }}>
            <div className="input-group">
              <label>Description</label>
              <input type="text" required value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. 100x Polymailers" />
            </div>
            <div className="input-group">
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option>Shipping Supplies</option>
                <option>Office</option>
                <option>Software/Tools</option>
                <option>Other</option>
              </select>
            </div>
            <div className="input-group">
              <label>Expense Month</label>
              <input type="month" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Amount ($)</label>
              <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn">{editingId ? 'Update Expense' : 'Save Expense'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel table-container" style={{ padding: 0 }}>
        {loading ? (
           <div style={{ padding: '24px' }}>Loading...</div>
        ) : filteredExpenses.length === 0 ? (
           <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>No expenses match your filters.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Expense Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th style={{ width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(exp => (
                <tr key={exp.id}>
                  <td>{new Date(exp.expenseDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</td>
                  <td>{exp.description}</td>
                  <td>{exp.category}</td>
                  <td>${Number(exp.amount).toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEdit(exp)} className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleDelete(exp.id)} className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)', cursor: 'pointer' }}>Delete</button>
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
