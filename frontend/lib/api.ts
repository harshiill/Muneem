import axios from "axios";
import type { AgentIntent, Citation } from "./store";

export interface AgentResponse {
  answer: string;
  intent: AgentIntent;
  citations: Citation[];
  execution_path: string[];
  error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const chatApi = {
  sendMessage: async (message: string, refreshContext: boolean = false) => {
    const response = await apiClient.post("/chat/", {
      message,
      refresh_context: refreshContext,
    });
    return response.data.answer;
  },

  // 🔹 LangGraph multi-flow agent endpoint
  sendMessageAgent: async (message: string): Promise<AgentResponse> => {
    const response = await apiClient.post<AgentResponse>("/chat/agent", {
      message,
      refresh_context: false,
    });
    return response.data;
  },

  // 🔹 NEW: Streaming message for real-time responses
  sendMessageStream: async (
    message: string,
    onChunk: (text: string) => void,
    refreshContext: boolean = false,
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          refresh_context: refreshContext,
        }),
        signal: AbortSignal.timeout(120000), // 120 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data && data !== "[DONE]") {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) {
                    onChunk(parsed.text);
                  }
                } catch (e) {
                  console.error(
                    "Failed to parse streaming data:",
                    e,
                    "data:",
                    data,
                  );
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("timeout")) {
        throw new Error(
          "Request timeout - chat service is taking too long to respond",
        );
      }
      throw error;
    }
  },
};

export const expenseApi = {
  getExpenses: async (category?: string, sort?: string) => {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append("category", category);
    if (sort) params.append("sort", sort);
    const response = await apiClient.get(`/expenses/?${params.toString()}`);
    return response.data;
  },
  getInsights: async () => {
    const response = await apiClient.get("/expenses/insights/weekly");
    return response.data;
  },
  addExpense: async (
    title: string,
    amount: number,
    category: string,
    goalId?: number,
    splits?: Array<{ person_name: string; amount_owed: number }>,
  ) => {
    const response = await apiClient.post("/expenses/", {
      title,
      amount,
      category,
      goal_id: goalId,
      splits: splits || [],
    });
    return response.data;
  },
  deleteExpense: async (expenseId: number) => {
    const response = await apiClient.delete(`/expenses/${expenseId}`);
    return response.data;
  },
  getLent: async () => {
    const response = await apiClient.get("/expenses/lent/unsettled");
    return response.data;
  },
  markSplitSettled: async (splitId: number) => {
    const response = await apiClient.patch(
      `/expenses/splits/${splitId}/settle`,
    );
    return response.data;
  },
  deleteSplit: async (splitId: number) => {
    const response = await apiClient.delete(`/expenses/splits/${splitId}`);
    return response.data;
  },
  // Dues API
  getDues: async () => {
    const response = await apiClient.get("/expenses/dues");
    return response.data;
  },
  addDue: async (data: any) => {
    const response = await apiClient.post("/expenses/dues", data);
    return response.data;
  },
  deleteDue: async (dueId: number) => {
    const response = await apiClient.delete(`/expenses/dues/${dueId}`);
    return response.data;
  },
  updateDueStatus: async (
    dueId: number,
    status: "pending" | "paid" | "overdue",
  ) => {
    const response = await apiClient.patch(
      `/expenses/dues/${dueId}/status?status=${status}`,
    );
    return response.data;
  },
  getPeople: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>("/expenses/people");
    return response.data;
  },
  getLentAggregated: async () => {
    const response = await apiClient.get("/expenses/lent/aggregated");
    return response.data;
  },
};

export const goalsApi = {
  getGoals: async () => {
    const response = await apiClient.get("/expenses/goals");
    return response.data;
  },
  createGoal: async (
    title: string,
    targetAmount: number,
    deadline: string,
    goalType: "saving" | "expense",
  ) => {
    const response = await apiClient.post("/expenses/goals", {
      title,
      target_amount: targetAmount,
      deadline,
      goal_type: goalType,
    });
    return response.data;
  },
  deleteGoal: async (goalId: string) => {
    await apiClient.delete(`/expenses/goals/${goalId}`);
  },
};

export const profileApi = {
  getProfile: async () => {
    const response = await apiClient.get("/expenses/profile");
    return response.data;
  },
  updateProfile: async (
    monthlyIncome: number,
    monthlySavingCapacity: number,
  ) => {
    const response = await apiClient.post("/expenses/profile", {
      monthly_income: monthlyIncome,
      monthly_saving_capacity: monthlySavingCapacity,
    });
    return response.data;
  },
};

export default apiClient;
