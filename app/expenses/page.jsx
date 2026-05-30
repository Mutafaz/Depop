'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Form state
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Shipping Supplies')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    async function loadData() {
      if (!user) return
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false })
        
      if (data) setExpenses(data)
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
      user_id: user.id,
      description,
      category,
      amount: parseFloat(amount),
      expense_date: expenseDate
    }

    if (editingId) {
      const { data, error } = await supabase.from('expenses').update(expenseData).eq('id', editingId).select()
      if (data) {
        setExpenses(expenses.map(exp => exp.id === editingId ? data[0] : exp))
        resetForm()
      }
    } else {
      const { data, error } = await supabase.from('expenses').insert([expenseData]).select()
      if (data) {
        setExpenses([data[0], ...expenses])
        resetForm()
      }
    }
  }

  const handleEdit = (exp) => {
    setEditingId(exp.id)
    setDescription(exp.description)
    setCategory(exp.category)
    setAmount(exp.amount)
    setExpenseDate(exp.expense_date)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) {
      setExpenses(expenses.filter(exp => exp.id !== id))
    }
  }

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1>Business Expenses</h1>
        <button className="btn" onClick={() => {
          if (showForm) {
            resetForm()
          } else {
            setShowForm(true)
            setExpenseDate(new Date().toISOString().split('T')[0])
          }
        }}>
          {showForm ? 'Cancel' : '+ Add Expense'}
        </button>
      </header>

      {showForm && (
        <div className="glass-panel" style={{ marginBottom: '32px' }}>
          <h3>{editingId ? 'Edit Expense' : 'Record New Expense'}</h3>
          <form onSubmit={handleSaveExpense} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
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
              <label>Date</label>
              <input type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
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

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
           <div style={{ padding: '24px' }}>Loading...</div>
        ) : expenses.length === 0 ? (
           <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>No expenses recorded.</div>
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
              {expenses.map(exp => (
                <tr key={exp.id}>
                  <td>{new Date(exp.expense_date).toLocaleDateString()}</td>
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
