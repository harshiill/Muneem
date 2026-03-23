'use client'

import { AddExpenseForm } from '@/components/AddExpenseForm'

export default function AddExpensePage() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Add Expense
          </h1>
          <p className="text-muted-foreground text-lg">
            Track your spending by adding new expenses
          </p>
        </div>

        {/* Form */}
        <AddExpenseForm />

        {/* Info */}
        <div className="mt-12 p-6 rounded-lg bg-card border border-border">
          <h3 className="font-semibold text-foreground mb-3">📝 Tips</h3>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li>• Add expenses frequently for accurate tracking</li>
            <li>• Categorize correctly for better insights</li>
            <li>• Review your spending patterns regularly</li>
            <li>• Use the chat feature for personalized advice</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
