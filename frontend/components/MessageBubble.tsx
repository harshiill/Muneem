import { Message, AgentIntent } from "@/lib/store";
import React, { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Intent Badge Config
// ─────────────────────────────────────────────────────────────────────────────

const INTENT_CONFIG: Record<
  AgentIntent,
  { label: string; icon: string; className: string }
> = {
  web_search: {
    label: "Live Search",
    icon: "🔍",
    className: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  },
  action: {
    label: "Action",
    icon: "⚡",
    className: "bg-green-500/10 text-green-400 border border-green-500/20",
  },
  advice: {
    label: "Analysis",
    icon: "📊",
    className: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  },
  conversation: {
    label: "Chat",
    icon: "💬",
    className: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  },
  unknown: {
    label: "AI",
    icon: "🤖",
    className: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Markdown Renderer
// ─────────────────────────────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  // Handle **bold**, *italic*, and [link](url) inline
  const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
  return tokens.map((token, i) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={i}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      return <em key={i}>{token.slice(1, -1)}</em>;
    }
    const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={i}>{token}</span>;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-border/50 my-2" />);
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-bold mt-3 mb-1 text-foreground">
          {renderInline(line.slice(4))}
        </h3>,
      );
      i++;
      continue;
    }

    // H2
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-bold mt-3 mb-1 text-foreground">
          {renderInline(line.slice(3))}
        </h2>,
      );
      i++;
      continue;
    }

    // H1
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-lg font-bold mt-3 mb-1 text-foreground">
          {renderInline(line.slice(2))}
        </h1>,
      );
      i++;
      continue;
    }

    // Unordered list
    if (line.startsWith("- ") || line.startsWith("• ")) {
      const listItems: React.ReactNode[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith("- ") || lines[i].startsWith("• "))
      ) {
        listItems.push(
          <li key={i} className="leading-relaxed">
            {renderInline(lines[i].slice(2))}
          </li>,
        );
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc ml-5 my-1 space-y-0.5 text-sm">
          {listItems}
        </ul>,
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const content = lines[i].replace(/^\d+\.\s/, "");
        listItems.push(
          <li key={i} className="leading-relaxed">
            {renderInline(content)}
          </li>,
        );
        i++;
      }
      elements.push(
        <ol
          key={`ol-${i}`}
          className="list-decimal ml-5 my-1 space-y-0.5 text-sm"
        >
          {listItems}
        </ol>,
      );
      continue;
    }

    // Bold-only line (used as a section header by GPT)
    if (
      line.startsWith("**") &&
      line.endsWith("**") &&
      !line.slice(2, -2).includes("**")
    ) {
      elements.push(
        <p key={i} className="text-sm font-semibold mt-2 mb-0.5">
          {line.slice(2, -2)}
        </p>,
      );
      i++;
      continue;
    }

    // Empty line → spacer
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-1.5" />);
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p
        key={i}
        className="text-sm leading-relaxed whitespace-pre-wrap break-words"
      >
        {renderInline(line)}
      </p>,
    );
    i++;
  }

  return (
    <div className="space-y-0.5">
      {elements.length > 0 ? (
        elements
      ) : (
        <p className="text-sm leading-relaxed">{text}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Intent Badge Component
// ─────────────────────────────────────────────────────────────────────────────

function IntentBadge({ intent }: { intent: AgentIntent }) {
  const config = INTENT_CONFIG[intent] ?? INTENT_CONFIG.unknown;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Citations Panel Component
// ─────────────────────────────────────────────────────────────────────────────

function CitationsPanel({
  citations,
}: {
  citations: { url: string; title: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-2 border-t border-border/40 pt-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>🔗</span>
        <span>
          {citations.length} source{citations.length > 1 ? "s" : ""}
        </span>
        <span className="ml-0.5">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <ul className="mt-1.5 space-y-1">
          {citations.map((c, idx) => (
            <li key={idx}>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors truncate"
                title={c.url}
              >
                <span className="shrink-0">↗</span>
                <span className="truncate">{c.title || c.url}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution Path Pill
// ─────────────────────────────────────────────────────────────────────────────

function ExecutionPath({ path }: { path: string[] }) {
  const [show, setShow] = useState(false);
  if (!path || path.length === 0) return null;

  const NODE_LABELS: Record<string, string> = {
    fetch_memory: "Memory",
    classify_intent: "Router",
    web_search: "Web",
    financial_action: "Action",
    financial_advisor: "Advisor",
    conversation: "Chat",
    synthesize: "Synthesize",
    save_memory: "Save",
  };

  return (
    <div className="mt-1.5 relative">
      <button
        onClick={() => setShow((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        title="Show execution path"
      >
        <span className="text-[10px]">◆</span>
        <span className="text-[10px]">LangGraph</span>
      </button>
      {show && (
        <div className="absolute bottom-full left-0 mb-1.5 bg-card border border-border rounded-lg p-2.5 shadow-lg z-10 min-w-max">
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">
            Execution Path
          </p>
          <div className="flex items-center gap-1 flex-wrap">
            {path.map((node, idx) => (
              <React.Fragment key={node}>
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                  {NODE_LABELS[node] ?? node}
                </span>
                {idx < path.length - 1 && (
                  <span className="text-muted-foreground/40 text-[10px]">
                    →
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main MessageBubble Component
// ─────────────────────────────────────────────────────────────────────────────

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.sender === "user";

  return (
    <div
      className={`flex gap-3 mb-4 animate-slide-up ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
          AI
        </div>
      )}

      <div
        className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-xs lg:max-w-2xl`}
      >
        {/* Intent badge — shown above the bubble for agent responses */}
        {!isUser && message.intent && message.intent !== "unknown" && (
          <div className="mb-1 ml-1">
            <IntentBadge intent={message.intent} />
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm shadow-md"
              : "bg-secondary text-foreground rounded-bl-sm border border-border/60 shadow-sm"
          }`}
        >
          {/* Content */}
          <div className="text-sm leading-relaxed">
            {isUser ? (
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
            ) : (
              renderMarkdown(message.content)
            )}
          </div>

          {/* Citations (web search only) */}
          {!isUser && message.citations && message.citations.length > 0 && (
            <CitationsPanel citations={message.citations} />
          )}

          {/* Timestamp */}
          <p
            className={`text-[10px] mt-1.5 ${
              isUser ? "text-blue-100/80" : "text-muted-foreground/60"
            }`}
          >
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Execution path (collapsed by default) */}
        {!isUser &&
          message.executionPath &&
          message.executionPath.length > 0 && (
            <div className="ml-1">
              <ExecutionPath path={message.executionPath} />
            </div>
          )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
          U
        </div>
      )}
    </div>
  );
}
