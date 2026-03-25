import { Message } from '@/lib/store'
import React from 'react'

// Simple markdown renderer
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Headers (### text → h3, ## text → h2, # text → h1)
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base font-bold mt-2 mb-1">
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-lg font-bold mt-2 mb-1">
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-xl font-bold mt-2 mb-1">
          {line.slice(2)}
        </h1>
      )
    }
    // Bold text **text**
    else if (line.includes('**')) {
      const parts = line.split(/\*\*(.*?)\*\*/g)
      elements.push(
        <p key={i} className="text-sm leading-relaxed">
          {parts.map((part, idx) =>
            idx % 2 === 1 ? (
              <strong key={idx}>{part}</strong>
            ) : (
              <span key={idx}>{part}</span>
            )
          )}
        </p>
      )
    }
    // Bullet points - text
    else if (line.startsWith('- ')) {
      elements.push(
        <li key={i} className="text-sm leading-relaxed ml-4 list-disc">
          {line.slice(2)}
        </li>
      )
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />)
    }
    // Regular text
    else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {line}
        </p>
      )
    }
  }

  return elements.length > 0 ? elements : <p className="text-sm leading-relaxed">{text}</p>
}

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.sender === 'user'

  return (
    <div
      className={`flex gap-3 mb-4 animate-slide-up ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
          AI
        </div>
      )}
      <div
        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none shadow-md'
            : 'bg-secondary text-foreground rounded-bl-none border border-border'
        }`}
      >
        <div className="text-sm leading-relaxed">
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            renderMarkdown(message.content)
          )}
        </div>
        <p
          className={`text-xs mt-1 ${
            isUser ? 'text-blue-100' : 'text-muted-foreground'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white">
          U
        </div>
      )}
    </div>
  )
}
