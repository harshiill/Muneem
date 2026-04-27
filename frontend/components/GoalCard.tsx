import { Goal } from '@/lib/store'
import { formatINR } from '@/lib/currency'
import { Trash2, TrendingUp } from 'lucide-react'

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

interface GoalCardProps {
  goal: Goal
  insight?: GoalInsight
  onDelete: (id: string) => void
}

export function GoalCard({ goal, insight, onDelete }: GoalCardProps) {
  const isExpenseGoal = goal.goal_type === 'expense'
  const isSavingGoal = goal.goal_type === 'saving'
  const hasWarning = isSavingGoal && insight?.months_needed && insight?.months_left && insight.months_needed > insight.months_left

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-foreground">{goal.title}</h3>
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
          <p className="text-sm text-muted-foreground">
            Deadline: {formatDate(goal.deadline)}
          </p>
        </div>
        <button
          onClick={() => onDelete(goal.id)}
          className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
          title="Delete goal"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Target Amount */}
      <div className="mb-4">
        <p className="text-2xl font-bold text-foreground">
          {formatINR(goal.target_amount)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Target Amount</p>
      </div>

      {/* Expense Goal: Progress */}
      {isExpenseGoal && insight && insight.progress_percent !== undefined && (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-sm font-semibold text-foreground">
                {insight.progress_percent.toFixed(0)}%
              </p>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                style={{ width: `${Math.min(insight.progress_percent, 100)}%` }}
              />
            </div>
            {insight.spent !== undefined && insight.remaining !== undefined && (
              <p className="text-xs text-muted-foreground mt-2">
                {formatINR(insight.spent)} spent • {formatINR(insight.remaining)} remaining
              </p>
            )}
          </div>

          {/* Months Needed for Expense Goals */}
          {insight.months_needed && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Time to Complete</p>
                <p className="text-sm font-semibold text-foreground">
                  {insight.months_needed} {insight.months_needed === 1 ? 'month' : 'months'}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Saving Goal: Timeline */}
      {isSavingGoal && insight && insight.months_needed !== undefined && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-xs text-muted-foreground">Months to Goal</p>
                <p className="text-sm font-semibold text-foreground">
                  {insight.months_needed} {insight.months_needed === 1 ? 'month' : 'months'}
                </p>
              </div>
            </div>
          </div>

          {insight.months_left !== undefined && (
            <div className="p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2">
                <span className={hasWarning ? '⏰' : '✓'} />
                <div>
                  <p className="text-xs text-muted-foreground">Months Left</p>
                  <p className="text-sm font-semibold text-foreground">
                    {insight.months_left} {insight.months_left === 1 ? 'month' : 'months'}
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

      {/* Fallback for goals without insights */}
      {!insight && (
        <div className="p-3 rounded-lg bg-secondary/50">
          <p className="text-xs text-muted-foreground">Goal Status</p>
          <p className="text-sm font-semibold text-foreground mt-1">Active • Track your progress</p>
        </div>
      )}
    </div>
  )
}
