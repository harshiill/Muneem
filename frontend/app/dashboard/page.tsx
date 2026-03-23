'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/Card'
import { expenseApi, goalsApi } from '@/lib/api'
import { Loader2, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface InsightData {
  total_spending: number
  top_category: string
  savings_insight: string
}

interface GoalInsight {
  id: string
  title: string
  progress_percent: number
  months_needed: number
  status: 'on_track' | 'at_risk' | 'warning'
}

export default function DashboardPage() {
  const [data, setData] = useState<InsightData | null>(null)
  const [goalInsights, setGoalInsights] = useState<GoalInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchInsights()
  }, [])

  const fetchInsights = async () => {
    try {
      const [expenseData, goalsData] = await Promise.all([
        expenseApi.getInsights(),
        goalsApi.getGoalInsights().catch(() => []),
      ])
      setData(expenseData)
      if (Array.isArray(goalsData)) {
        setGoalInsights(goalsData)
      }
    } catch (error) {
      console.error('Fetch insights error:', error)
      toast.error('Failed to load insights')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            View your financial insights and spending summary
          </p>
        </div>

        {/* Stats Grid */}
        {data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card
                title="Total Spending"
                value={`$${data.total_spending.toFixed(2)}`}
                icon="💸"
                description="Total amount spent"
              />
              <Card
                title="Top Category"
                value={data.top_category || 'N/A'}
                icon="📊"
                description="Your highest spending category"
              />
              <Card
                title="Savings Insight"
                value="📈"
                description={data.savings_insight || 'Keep tracking your expenses'}
              />
            </div>

            {/* Goal Insights Section */}
            {goalInsights.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎯</span> Goal Progress
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {goalInsights.map((goal) => (
                    <div
                      key={goal.id}
                      className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-foreground">{goal.title}</h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            goal.status === 'on_track'
                              ? 'bg-green-500/20 text-green-400'
                              : goal.status === 'at_risk'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {goal.status === 'on_track' ? '✓ On Track' : goal.status === 'at_risk' ? '⚠ At Risk' : '✗ Warning'}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Progress</p>
                          <p className="text-sm font-semibold text-foreground">
                            {goal.progress_percent.toFixed(0)}%
                          </p>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              goal.status === 'on_track'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                : goal.status === 'at_risk'
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                  : 'bg-gradient-to-r from-red-500 to-rose-500'
                            }`}
                            style={{ width: `${goal.progress_percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Months to Complete</p>
                          <p className="text-sm font-semibold text-foreground">
                            {goal.months_needed} {goal.months_needed === 1 ? 'month' : 'months'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No spending data yet</p>
          </div>
        )}

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            title="Quick Tips"
            value="✨"
            description="Track all your expenses regularly to get better insights and recommendations"
          />
          <Card
            title="Next Steps"
            value="🎯"
            description="Add expenses to see personalized financial insights and monthly trends"
          />
        </div>
      </div>
    </div>
  )
}
