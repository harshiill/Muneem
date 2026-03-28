# 🧠 LangGraph Multi-Flow Agent Architecture

> **AI Financial Friend** — Powered by a stateful, multi-node LangGraph workflow

---

## Overview

The AI Financial Friend chatbot is driven by a **LangGraph StateGraph** that routes every user message through an intelligent 8-node pipeline. Instead of a single monolithic prompt, each message travels through a purpose-built flow — live web search, database actions, personalized advice, or conversation — before being synthesized into a coherent response.

```
START
  └─► fetch_memory
        └─► classify_intent
              ├─► web_search      ──────────────────┐
              ├─► financial_action ─────────────────┤
              ├─► financial_advisor ────────────────┤
              └─► conversation ────────────────────┘
                                                    ↓
                                               synthesize
                                                    └─► save_memory
                                                              └─► END
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        LANGGRAPH AGENT                          │
│                                                                 │
│  User Input                                                     │
│      │                                                          │
│      ▼                                                          │
│  ┌──────────────┐                                               │
│  │ fetch_memory │  ← Retrieves top-5 relevant memories from    │
│  │   (Node 1)   │    mem0 vector store (Qdrant backend)        │
│  └──────┬───────┘                                               │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────┐                                           │
│  │ classify_intent  │  ← LLM classifies into 4 intent types    │
│  │    (Node 2)      │    → Intent + structured data extracted  │
│  └──────┬───────────┘                                           │
│         │                                                       │
│    [Conditional Edge — routes by intent]                        │
│         │                                                       │
│    ┌────┴───────────────────────────────────────────┐           │
│    │           │              │              │       │           │
│    ▼           ▼              ▼              ▼       │           │
│ ┌──────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐ │           │
│ │ web  │ │financial│ │financial │ │conversation  │ │           │
│ │search│ │ action  │ │ advisor  │ │   (Node 6)   │ │           │
│ │(N 3) │ │ (N 4)   │ │  (N 5)  │ │              │ │           │
│ └──┬───┘ └────┬────┘ └────┬─────┘ └──────┬───────┘ │           │
│    └──────────┴───────────┴──────────────┘         │           │
│                           │                                     │
│                           ▼                                     │
│                   ┌───────────────┐                             │
│                   │   synthesize  │  ← Formats final response   │
│                   │   (Node 7)    │                             │
│                   └───────┬───────┘                             │
│                           │                                     │
│                           ▼                                     │
│                   ┌───────────────┐                             │
│                   │  save_memory  │  ← Persists turn to mem0   │
│                   │   (Node 8)    │                             │
│                   └───────┬───────┘                             │
│                           │                                     │
│                          END                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## The 4 Flows

### 🔍 Flow 1 — Web Search
**Trigger:** Questions needing real-time external data

**Examples:**
- *"What are the best mutual funds in 2025?"*
- *"Current SBI FD interest rates?"*
- *"How does SIP work?"*
- *"What is the repo rate?"*

**Processing:**
1. Enriches query with user's financial context (income, savings)
2. Calls **OpenAI Responses API** with `web_search_preview` tool
3. Extracts URL citations from annotated output blocks
4. Falls back to `gpt-4o-search-preview` → `gpt-4o-mini` on failure

**Response includes:** Live answer + collapsible source citations panel

---

### ⚡ Flow 2 — Financial Action
**Trigger:** CRUD operations on user's financial database

**Examples:**
- *"I spent ₹800 on food"* → adds expense
- *"Save ₹50,000 for Goa trip"* → creates saving goal
- *"I owe ₹3000 to Rahul"* → adds due record
- *"My salary is ₹60,000"* → updates profile
- *"Delete my trip goal"* → removes goal record
- *"Dinner ₹1200 with Priya and Ayush"* → adds expense + splits

**Processing:**
1. Classifier extracts structured JSON (action type, amount, title, splits, etc.)
2. Action node dispatches to the correct DB tool
3. Handles goal linking, bill splitting, fuzzy name matching for deletes

**Response includes:** Confirmation with emoji status indicators

---

### 📊 Flow 3 — Financial Advisor
**Trigger:** Personalized advice using the user's own live data

**Examples:**
- *"Can I afford a MacBook?"*
- *"Am I saving enough?"*
- *"Should I go on a trip to Goa?"*
- *"How are my finances looking?"*

**Processing:**
1. Fetches live DB snapshot (income, spending, goals, dues, risk flags)
2. Retrieves relevant conversation memories
3. Generates personalized advice using `generate_chat_response()`
4. Considers goals, dues, savings capacity, and risk flags

**Response includes:** Realistic, data-driven financial advice

---

### 💬 Flow 4 — Conversation
**Trigger:** General chat, greetings, capability questions

**Examples:**
- *"Hello!"*, *"Thanks"*
- *"What can you help me with?"*

**Processing:**
1. Warm conversational response
2. Guides users toward actionable financial queries

---

## State Definition

The **GraphState** TypedDict is passed through every node. Nodes return partial dicts — only the fields they modify.

```python
class GraphState(TypedDict):
    # ── Inputs ──────────────────────────────────────────
    user_question: str
    user_id:       str
    db:            Any          # SQLAlchemy Session
    financial_data: dict        # Live DB analytics snapshot

    # ── Processing ──────────────────────────────────────
    memory_context: List[str]   # Retrieved from mem0
    intent:         str         # web_search | action | advice | conversation
    intent_data:    dict        # Structured extraction from LLM classifier

    # ── Branch Results ───────────────────────────────────
    action_results:      List[str]        # Tool execution output
    web_search_result:   Optional[str]    # Live web search response
    web_citations:       List[dict]       # URL + title pairs
    advisor_response:    Optional[str]    # Personalized advice text

    # ── Output ──────────────────────────────────────────
    final_response:  str
    error:           Optional[str]
    execution_path:  Annotated[List[str], list_add]  # Auto-append reducer
```

The `execution_path` field uses LangGraph's **Annotated reducer** (`operator.add`) — each node appends its name, and LangGraph concatenates automatically.

---

## Node Reference

| # | Node | Purpose | Output Fields |
|---|------|---------|---------------|
| 1 | `fetch_memory` | Retrieve top-5 semantically similar memories from mem0/Qdrant | `memory_context` |
| 2 | `classify_intent` | LLM-based routing — classifies intent + extracts structured data | `intent`, `intent_data` |
| 3 | `web_search` | OpenAI Responses API with `web_search_preview` tool | `web_search_result`, `web_citations` |
| 4 | `financial_action` | DB CRUD tools (add/delete expenses, goals, dues, profile) | `action_results` |
| 5 | `financial_advisor` | Personalized analysis with live financial data | `advisor_response` |
| 6 | `conversation` | General chat with assistant persona | `advisor_response` |
| 7 | `synthesize` | Merge branch results into final formatted response | `final_response` |
| 8 | `save_memory` | Persist conversation turn to mem0 vector store | *(side effect)* |

---

## API Endpoint

### `POST /chat/agent`

The LangGraph-powered endpoint. Drop-in upgrade over `/chat/`.

**Request:**
```json
{
  "message": "What are the best SIP plans for 2025?",
  "refresh_context": false
}
```

**Response:**
```json
{
  "answer": "Based on current market data, here are the top SIP options...",
  "intent": "web_search",
  "citations": [
    { "url": "https://...", "title": "Top Mutual Funds 2025 - Moneycontrol" }
  ],
  "execution_path": ["fetch_memory", "classify_intent", "web_search", "synthesize", "save_memory"],
  "error": null
}
```

**Intent values and their meaning:**

| Intent | Badge | Triggered when |
|--------|-------|----------------|
| `web_search` | 🔍 Live Search | Real-time market/investment queries |
| `action` | ⚡ Action | CRUD on financial records |
| `advice` | 📊 Analysis | Personalized financial advice |
| `conversation` | 💬 Chat | General chat / greetings |

---

## Web Search — Fallback Chain

The web search node tries three methods in order:

```
1. OpenAI Responses API  (client.responses.create + web_search_preview)
        ↓ fails?
2. gpt-4o-search-preview  (chat.completions with search model)
        ↓ fails?
3. gpt-4o-mini  (standard completion, no live search)
```

This ensures the agent **always returns a response**, even if live search is unavailable.

---

## Memory Architecture

```
User Message
     │
     ▼
fetch_memory ──► mem0.search(query, limit=5)
                      │
                      ▼
              [Qdrant Vector Store]
              text-embedding-3-small
                      │
                      ▼
             Top-5 relevant memories
             (stale numerical facts filtered out)
                      │
                      ▼
          Injected into financial_advisor prompt

... (response generated) ...

save_memory ──► mem0.add(user_message, assistant_response)
                      │
                      ▼
              Stored in Qdrant for future retrieval
```

---

## Frontend Integration

The UI reflects the agent flow with visual indicators:

- **Intent Badge** — displayed above each AI message bubble
- **Citations Panel** — collapsible source list for web search results
- **Execution Path** — hover tooltip showing which LangGraph nodes ran
- **Flow Suggestions** — welcome screen chips labeled with their flow type

### Message Store Extension

```typescript
interface Message {
  id:            string
  content:       string
  sender:        'user' | 'ai'
  timestamp:     Date
  // LangGraph metadata
  intent?:        AgentIntent          // web_search | action | advice | conversation
  citations?:     Citation[]           // Source URLs
  executionPath?: string[]             // Node execution order
}
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Agent Framework | **LangGraph** `>=0.2.0` (StateGraph, conditional edges) |
| LLM | **OpenAI GPT-4o-mini** (intent classification, advice, conversation) |
| Web Search | **OpenAI Responses API** with `web_search_preview` built-in tool |
| Memory | **mem0** + **Qdrant** vector store |
| Embeddings | `text-embedding-3-small` |
| Backend | **FastAPI** + **SQLAlchemy** (SQLite) |
| Frontend | **Next.js 14** + **TypeScript** + **Zustand** + **Tailwind CSS** |

---

## Running the Agent

### Prerequisites
- Qdrant running locally: `docker run -p 6333:6333 qdrant/qdrant`
- `.env` file with `OPENAI_API_KEY=sk-...`

### Start Backend
```bash
cd backend
venv/Scripts/activate        # Windows
source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### Test the Agent Endpoint
```bash
curl -X POST http://localhost:8000/chat/agent \
  -H "Content-Type: application/json" \
  -d '{"message": "Best mutual funds for beginners in 2025?"}'
```

---

## Key Design Decisions

### Why LangGraph over a single prompt?
- **Separation of concerns** — each node has one responsibility
- **Conditional routing** — the right tool for each query type
- **State immutability** — nodes return partial updates, never mutate state
- **Debuggability** — `execution_path` shows exactly which nodes ran
- **Extensibility** — add new flows (e.g., `tax_advisor`, `investment_screener`) without touching existing nodes

### Why the Annotated reducer for `execution_path`?
LangGraph nodes return partial state dicts. Without a reducer, the last write wins. Using `Annotated[List[str], operator.add]` tells LangGraph to *concatenate* each node's contribution automatically — giving a complete audit trail of the execution.

### Why lazy mem0 initialization?
The mem0 client connects to Qdrant at construction time. Eager initialization at module import would crash the entire backend if Qdrant isn't running. The `LazyMemClient` proxy defers connection until the first actual call, making the service resilient to startup ordering.

---

## Future Enhancements

- [ ] **Tax Advisor Node** — Dedicated flow for Indian tax (80C, 80D, HRA) queries
- [ ] **Investment Screener Node** — Compare stocks/mutual funds using live data
- [ ] **Budget Alert Node** — Post-action check that warns on budget overruns
- [ ] **LangGraph Streaming** — Stream tokens progressively using `graph.astream()`
- [ ] **Multi-user Auth** — Replace `default_user` with JWT-based user IDs
- [ ] **LangSmith Tracing** — Full observability of agent runs in production
- [ ] **Checkpointing** — Persist graph state across sessions with LangGraph's `SqliteSaver`
