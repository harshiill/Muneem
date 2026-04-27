'use client'

import { AlertCircle, CheckCircle, Clock, Trash2 } from 'lucide-react'
import { expenseApi } from '@/lib/api'
import { formatINR } from '@/lib/currency'
import toast from 'react-hot-toast'
import { useState } from 'react'

export interface Due {
  id: number
  title: string
  amount: number
  creditor: string
  due_date: string
  category: string
  status: 'pending' | 'paid' | 'overdue'
  created_at: string
  notes?: string
}

interface DueCardProps {
  due: Due
  onDelete?: (id: number) => void
  onStatusChange?: (id: number, status: string) => void
}

export function DueCard({ due, onDelete, onStatusChange }: DueCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const dueDate = new Date(due.due_date)
  const today = new Date()
  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
  const isOverdue = daysLeft < 0 && due.status === 'pending'

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this due?')) return

    setIsDeleting(true)
    try {
      await expenseApi.deleteDue(due.id)
      toast.success('Due deleted successfully')
      onDelete?.(due.id)
    } catch (error) {
      console.error('Delete due error:', error)
      toast.error('Failed to delete due')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMarkAsPaid = async () => {
    setIsUpdating(true)
    try {
      await expenseApi.updateDueStatus(due.id, 'paid')
      toast.success('Due marked as paid!')
      onStatusChange?.(due.id, 'paid')
    } catch (error) {
      console.error('Update due status error:', error)
      toast.error('Failed to update due status')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusColor = () => {
    if (due.status === 'paid') return 'bg-green-500/10 border-green-500/30'
    if (isOverdue) return 'bg-red-500/10 border-red-500/30'
    return 'bg-yellow-500/10 border-yellow-500/30'
  }

  const getStatusIcon = () => {
    if (due.status === 'paid')
      return <CheckCircle size={20} className="text-green-500" />
    if (isOverdue)
      return <AlertCircle size={20} className="text-red-500" />
    return <Clock size={20} className="text-yellow-500" />
  }

  const getStatusText = () => {
    if (due.status === 'paid') return 'Paid'
    if (isOverdue) return `Overdue by ${Math.abs(daysLeft)} days`
    return `Due in ${daysLeft} days`
  }

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()} transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon()}
            <h3 className="font-semibold text-foreground">{due.title}</h3>
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            <span className="font-medium">Owed to:</span> {due.creditor}
          </p>

          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Amount:</span> {formatINR(due.amount)}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Category:</span> {due.category}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-2">
            <span className="font-medium">Due Date:</span>{' '}
            {dueDate.toLocaleDateString()}
          </p>

          {due.notes && (
            <p className="text-xs text-muted-foreground italic border-t border-current pt-2 mt-2">
              {due.notes}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                due.status === 'paid'
                  ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                  : isOverdue
                    ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                    : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
              }`}
            >
              {getStatusText()}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-3 md:mt-0">
          {due.status !== 'paid' && (
            <button
              onClick={handleMarkAsPaid}
              disabled={isUpdating}
              className="w-full md:w-auto px-4 py-2 md:py-1 text-sm md:text-xs font-medium rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Updating...' : 'Mark Paid'}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full md:w-auto px-4 py-2 md:py-1 text-sm md:text-xs font-medium rounded-md bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <Trash2 size={14} />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}