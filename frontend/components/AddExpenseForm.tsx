'use client'

import { useEffect, useState } from 'react'
import { expenseApi, goalsApi } from '@/lib/api'
import { Goal } from '@/lib/store'
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
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [selectedGoal, setSelectedGoal] = useState<number | ''>('')
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

    setIsLoading(true)
    try {
      const goalId = selectedGoal !== '' ? selectedGoal : undefined
      await expenseApi.addExpense(title, parseFloat(amount), category, goalId)
      toast.success('Expense added successfully!')
      setTitle('')
      setAmount('')
      setCategory('Food')
      setSelectedGoal('')
    } catch (error) {
      console.error('Add expense error:', error)
      toast.error('Failed to add expense')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-6">Add Expense</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full px-4 py-2 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-secondary focus:border-primary outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Amount ($)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-secondary focus:border-primary outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full px-4 py-2 rounded-lg bg-secondary text-foreground border border-secondary focus:border-primary outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full px-4 py-2 rounded-lg bg-secondary text-foreground border border-secondary focus:border-primary outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">No goal selected</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={String(goal.id)}>
                    {goal.title} (${goal.target_amount.toFixed(2)})
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !title || !amount}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center justify-center gap-2 mt-6"
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
