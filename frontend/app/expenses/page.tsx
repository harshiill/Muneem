'use client'

import { useEffect, useState } from 'react'
import { expenseApi } from '@/lib/api'
import { formatINR } from '@/lib/currency'
import { Loader2, Trash2, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

interface Expense {
  id: number
  title: string
  amount: number
  category: string
  goal_id?: number
  created_at?: string
  splits?: Array<{
    id: number
    person_name: string
    amount_owed: number
    settled?: string
  }>
}

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

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingSplitId, setDeletingSplitId] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [sort, setSort] = useState<string>('date_desc')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchExpenses()
  }, [selectedCategory, sort])

  const fetchExpenses = async () => {
    setIsLoading(true)
    try {
      const data = await expenseApi.getExpenses(selectedCategory, sort)
      setExpenses(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Fetch expenses error:', error)
      toast.error('Failed to load expenses')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this expense? This will automatically update your goal progress.')) return

    setDeletingId(id)
    try {
      await expenseApi.deleteExpense(id)
      // Remove from local state immediately
      setExpenses(expenses.filter(e => e.id !== id))
      toast.success('Expense deleted and goal progress updated!')
    } catch (error) {
      console.error('Delete expense error:', error)
      toast.error('Failed to delete expense')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteSplit = async (splitId: number, expenseId: number) => {
    if (!window.confirm('Are you sure you want to remove this split?')) return

    setDeletingSplitId(splitId)
    try {
      await expenseApi.deleteSplit(splitId)
      // Update local state
      setExpenses(expenses.map(expense => 
        expense.id === expenseId
          ? { ...expense, splits: expense.splits?.filter(s => s.id !== splitId) || [] }
          : expense
      ))
      toast.success('Split removed!')
    } catch (error) {
      console.error('Delete split error:', error)
      toast.error('Failed to remove split')
    } finally {
      setDeletingSplitId(null)
    }
  }

  // Filter expenses by search term (category and sort are handled by backend)
  const filteredExpenses = expenses.filter((expense) => {
    return expense.title.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  const averageExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0

  // Group by category
  const byCategory = filteredExpenses.reduce(
    (acc, expense) => {
      if (!acc[expense.category]) acc[expense.category] = 0
      acc[expense.category] += expense.amount
      return acc
    },
    {} as Record<string, number>
  )

  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString()
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Expenses
          </h1>
          <p className="text-muted-foreground text-lg">
            View and manage all your expenses
          </p>
        </div>

        {/* Stats Cards */}
        {filteredExpenses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="rounded-lg border border-border/50 bg-card hover:shadow-lg hover:shadow-primary/10 p-6 transition-all">
              <p className="text-sm text-muted-foreground mb-2">Total Spending</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {formatINR(totalExpenses)}
              </p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card hover:shadow-lg hover:shadow-primary/10 p-6 transition-all">
              <p className="text-sm text-muted-foreground mb-2">Average Expense</p>
              <p className="text-4xl font-bold text-foreground">
                {formatINR(averageExpense)}
              </p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card hover:shadow-lg hover:shadow-primary/10 p-6 transition-all">
              <p className="text-sm text-muted-foreground mb-2">Total Transactions</p>
              <p className="text-4xl font-bold text-primary">
                {filteredExpenses.length}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-card border border-border/50 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none transition-colors"
            />

            {/* Category and Sort Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 rounded-lg bg-card border border-border/50 text-foreground focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="px-4 py-3 rounded-lg bg-card border border-border/50 text-foreground focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {Object.keys(byCategory).length > 0 && (
            <div className="p-4 rounded-lg bg-card border border-border/50">
              <p className="text-sm font-semibold text-foreground mb-3">Spending by Category</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(byCategory).map(([category, amount]) => (
                  <div key={category} className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">{category}</p>
                    <p className="text-sm font-semibold text-primary mt-1">
                      {formatINR(amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expenses List */}
        {filteredExpenses.length > 0 ? (
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            {/* Desktop View */}
            <div className="hidden md:block">
              <div className="grid grid-cols-5 gap-4 p-4 border-b border-border/50 bg-secondary/30 font-semibold text-sm text-foreground">
                <div>Description</div>
                <div className="text-right">Amount</div>
                <div className="text-center">Category</div>
                <div className="text-center">Date</div>
                <div className="text-center">Action</div>
              </div>
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="border-b border-border/30 hover:bg-secondary/20 transition-colors"
                >
                  {/* Main row */}
                  <div className="grid grid-cols-5 gap-4 p-4 items-center">
                    <div>
                      <p className="font-medium text-foreground">{expense.title}</p>
                      {expense.splits && expense.splits.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {expense.splits.map((split) => (
                            <div key={split.id} className="flex items-center justify-between gap-2">
                              <p className="text-xs text-muted-foreground">
                                💔 {split.person_name} owes {formatINR(split.amount_owed)}
                              </p>
                              <button
                                onClick={() => handleDeleteSplit(split.id || 0, expense.id)}
                                disabled={deletingSplitId === split.id}
                                className="px-2 py-1 text-xs bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Remove split"
                              >
                                {deletingSplitId === split.id ? '...' : '✕'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{formatINR(expense.amount)}</p>
                    </div>
                    <div className="text-center">
                      <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                        {expense.category}
                      </span>
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                      {formatDate(expense.created_at)}
                    </div>
                    <div className="text-center">
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        disabled={deletingId === expense.id}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors inline-flex disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete expense"
                      >
                        {deletingId === expense.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-3 p-4">
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="p-4 rounded-lg bg-secondary/30 border border-border/30"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{expense.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(expense.created_at)}
                      </p>
                      {expense.splits && expense.splits.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {expense.splits.map((split) => (
                            <div key={split.id} className="flex items-center justify-between gap-2">
                              <p className="text-xs text-muted-foreground">
                                💔 {split.person_name}: {formatINR(split.amount_owed)}
                              </p>
                              <button
                                onClick={() => handleDeleteSplit(split.id || 0, expense.id)}
                                disabled={deletingSplitId === split.id}
                                className="px-2 py-1 text-xs bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Remove split"
                              >
                                {deletingSplitId === split.id ? '...' : '✕'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="font-bold text-primary text-lg ml-4">
                      {formatINR(expense.amount)}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                      {expense.category}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      disabled={deletingId === expense.id}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete expense"
                    >
                      {deletingId === expense.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
            <p className="text-muted-foreground mb-4">No expenses found</p>
            <a
              href="/add-expense"
              className="inline-flex px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/30 transition-all font-semibold"
            >
              Add Your First Expense
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
