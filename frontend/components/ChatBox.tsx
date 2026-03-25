'use client'

import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '@/lib/store'
import { chatApi } from '@/lib/api'
import { MessageBubble } from './MessageBubble'
import { Send, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function ChatBox() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, isLoading, addMessage, setLoading } = useChatStore()
  const [streamingText, setStreamingText] = useState('')
  const completedTextRef = useRef('')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText])

  // When streaming completes, add the final message to store
  useEffect(() => {
    if (!isLoading && streamingText && completedTextRef.current) {
      addMessage(completedTextRef.current, 'ai')
      setStreamingText('')
      completedTextRef.current = ''
    }
  }, [isLoading, addMessage])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    addMessage(userMessage, 'user')
    setLoading(true)
    setStreamingText('')
    completedTextRef.current = ''

    try {
      // Use streaming API for better UX
      await chatApi.sendMessageStream(userMessage, (chunk) => {
        completedTextRef.current += chunk
        setStreamingText((prev) => prev + chunk)
      })
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to get response. Please try again.')
      addMessage('Sorry, I encountered an error. Please try again.', 'ai')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-6">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary to-accent shadow-xl shadow-primary/30 flex items-center justify-center mb-4 mx-auto">
                <span className="text-3xl font-bold">◆</span>
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3">
              Welcome to Muneem
            </h2>
            <p className="text-muted-foreground max-w-md mb-8 text-lg">
              Your AI-powered personal finance assistant. Ask me anything about your finances, budgeting tips, or financial planning.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md">
              {[
                'What are my spending patterns?',
                'Tips for saving money',
                'Analyze my expenses',
                'Budget recommendations',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion)
                  }}
                  className="px-4 py-2 rounded-lg bg-card border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary hover:bg-card/80 transition-all text-left font-medium"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && streamingText && (
              <MessageBubble 
                message={{ 
                  id: 'streaming', 
                  content: streamingText, 
                  sender: 'ai',
                  timestamp: new Date()
                }} 
              />
            )}
            {isLoading && !streamingText && (
              <div className="flex gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
                <div className="bg-secondary text-foreground px-4 py-3 rounded-lg rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your finances..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium shadow-md"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
