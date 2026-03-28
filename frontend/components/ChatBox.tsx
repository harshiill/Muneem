"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "@/lib/store";
import { chatApi, expenseApi } from "@/lib/api";
import { MessageBubble } from "./MessageBubble";
import { MentionDropdown } from "./MentionDropdown";
import { Send, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

// Suggestion prompts that showcase all 4 LangGraph flows
const SUGGESTIONS = [
  { text: "Best SIP plans for 2025?", icon: "🔍", flow: "Search" },
  { text: "I spent ₹800 on food today", icon: "⚡", flow: "Action" },
  { text: "Can I afford a Goa trip?", icon: "📊", flow: "Analysis" },
  { text: "What are my spending patterns?", icon: "📊", flow: "Analysis" },
  { text: "Save ₹50,000 for new laptop", icon: "⚡", flow: "Action" },
  { text: "Current FD interest rates?", icon: "🔍", flow: "Search" },
];

function ThinkingDots() {
  return (
    <div className="flex gap-3 mb-4 justify-start animate-slide-up">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
        AI
      </div>
      <div className="bg-secondary text-foreground px-4 py-3 rounded-2xl rounded-bl-sm border border-border/60 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div
              className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="text-xs text-muted-foreground/60">Thinking...</span>
        </div>
      </div>
    </div>
  );
}

export function ChatBox() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { messages, isLoading, addMessage, setLoading } = useChatStore();

  // @mention state
  const [people, setPeople] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  // Load people list once on mount
  useEffect(() => {
    expenseApi
      .getPeople()
      .then(setPeople)
      .catch(() => {});
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Detect @mention in textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // Find the word at cursor that starts with @
    const cursor = e.target.selectionStart ?? value.length;
    const textToCursor = value.slice(0, cursor);
    const match = textToCursor.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]); // text after @
    } else {
      setMentionQuery(null);
    }

    // Auto-resize
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleMentionSelect = useCallback(
    (name: string) => {
      // Replace @partial with the selected name
      const cursor = textareaRef.current?.selectionStart ?? input.length;
      const before = input.slice(0, cursor).replace(/@(\w*)$/, name);
      const after = input.slice(cursor);
      const newValue = before + (after.startsWith(" ") ? "" : " ") + after;
      setInput(newValue.trimEnd() + " ");
      setMentionQuery(null);
      // Re-focus textarea
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [input],
  );

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "48px";
    addMessage(userMessage, "user");
    setLoading(true);
    setMentionQuery(null);

    try {
      const result = await chatApi.sendMessageAgent(userMessage);
      addMessage(result.answer, "ai", {
        intent: result.intent,
        citations: result.citations,
        executionPath: result.execution_path,
      });
      // Refresh people list after actions
      if (result.intent === "action") {
        expenseApi
          .getPeople()
          .then(setPeople)
          .catch(() => {});
      }
    } catch (error) {
      console.error("Agent error:", error);
      toast.error("Failed to get response. Please try again.");
      addMessage("Sorry, I encountered an error. Please try again.", "ai");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (text: string) => setInput(text);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setMentionQuery(null);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-xl shadow-primary/30 flex items-center justify-center mb-4 mx-auto">
                <span className="text-3xl font-bold">◆</span>
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3">
              Welcome to Muneem
            </h2>
            <p className="text-muted-foreground max-w-md mb-3 text-base">
              Your AI-powered financial assistant — now with a multi-flow agent
              engine.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {[
                {
                  icon: "🔍",
                  label: "Live Search",
                  color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                },
                {
                  icon: "⚡",
                  label: "Actions",
                  color: "text-green-400 bg-green-500/10 border-green-500/20",
                },
                {
                  icon: "📊",
                  label: "Analysis",
                  color:
                    "text-purple-400 bg-purple-500/10 border-purple-500/20",
                },
                {
                  icon: "💬",
                  label: "Chat",
                  color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
                },
              ].map((flow) => (
                <span
                  key={flow.label}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${flow.color}`}
                >
                  {flow.icon} {flow.label}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSuggestion(s.text)}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-card/80 transition-all text-left group"
                >
                  <span className="text-base shrink-0">{s.icon}</span>
                  <span className="flex-1 truncate">{s.text}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground/60 group-hover:text-muted-foreground shrink-0">
                    {s.flow}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && <ThinkingDots />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end relative">
            {/* @mention dropdown — floats above the input */}
            {mentionQuery !== null && (
              <div className="absolute bottom-full left-0 w-full mb-1">
                <MentionDropdown
                  people={people}
                  query={mentionQuery}
                  onSelect={handleMentionSelect}
                  onClose={() => setMentionQuery(null)}
                />
              </div>
            )}

            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything — or type @ to mention a person..."
                disabled={isLoading}
                rows={1}
                className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder-muted-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed resize-none text-sm leading-relaxed"
                style={{ minHeight: "48px", maxHeight: "120px" }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-5 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-md hover:shadow-primary/25 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Hint */}
          <p className="text-[10px] text-center text-muted-foreground/40 mt-2">
            Press Enter to send · Shift+Enter for new line · Type @ to mention a
            person
          </p>
        </div>
      </div>
    </div>
  );
}
