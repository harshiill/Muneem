import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const chatApi = {
  sendMessage: async (message: string) => {
    const response = await apiClient.post('/chat/', { message })
    return response.data.answer
  },
}

export const expenseApi = {
  getInsights: async () => {
    const response = await apiClient.get('/expenses/insights/weekly')
    return response.data
  },
  addExpense: async (title: string, amount: number, category: string, goalId?: string) => {
    const response = await apiClient.post('/expenses/', {
      title,
      amount,
      category,
      goal_id: goalId,
    })
    return response.data
  },
}

export const goalsApi = {
  getGoals: async () => {
    const response = await apiClient.get('/expenses/goals')
    return response.data
  },
  createGoal: async (title: string, targetAmount: number, deadline: string, goalType: 'saving' | 'expense') => {
    const response = await apiClient.post('/expenses/goals', {
      title,
      target_amount: targetAmount,
      deadline,
      goal_type: goalType,
    })
    return response.data
  },
  deleteGoal: async (goalId: string) => {
    await apiClient.delete(`/expenses/goals/${goalId}`)
  },
  getGoalInsights: async () => {
    const response = await apiClient.get('/expenses/goals/insights')
    return response.data
  },
}

export const profileApi = {
  getProfile: async () => {
    const response = await apiClient.get('/expenses/profile')
    return response.data
  },
  updateProfile: async (monthlyIncome: number, monthlySavingCapacity: number) => {
    const response = await apiClient.post('/expenses/profile', {
      monthly_income: monthlyIncome,
      monthly_saving_capacity: monthlySavingCapacity,
    })
    return response.data
  },
}

export default apiClient
