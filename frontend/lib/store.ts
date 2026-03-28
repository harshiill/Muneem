import { create } from "zustand";

export type AgentIntent =
  | "web_search"
  | "action"
  | "advice"
  | "conversation"
  | "unknown";

export interface Citation {
  url: string;
  title: string;
}

export interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  // LangGraph agent metadata (only present on AI messages from /chat/agent)
  intent?: AgentIntent;
  citations?: Citation[];
  executionPath?: string[];
}

export interface Goal {
  id: string;
  title: string;
  target_amount: number;
  deadline: string;
  goal_type: "saving" | "expense";
  current_amount?: number;
  progress_percent?: number;
  months_needed?: number;
}

export interface Profile {
  monthly_income: number;
  monthly_saving_capacity: number;
}

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  addMessage: (
    content: string,
    sender: "user" | "ai",
    meta?: {
      intent?: AgentIntent;
      citations?: Citation[];
      executionPath?: string[];
    },
  ) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

interface GoalsStore {
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

interface ProfileStore {
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,
  addMessage: (content, sender, meta) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: Math.random().toString(36).substr(2, 9),
          content,
          sender,
          timestamp: new Date(),
          ...(meta ?? {}),
        },
      ],
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [] }),
}));

export const useGoalsStore = create<GoalsStore>((set) => ({
  goals: [],
  isLoading: false,
  setGoals: (goals) => set({ goals }),
  addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
  removeGoal: (id) =>
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    })),
  setLoading: (loading) => set({ isLoading: loading }),
}));

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  isLoading: false,
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
