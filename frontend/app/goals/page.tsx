'use client'

import { useEffect, useState } from 'react'
import { goalsApi, expenseApi } from '@/lib/api'
import { useGoalsStore } from '@/lib/store'
import { GoalCard } from '@/components/GoalCard'
import { AddGoalForm } from '@/components/AddGoalForm'
import { Loader2, Target } from 'lucide-react'
import toast from 'react-hot-toast'

interface GoalInsight {
  goal: string
  type: 'saving' | 'expense'
  target_amount: number
  months_needed?: number
  months_left?: number
  spent?: number
  remaining?: number
  progress_percent?: number
}

interface InsightData {
  goal_insights: GoalInsight[]
}

export default function GoalsPage() {
  const { goals, setGoals, removeGoal, isLoading, setLoading } = useGoalsStore()
  const [goalInsights, setGoalInsights] = useState<GoalInsight[]>([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchGoalsAndInsights()
  }, [])

  const fetchGoalsAndInsights = async () => {
    setLoading(true)
    try {
      const [goalsData, insightsData] = await Promise.all([
        goalsApi.getGoals(),
        expenseApi.getInsights()
      ])
      setGoals(Array.isArray(goalsData) ? goalsData : [])
      setGoalInsights(insightsData?.goal_insights || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load goals')
    } finally {
      setLoading(false)
    }
  }

  const fetchGoalsAndInsightsRefresh = async () => {
    try {
      const [goalsData, insightsData] = await Promise.all([
        goalsApi.getGoals(),
        expenseApi.getInsights()
      ])
      setGoals(Array.isArray(goalsData) ? goalsData : [])
      setGoalInsights(insightsData?.goal_insights || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load goals')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return

    try {
      await goalsApi.deleteGoal(id)
      removeGoal(id)
      toast.success('Goal deleted')
      await fetchGoalsAndInsightsRefresh()
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
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Financial Goals
            </h1>
            <p className="text-muted-foreground text-lg">
              Create and track your financial goals and budgets
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/30 transition-all font-semibold"
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
                fetchGoalsAndInsightsRefresh()
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
              {savingGoals.map((goal) => {
                const insight = goalInsights.find(
                  (g) => g.goal.toLowerCase() === goal.title.toLowerCase()
                )
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    insight={insight}
                    onDelete={handleDelete}
                  />
                )
              })}
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
              {expenseGoals.map((goal) => {
                const insight = goalInsights.find(
                  (g) => g.goal.toLowerCase() === goal.title.toLowerCase()
                )
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    insight={insight}
                    onDelete={handleDelete}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
