'use client'

import { useEffect, useState } from 'react'
import { expenseApi } from '@/lib/api'
import { Loader2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface LentItem {
  split_id: number
  person_name: string
  amount_owed: number
  expense_title: string
  created_at: string
  settled: string
}

export default function LentPage() {
  const [lentData, setLentData] = useState<LentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [settlingId, setSettlingId] = useState<number | null>(null)

  useEffect(() => {
    fetchLentData()
  }, [])

  const fetchLentData = async () => {
    setIsLoading(true)
    try {
      const data = await expenseApi.getLent()
      setLentData(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch lent data:', error)
      toast.error('Failed to load lent data')
      setLentData([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkSettled = async (splitId: number) => {
    setSettlingId(splitId)
    try {
      await expenseApi.markSplitSettled(splitId)
      toast.success('Split marked as settled!')
      // Remove from list
      setLentData(lentData.filter(item => item.split_id !== splitId))
    } catch (error) {
      console.error('Failed to mark as settled:', error)
      toast.error('Failed to mark as settled')
    } finally {
      setSettlingId(null)
    }
  }

  const totalLent = lentData.reduce((sum, item) => sum + item.amount_owed, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">💰 Money Lent</h1>
          <p className="text-muted-foreground">Track money you've given to others that needs to be returned</p>
        </div>

        {/* Total Card */}
        {lentData.length > 0 && (
          <div className="mb-6 rounded-lg border border-border/50 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800 p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount Lent</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">₹{totalLent.toFixed(2)}</p>
              </div>
              <div className="text-4xl">💚</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{lentData.length} pending settlement(s)</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : lentData.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-card text-center py-12 p-6">
            <p className="text-muted-foreground mb-2">No money lent yet</p>
            <p className="text-sm text-muted-foreground">When you create split expenses, they'll appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lentData.map((lent) => (
              <div key={lent.split_id} className="rounded-lg border border-border/50 bg-card hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground">{lent.person_name}</p>
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium">
                        Pending
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      From: <span className="font-medium text-foreground">{lent.expense_title}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(lent.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">₹{lent.amount_owed.toFixed(2)}</p>
                    <button
                      onClick={() => handleMarkSettled(lent.split_id)}
                      disabled={settlingId === lent.split_id}
                      className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ml-auto"
                    >
                      {settlingId === lent.split_id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Settling...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Mark Settled
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 rounded-lg border border-border/50 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 p-6">
          <p className="text-sm"><strong>💡 How it works:</strong></p>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
            <li>When you add a split expense, money lent to others appears here</li>
            <li>Mark as settled when they pay you back</li>
            <li>Your AI assistant tracks all splits and handles statements like "mark split with John as paid"</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
