import { Goal } from '@/lib/store'
import { Trash2, TrendingUp } from 'lucide-react'

interface GoalCardProps {
  goal: Goal
  onDelete: (id: string) => void
}

export function GoalCard({ goal, onDelete }: GoalCardProps) {
  const progressPercent = Math.min((goal.progress_percent || 0), 100)
  const isExpenseGoal = goal.goal_type === 'expense'

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
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-green-500/20 text-green-400'
              }`}
            >
              {isExpenseGoal ? 'Expense Goal' : 'Saving Goal'}
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
          ${goal.target_amount.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Target Amount</p>
      </div>

      {/* Progress for expense goals */}
      {isExpenseGoal && (
        <>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-sm font-semibold text-foreground">
                {progressPercent.toFixed(0)}%
              </p>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {goal.current_amount && (
              <p className="text-xs text-muted-foreground mt-2">
                ${goal.current_amount.toFixed(2)} of ${goal.target_amount.toFixed(2)}
              </p>
            )}
          </div>

          {/* Months Needed */}
          {goal.months_needed && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Time to Complete</p>
                <p className="text-sm font-semibold text-foreground">
                  {goal.months_needed} {goal.months_needed === 1 ? 'month' : 'months'}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Saving goals info */}
      {!isExpenseGoal && (
        <div className="p-3 rounded-lg bg-secondary/50">
          <p className="text-xs text-muted-foreground">Goal Status</p>
          <p className="text-sm font-semibold text-foreground mt-1">
            Active • Track your savings progress
          </p>
        </div>
      )}
    </div>
  )
}
