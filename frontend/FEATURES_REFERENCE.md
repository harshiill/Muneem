# Advanced Features - Quick Reference Guide

## 📋 New Files Created (4 Files)

### 1. `/app/goals/page.tsx` (200 lines)
**Purpose:** Goals management page

**Key Features:**
- Display saving and expense goals separately
- Create new goals with form toggle
- Delete goals with confirmation dialog
- Real-time data refresh after creation
- Loading and empty states
- Responsive grid (1-3 columns)

**Main Sections:**
- Header with "New Goal" button
- Form section (hidden by default)
- Saving Goals grid
- Budget Goals grid
- No goals empty state

**Imports:**
```typescript
import { goalsApi, useGoalsStore } from '@/lib'
import { GoalCard, AddGoalForm } from '@/components'
import { Loader2, Target } from 'lucide-react'
```

---

### 2. `/app/profile/page.tsx` (190 lines)
**Purpose:** User profile and financial settings

**Key Features:**
- View current profile information
- Edit mode for updating income and savings
- Calculate saving rate percentage
- Project annual savings
- Form validation
- Loading and error states

**Two Modes:**
- **Display Mode:** Read-only view with "Edit Profile" button
- **Edit Mode:** Form with Save/Cancel buttons

**Calculated Values:**
- `savingRate = (monthly_saving_capacity / monthly_income) * 100`
- `annualSavings = monthly_saving_capacity * 12`

**Imports:**
```typescript
import { profileApi, useProfileStore } from '@/lib'
import { Card } from '@/components'
import { Loader2 } from 'lucide-react'
```

---

### 3. `/components/GoalCard.tsx` (100 lines)
**Purpose:** Individual goal display component

**Props:**
```typescript
interface GoalCardProps {
  goal: Goal
  onDelete: (id: string) => void
}
```

**Displays:**
- Goal title and type badge
- Target amount
- Deadline
- Progress bar (expense goals only)
- Current amount vs target
- Months needed
- Delete button

**Color Scheme:**
- Saving Goal: Green/blue
- Expense Goal: Red/orange badges
- Progress bars: Dynamic gradient

**Imports:**
```typescript
import { Goal } from '@/lib/store'
import { Trash2, TrendingUp } from 'lucide-react'
```

---

### 4. `/components/AddGoalForm.tsx` (140 lines)
**Purpose:** Create new goals form

**Fields:**
1. **Goal Title** - Text input
2. **Target Amount** - Number input (decimal)
3. **Deadline** - Date picker (min = tomorrow)
4. **Goal Type** - Dropdown (saving/expense)

**Validation:**
- All fields required
- Amount > 0
- Deadline in future
- Form disabling during submission

**Props:**
```typescript
interface AddGoalFormProps {
  onSuccess?: () => void
}
```

**Imports:**
```typescript
import { goalsApi } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
```

---

## 📝 Updated Files (5 Files)

### 1. `/lib/api.ts`
**Changes:** Added new API endpoints

**New Methods:**

```typescript
// Goals API
export const goalsApi = {
  getGoals: async () → Goal[]
  createGoal: async (title, targetAmount, deadline, goalType) → Goal
  deleteGoal: async (goalId) → void
  getGoalInsights: async () → GoalInsight[]
}

// Profile API
export const profileApi = {
  getProfile: async () → Profile
  updateProfile: async (monthly_income, monthly_saving_capacity) → Profile
}

// Updated Expense API
export const expenseApi = {
  // ... existing methods
  addExpense: async (title, amount, category, goalId?) → void
}
```

---

### 2. `/lib/store.ts`
**Changes:** Added goal and profile stores

**New Stores:**

```typescript
interface Goal {
  id: string
  title: string
  target_amount: number
  deadline: string
  goal_type: 'saving' | 'expense'
  current_amount?: number
  progress_percent?: number
  months_needed?: number
}

interface Profile {
  monthly_income: number
  monthly_saving_capacity: number
}

export const useGoalsStore = create<GoalsStore>(...)
export const useProfileStore = create<ProfileStore>(...)
```

**Stores Include:**
- State variables
- Setter functions
- Add/remove operations
- Loading states

---

### 3. `/components/AddExpenseForm.tsx`
**Changes:** Added goal linking feature

**New Additions:**
- `useEffect` to fetch goals on mount
- Goal state variable
- "Link to Budget Goal" dropdown field
- Only shows expense-type goals
- Shows goal amount for reference
- Passes goalId to API

**New Code:**
```typescript
const [selectedGoal, setSelectedGoal] = useState('')
const [goals, setGoals] = useState<Goal[]>([])

useEffect(() => {
  fetchGoals()
}, [])

const fetchGoals = async () => {
  const data = await goalsApi.getGoals()
  const expenseGoals = data.filter(g => g.goal_type === 'expense')
  setGoals(expenseGoals)
}
```

---

### 4. `/components/Sidebar.tsx`
**Changes:** Added navigation items

**Updated Nav Items:**
```typescript
{
  label: 'Chat',
  href: '/',
  icon: MessageCircle,
},
{
  label: 'Dashboard',
  href: '/dashboard',
  icon: PieChart,
},
{
  label: 'Goals', // NEW
  href: '/goals',
  icon: Target, // NEW ICON
},
{
  label: 'Add Expense',
  href: '/add-expense',
  icon: PlusCircle,
},
{
  label: 'Profile', // NEW
  href: '/profile',
  icon: User, // NEW ICON
},
```

**Icon Imports Added:**
```typescript
import { Target, User } from 'lucide-react'
```

---

### 5. `/app/dashboard/page.tsx`
**Changes:** Added goal insights section

**New State:**
```typescript
const [goalInsights, setGoalInsights] = useState<GoalInsight[]>([])

interface GoalInsight {
  id: string
  title: string
  progress_percent: number
  months_needed: number
  status: 'on_track' | 'at_risk' | 'warning'
}
```

**New Section in Render:**
```typescript
{/* Goal Progress Section */}
{goalInsights.length > 0 && (
  <div className="mb-8">
    <h2 className="text-2xl font-bold...">Goal Progress</h2>
    {/* Goal insight cards with status */}
  </div>
)}
```

**Color-Coded Status:**
- Green: On track
- Yellow: At risk  
- Red: Warning

---

## 🎯 Integration Points

### URL Routes
```
/goals            → Goals page
/goals/page.tsx   → Page component
/profile          → Profile page
/profile/page.tsx → Page component
```

### Components Used
```
GoalCard          → Displays individual goal
AddGoalForm       → Creates new goal
AddExpenseForm    → Links expense to goal
Sidebar           → Navigation to goals/profile
Card              → Dashboard insights
```

### API Calls
```
getGoals()         → Fetch all goals
createGoal()       → Create new goal
deleteGoal()       → Delete goal
getGoalInsights()  → Dashboard insights
getProfile()       → Fetch profile
updateProfile()    → Update profile
addExpense()       → Add expense with optional goal
```

---

## 🔍 Code Patterns Used

### Form Handling
```typescript
const [title, setTitle] = useState('')
const [isLoading, setIsLoading] = useState(false)

const handleSubmit = async (e) => {
  e.preventDefault()
  setIsLoading(true)
  try {
    await api.call()
    setTitle('')
    toast.success('Success')
  } catch (error) {
    toast.error('Error')
  } finally {
    setIsLoading(false)
  }
}
```

### Data Fetching
```typescript
useEffect(() => {
  fetchData()
}, [])

const fetchData = async () => {
  setLoading(true)
  try {
    const data = await api.getData()
    setData(data)
  } catch (error) {
    toast.error('Failed to load')
  } finally {
    setLoading(false)
  }
}
```

### Zustand Store Usage
```typescript
const { goals, setGoals, removeGoal, isLoading } = useGoalsStore()
```

---

## 🎨 UI Components & Classes

### Card Styling
```html
<div className="rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors">
```

### Button Styling
```html
<button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
```

### Input Styling
```html
<input className="w-full px-4 py-2 rounded-lg bg-secondary text-foreground border border-secondary focus:border-primary outline-none">
```

### Progress Bar
```html
<div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${progress}%` }} />
</div>
```

---

## ⚡ Performance Tips

1. **Parallel API Calls** (Dashboard)
   ```typescript
   const [data1, data2] = await Promise.all([
     api.getInsights(),
     api.getGoalInsights(),
   ])
   ```

2. **Conditional Rendering**
   - Only load goals dropdown when needed
   - Only show goal insights if data exists

3. **Efficient Updates**
   - Use Zustand for state (no re-render overhead)
   - Direct state updates, no derived state

---

## 🧪 Testing Scenarios

| Scenario | Steps | Expected |
|----------|-------|----------|
| Create Goal | Fill form → Submit | Goal appears in list |
| Link Expense | Select goal dropdown | Shows expense goals |
| Delete Goal | Click delete → Confirm | Goal removed |
| Update Profile | Edit → Save | Values persist |
| Dashboard | Load page | Shows goal progress |

---

## 🚀 Deployment Ready

✅ Full TypeScript type safety
✅ Error handling with toast feedback
✅ Loading states on all async ops
✅ Form validation
✅ Empty states
✅ Responsive design
✅ Mobile optimized
✅ Accessible UI

Ready to deploy after backend implementation!
