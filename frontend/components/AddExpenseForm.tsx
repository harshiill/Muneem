'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { expenseApi, goalsApi } from '@/lib/api'
import { Goal } from '@/lib/store'
import { formatINR } from '@/lib/currency'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Health',
  'Education',
  'Other',
]

export function AddExpenseForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [selectedGoal, setSelectedGoal] = useState<number | ''>('')
  const [splitPeople, setSplitPeople] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGoals, setIsLoadingGoals] = useState(false)

  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    setIsLoadingGoals(true)
    try {
      const data = await goalsApi.getGoals()
      // Only show expense goals
      const expenseGoals = Array.isArray(data) ? data.filter((g) => g.goal_type === 'expense') : []
      setGoals(expenseGoals)
    } catch (error) {
      console.error('Fetch goals error:', error)
    } finally {
      setIsLoadingGoals(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !amount) {
      toast.error('Please fill in all fields')
      return
    }

    if (parseFloat(amount) < 0) {
      toast.error('Amount cannot be negative')
      return
    }

    setIsLoading(true)
    try {
      const goalId = selectedGoal !== '' ? selectedGoal : undefined
      
      // Parse splits
      let splits: Array<{ person_name: string; amount_owed: number }> = []
      if (splitPeople.trim()) {
        const people = splitPeople.split(',').map(p => p.trim()).filter(p => p.length > 0)
        const amountPerPerson = parseFloat(amount) / (people.length + 1)
        splits = people.map(person => ({
          person_name: person,
          amount_owed: Math.round(amountPerPerson * 100) / 100
        }))
      } else if (paidBy.trim()) {
        const amountPerPerson = parseFloat(amount) / 2
        splits = [{
          person_name: paidBy.trim(),
          amount_owed: Math.round(amountPerPerson * 100) / 100
        }]
      }

      await expenseApi.addExpense(title, parseFloat(amount), category, goalId, splits)
      toast.success('Expense added successfully!')
      setTitle('')
      setAmount('')
      setCategory('Food')
      setSelectedGoal('')
      setSplitPeople('')
      setPaidBy('')
      
      // Navigate to expenses page
      router.push('/expenses')
    } catch (error) {
      console.error('Add expense error:', error)
      toast.error('Failed to add expense')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm flex flex-col h-full">
        <h2 className="text-2xl font-bold text-foreground mb-6">Add Expense</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Coffee at Starbucks"
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg bg-white text-foreground placeholder-muted-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Amount (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg bg-white text-foreground placeholder-muted-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full px-4 py-2 rounded-lg bg-white text-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Goal Select (Optional) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Link to Budget Goal (Optional)
            </label>
            {isLoadingGoals ? (
              <div className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground text-sm">
                Loading goals...
              </div>
            ) : (
              <select
                value={selectedGoal === '' ? '' : String(selectedGoal)}
                onChange={(e) => setSelectedGoal(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                disabled={isLoading || goals.length === 0}
                className="w-full px-4 py-2 rounded-lg bg-white text-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">No goal selected</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={String(goal.id)}>
                    {goal.title} ({formatINR(goal.target_amount)})
                  </option>
                ))}
              </select>
            )}
            {goals.length === 0 && !isLoadingGoals && (
              <p className="text-xs text-muted-foreground mt-2">
                No budget goals yet. <a href="/goals" className="text-primary hover:underline">Create one</a>
              </p>
            )}
          </div>

          {/* Split Between People */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Split between people (Optional)
            </label>
            <input
              type="text"
              value={splitPeople}
              onChange={(e) => setSplitPeople(e.target.value)}
              placeholder="e.g., Ayush, Tanmay, John"
              disabled={isLoading || !!paidBy}
              className="w-full px-4 py-2 rounded-lg bg-white text-foreground placeholder-muted-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated names. Amount will be split equally.</p>
            {splitPeople && amount && (
              <div className="mt-2 p-2 bg-secondary rounded text-xs">
                <p className="font-semibold">Each person owes:</p>
                <p className="text-primary">₹{(parseFloat(amount) / (splitPeople.split(',').length + 1)).toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Paid By */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Paid by (Optional)
            </label>
            <input
              type="text"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              placeholder="e.g., Raj (who paid for you)"
              disabled={isLoading || !!splitPeople}
              className="w-full px-4 py-2 rounded-lg bg-white text-foreground placeholder-muted-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">Person who paid, you split equally.</p>
            {paidBy && amount && (
              <div className="mt-2 p-2 bg-secondary rounded text-xs">
                <p className="font-semibold">You owe {paidBy}:</p>
                <p className="text-primary">₹{(parseFloat(amount) / 2).toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !title || !amount}
            className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center justify-center gap-2 mt-auto shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Expense'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
