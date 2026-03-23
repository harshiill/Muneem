'use client'

import { useEffect, useState } from 'react'
import { goalsApi } from '@/lib/api'
import { useGoalsStore, Goal } from '@/lib/store'
import { GoalCard } from '@/components/GoalCard'
import { AddGoalForm } from '@/components/AddGoalForm'
import { Loader2, Target } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GoalsPage() {
  const { goals, setGoals, removeGoal, isLoading, setLoading } = useGoalsStore()
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    setLoading(true)
    try {
      const data = await goalsApi.getGoals()
      setGoals(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Fetch goals error:', error)
      toast.error('Failed to load goals')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return

    try {
      await goalsApi.deleteGoal(id)
      removeGoal(id)
      toast.success('Goal deleted')
    } catch (error) {
      console.error('Delete goal error:', error)
      toast.error('Failed to delete goal')
    }
  }

  const savingGoals = goals.filter((g) => g.goal_type === 'saving')
  const expenseGoals = goals.filter((g) => g.goal_type === 'expense')

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Financial Goals
            </h1>
            <p className="text-muted-foreground">
              Create and track your financial goals and budgets
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            {showForm ? 'Cancel' : '+ New Goal'}
          </button>
        </div>

        {/* Form Section */}
        {showForm && (
          <div className="mb-8">
            <AddGoalForm
              onSuccess={() => {
                setShowForm(false)
                fetchGoals()
              }}
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* No Goals State */}
        {!isLoading && goals.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-muted-foreground opacity-50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No goals yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first goal to start tracking your financial progress
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              Create First Goal
            </button>
          </div>
        )}

        {/* Saving Goals Section */}
        {!isLoading && savingGoals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="text-2xl">💰</span> Saving Goals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savingGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Expense Goals Section */}
        {!isLoading && expenseGoals.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span> Budget Goals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {expenseGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
