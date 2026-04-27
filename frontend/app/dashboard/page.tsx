'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/Card'
import { expenseApi } from '@/lib/api'
import { formatINR } from '@/lib/currency'
import { Loader2, TrendingUp, AlertTriangle } from 'lucide-react'
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
  total_spending: number
  top_category: string
  savings_insight: string
  goal_insights: GoalInsight[]
  risk_flags: string[]
}

export default function DashboardPage() {
  const [data, setData] = useState<InsightData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchInsights()
  }, [])

  const fetchInsights = async () => {
    try {
      const insights = await expenseApi.getInsights()
      setData(insights)
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
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Your financial insights and spending summary
          </p>
        </div>

        {/* Stats Grid */}
        {data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card
                title="Total Spending"
                value={formatINR(data.total_spending)}
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

            {/* Risk Flags */}
            {data.risk_flags && data.risk_flags.length > 0 && (
              <div className="mb-8 p-4 rounded-lg border border-red-500/30 bg-red-500/10">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-400 mb-2">⚠️ Financial Alerts</h3>
                    <ul className="space-y-1">
                      {data.risk_flags.map((flag, idx) => (
                        <li key={idx} className="text-sm text-red-300">
                          • {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Goal Insights Section */}
            {data.goal_insights && data.goal_insights.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎯</span> Goal Progress
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data.goal_insights.map((goal, idx) => {
                    const isExpenseGoal = goal.type === 'expense'
                    const isSavingGoal = goal.type === 'saving'
                    const hasWarning = isSavingGoal && goal.months_needed && goal.months_left && goal.months_needed > goal.months_left

                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="font-semibold text-foreground text-lg">{goal.goal}</h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              isExpenseGoal
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-green-500/20 text-green-400'
                            }`}
                          >
                            {isExpenseGoal ? '📊 Budget' : '💰 Saving'}
                          </span>
                        </div>

                        {/* Target Amount */}
                        <div className="mb-4">
                          <p className="text-2xl font-bold text-foreground">
                            {formatINR(goal.target_amount)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Target Amount</p>
                        </div>

                        {/* Expense Goal: Progress Bar */}
                        {isExpenseGoal && goal.progress_percent !== undefined && (
                          <>
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-muted-foreground">Progress</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {goal.progress_percent.toFixed(0)}%
                                </p>
                              </div>
                              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                                  style={{ width: `${Math.min(goal.progress_percent, 100)}%` }}
                                />
                              </div>
                              {goal.spent !== undefined && goal.remaining !== undefined && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatINR(goal.spent)} spent • {formatINR(goal.remaining)} remaining
                                </p>
                              )}
                            </div>
                          </>
                        )}

                        {/* Saving Goal: Timeline */}
                        {isSavingGoal && goal.months_needed !== undefined && (
                          <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-secondary/50">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-400" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Months to Goal</p>
                                  <p className="text-sm font-semibold text-foreground">
                                    {goal.months_needed} {goal.months_needed === 1 ? 'month' : 'months'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {goal.months_left !== undefined && (
                              <div className="p-3 rounded-lg bg-secondary/50">
                                <div className="flex items-center gap-2">
                                  <span className={hasWarning ? '⏰' : '✓'} />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Months Left</p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {goal.months_left} {goal.months_left === 1 ? 'month' : 'months'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {hasWarning && (
                              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                <p className="text-xs text-yellow-400 flex items-start gap-2">
                                  <span className="mt-0.5">⚠️</span>
                                  <span>Goal may need acceleration - months needed exceeds months left</span>
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
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
