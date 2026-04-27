'use client'

import { useState } from 'react'
import { goalsApi } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface AddGoalFormProps {
  onSuccess?: () => void
}

export function AddGoalForm({ onSuccess }: AddGoalFormProps) {
  const [title, setTitle] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [goalType, setGoalType] = useState<'saving' | 'expense'>('saving')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !targetAmount || !deadline) {
      toast.error('Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      await goalsApi.createGoal(title, parseFloat(targetAmount), deadline, goalType)
      toast.success('Goal created successfully!')
      setTitle('')
      setTargetAmount('')
      setDeadline('')
      setGoalType('saving')
      onSuccess?.()
    } catch (error) {
      console.error('Create goal error:', error)
      toast.error('Failed to create goal')
    } finally {
      setIsLoading(false)
    }
  }

  // Get tomorrow's date as minimum date
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm flex flex-col h-full">
        <h2 className="text-2xl font-bold text-foreground mb-6">Create New Goal</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Goal Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Save for vacation"
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg bg-white text-foreground placeholder-muted-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Target Amount (₹)
            </label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg bg-white text-foreground placeholder-muted-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={minDate}
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg bg-white text-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Goal Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Goal Type
            </label>
            <select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as 'saving' | 'expense')}
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg bg-white text-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50"
            >
              <option value="saving">Saving Goal</option>
              <option value="expense">Expense Goal (Budget)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-2">
              {goalType === 'saving'
                ? 'Track how much you want to save'
                : 'Set a budget limit for expenses'}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !title || !targetAmount || !deadline}
            className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center justify-center gap-2 mt-auto shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Goal'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
