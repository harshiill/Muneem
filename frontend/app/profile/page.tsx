'use client'

import { useEffect, useState } from 'react'
import { profileApi } from '@/lib/api'
import { useProfileStore } from '@/lib/store'
import { Card } from '@/components/Card'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { profile, setProfile, isLoading, setLoading } = useProfileStore()
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [monthlySavingCapacity, setMonthlySavingCapacity] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (profile) {
      setMonthlyIncome(profile.monthly_income.toString())
      setMonthlySavingCapacity(profile.monthly_saving_capacity.toString())
    }
  }, [profile])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const data = await profileApi.getProfile()
      setProfile(data)
    } catch (error) {
      console.error('Fetch profile error:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!monthlyIncome || !monthlySavingCapacity) {
      toast.error('Please fill in all fields')
      return
    }

    setIsSaving(true)
    try {
      const updated = await profileApi.updateProfile(
        parseFloat(monthlyIncome),
        parseFloat(monthlySavingCapacity)
      )
      setProfile(updated)
      setIsEditing(false)
      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Update profile error:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const savingRate = profile
    ? ((profile.monthly_saving_capacity / profile.monthly_income) * 100).toFixed(1)
    : '0'

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Profile Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your financial profile and preferences
          </p>
        </div>

        {/* Main Profile Card */}
        <div className="bg-card border border-border rounded-lg p-8 mb-8">
          {!isEditing ? (
            <>
              {/* Display Mode */}
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Monthly Income</p>
                  <p className="text-4xl font-bold text-foreground">
                    ${profile?.monthly_income.toFixed(2) || '0.00'}
                  </p>
                </div>

                <div className="h-px bg-border" />

                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Monthly Saving Capacity
                  </p>
                  <p className="text-4xl font-bold text-primary">
                    ${profile?.monthly_saving_capacity.toFixed(2) || '0.00'}
                  </p>
                </div>

                <div className="h-px bg-border" />

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Saving Rate</p>
                  <p className="text-3xl font-bold text-foreground">{savingRate}%</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Percentage of income allocated to savings
                  </p>
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full mt-6 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                >
                  Edit Profile
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Edit Mode */}
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Monthly Income ($)
                  </label>
                  <input
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    disabled={isSaving}
                    className="w-full px-4 py-2 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-secondary focus:border-primary outline-none transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Monthly Saving Capacity ($)
                  </label>
                  <input
                    type="number"
                    value={monthlySavingCapacity}
                    onChange={(e) => setMonthlySavingCapacity(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    disabled={isSaving}
                    className="w-full px-4 py-2 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-secondary focus:border-primary outline-none transition-colors disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    How much you can save monthly (should be &le; monthly income)
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            title="Financial Health"
            value="📈"
            description={
              profile
                ? `You can save $${profile.monthly_saving_capacity.toFixed(2)} each month`
                : 'Set your income and savings capacity to see recommendations'
            }
          />
          <Card
            title="Annual Savings"
            value={`$${profile ? (profile.monthly_saving_capacity * 12).toFixed(2) : '0.00'}`}
            description="Potential yearly savings at current rate"
          />
        </div>

        {/* Tips Section */}
        <div className="mt-8 p-6 rounded-lg bg-card border border-border">
          <h3 className="font-semibold text-foreground mb-3">💡 Tips</h3>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li>• Regularly review your income and savings targets</li>
            <li>• Adjust saving goals based on your actual expenses</li>
            <li>• Track progress through the goals and dashboard</li>
            <li>• Use the AI assistant for personalized recommendations</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
