'use client'

import { useState } from 'react'
import { expenseApi } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const DUE_CATEGORIES = [
  'Personal Loan',
  'Credit Card',
  'Bank Loan',
  'Friend/Family',
  'Other',
]

export function AddDueForm({ isOpen = true, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [creditor, setCreditor] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [category, setCategory] = useState('Personal Loan')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !amount || !creditor || !dueDate) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      await expenseApi.addDue({
        title,
        amount: parseFloat(amount),
        creditor,
        due_date: dueDate,
        category: category,
        notes: notes || undefined,
      })
      toast.success('Due recorded successfully!')
      setTitle('')
      setAmount('')
      setCreditor('')
      setDueDate('')
      setCategory('Personal Loan')
      setNotes('')
      if (onClose) onClose()
    } catch (error) {
      console.error('Add due error:', error)
      toast.error('Failed to record due')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={onClose}
          ></div>
          
          {/* Modal */}
          <div className="bg-card border border-border rounded-lg shadow-xl relative z-10 w-full max-w-md max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Record a Due</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              {/* Scrollable Content Area */}
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Loan from John"
                disabled={isLoading}
                className="w-full px-4 py-2 rounded-lg bg-white text-foreground placeholder-muted-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {/* Creditor Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Who are you owing to? *
              </label>
              <input
                type="text"
                value={creditor}
                onChange={(e) => setCreditor(e.target.value)}
                placeholder="e.g., John Doe, Bank Name"
                disabled={isLoading}
                className="w-full px-4 py-2 rounded-lg bg-white text-foreground placeholder-muted-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Amount (₹) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                disabled={isLoading}
                className="w-full px-4 py-2 rounded-lg bg-white text-foreground placeholder-muted-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {/* Due Date Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 rounded-lg bg-white text-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {/* Category Select */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 rounded-lg bg-white text-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50"
              >
                {DUE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any details about this due..."
                disabled={isLoading}
                className="w-full px-4 py-2 rounded-lg bg-white text-foreground placeholder-muted-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50 resize-none h-20"
              />
            </div>
          </div>

          {/* Submit Button - Fixed at Bottom */}
          <div className="p-6 border-t border-border/50 bg-card shrink-0">
            <button
              type="submit"
              disabled={isLoading || !title || !creditor || !amount || !dueDate}
              className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              {isLoading ? 'Recording...' : '+ Add Due'}
            </button>
          </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
