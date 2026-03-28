# DEVELOPER WALKTHROUGH — Muneem (AI-Financial-Friend)

Audience: New contributors and interview prep for the project author.

Goal: Give you a crystal-clear mental model of:
- What each file does
- How data flows end-to-end
- Why certain design decisions were made
- How to reason about the agent, memory, and “grounding” on live DB data
- How to confidently answer interview questions

Use this alongside README.md and LANGGRAPH_ARCHITECTURE.md for a complete picture.


## 0) What this project is

Muneem is an agentic personal finance copilot. Users can “chat” to:
- Add expenses (with Splitwise-style splits),
- Track dues (pending/overdue),
- Create goals (saving/expense),
- Set profile (income/saving capacity),
- Receive weekly insights and concise AI guidance grounded in the latest database snapshot.

Under the hood, a LangGraph multi-node agent classifies each message and routes it to the right flow (action/advice/search/conversation), synthesizes the final answer, and (optionally) stores short memories in a vector store (mem0 + Qdrant).

Core values:
- Ground AI output in live database facts (avoid hallucinated numbers),
- Keep the agent explainable with an auditable execution path,
- Be resilient (lazy memory init; app runs with or without vector DB).


## 1) Repo map — what lives where and why

Top-level:
- `backend/` — FastAPI app, domain models, routes, and agent services.
- `frontend/` — Next.js chat UI and forms.
- `README.md` — Quickstart, API overview, and deployment notes.
- `LANGGRAPH_ARCHITECTURE.md` — Deep-dive into the agent design and roadmap.
- `DEVELOPER_WALKTHROUGH.md` — You’re reading it.

Backend (Python / FastAPI):
- `backend/app/main.py`
  - Creates the FastAPI app
  - Registers CORS (open for dev)
  - Includes routers: `expenses` and `chat`
  - Initializes DB tables

- `backend/app/database.py`
  - SQLAlchemy engine/session setup
  - Currently uses SQLite: `sqlite:///./finance.db`
  - Provides `get_db()` dependency for routes

- `backend/app/models.py` (SQLAlchemy ORM)
  - `Expense`: id, title, amount, category, goal_id, created_at; relationships: `goal`, `splits`
  - `Split`: expense_id, person_name, amount_owed, settled
  - `UserProfile`: monthly_income, monthly_saving_capacity
  - `Goal`: title, target_amount, deadline, goal_type (“saving” or “expense”); relationship: `expenses`
  - `Due`: title, amount, creditor, due_date, category, status, notes

- `backend/app/schemas.py` (Pydantic v2 request models)
  - `ExpenseCreate`, `SplitCreate`, `UserProfileCreate`, `GoalCreate`, `DueCreate`, `ChatRequest`

- `backend/app/routes/expenses.py`
  - REST endpoints for:
    - Expenses CRUD (with optional splits on create)
    - Dues CRUD + status updates
    - Goals CRUD
    - Profile CRUD
    - “People” list (from unsettled splits and unpaid dues) for @mentions
    - Insights: weekly spend and risk flags (delegates to `pattern_service`)

- `backend/app/routes/chat.py`
  - Two main routes:
    - `POST /chat/` — Simpler flow using helper functions (intent detection, advice, actions)
    - `POST /chat/agent` — Full LangGraph agent with execution_path, citations, and intent output
  - Prepares live `financial_data` by calling `pattern_service.get_weekly_spending(db)`

- `backend/app/services/ai_tools.py`
  - Domain tools called by the agent to mutate DB:
    - `add_expense_tool`, `add_goal_tool`, `add_due_tool`
    - `update_profile_tool`
    - `delete_*` tools for expense/goal/due
  - Keep these idempotent and small — they’re the unit operations for “actions”

- `backend/app/services/pattern_service.py`
  - Analytics engine: computes weekly spend, category breakdown, savings for the period, accumulated savings, goals progress, dues risk, etc.
  - Returns a structured dictionary that the AI can use as “ground truth”
  - Also produces human-readable insights and risk flags

- `backend/app/services/ai_service.py`
  - Wraps OpenAI calls for:
    - `generate_ai_advice(data)` — concise guidance using fresh analytics
    - `generate_clarifying_questions()`
    - `search_financial_info()` (a stub-style function right now)
    - `detect_user_intent()` — robust intent detector returning typed JSON
  - Important: prompts instruct the AI to prefer the live DB snapshot over stale memory

- `backend/app/services/memory_service.py`
  - Lazy initialization for mem0 + Qdrant
  - Exposes a `mem_client` that defers connection until first use
  - Keeps startup resilient if Qdrant isn’t running (optional in dev)

- `backend/app/services/langgraph_agent.py`
  - The star of the show: a full LangGraph multi-node agent
  - Defines:
    - Graph state (user_question, user_id, db, financial_data, memory_context, intent, results, final_response, execution_path)
    - Nodes:
      1) `fetch_memory_node`
      2) `classify_intent_node`
      3) `web_search_node` (when needed)
      4) `financial_action_node`
      5) `financial_advisor_node`
      6) `conversation_node`
      7) `synthesize_node`
      8) `save_memory_node`
    - Conditional routing from `classify_intent` to the correct branch
    - `build_agent_graph()` compiles a single reusable graph
    - `run_agent(...)` — public entry point used by `/chat/agent`

Other backend files:
- `backend/requirements.txt` — Python deps (FastAPI, LangGraph, OpenAI, SQLAlchemy, mem0, Qdrant client, etc.)
- `backend/docker-compose.yml` — Optional local Qdrant service (vector DB) for memory
- `backend/finance.db` — SQLite DB (tracked only in dev; replace with Postgres in prod)

Frontend (Next.js / TypeScript / Tailwind):
- `frontend/components/ChatBox.tsx` — Main chat UI with suggestions and @mentions
- `frontend/components/*` — Forms and cards for expenses, dues, goals
- `frontend/lib` — API client/store (state management)
- It calls backend API endpoints; the agent returns answers + intent + execution_path


## 2) The two main flows — what happens when a user interacts

A) Basic REST (no agent):
1. User opens a form (e.g., Add Expense) and submits.
2. Frontend calls `POST /expenses/` with `ExpenseCreate`.
3. FastAPI route creates the Expense and optional Splits via SQLAlchemy.
4. The response returns the saved entity; UI updates.

B) Chat agent flow (the interesting one):
1. User types a message (e.g., “I spent 800 on food today”).
2. Frontend calls `POST /chat/agent` with `{ message, refresh_context }`.
3. Backend:
   - Computes live `financial_data` via `pattern_service.get_weekly_spending(db)`.
   - Invokes `run_agent(user_question, user_id, db, financial_data)`.
4. LangGraph pipeline:
   - `fetch_memory_node`: Pulls relevant short memories (mem0 + Qdrant). Filters out stale numerical facts.
   - `classify_intent_node`: Uses LLM to classify into one of four intents:
     - `web_search`, `action`, `advice`, `conversation`
   - Conditional routing:
     - If `action`: `financial_action_node` executes tools like `add_expense_tool`, possibly linking goals or handling splits.
     - If `advice`: `financial_advisor_node` generates grounded guidance using `financial_data`.
     - If `web_search`: `web_search_node` fetches/augments (stub-style now).
     - If `conversation`: `conversation_node` for general chat.
   - `synthesize_node`: Merges branch output into a final response.
   - `save_memory_node`: Writes a short summary to mem0 (best-effort).
   - Each node appends its name to `execution_path` for explainability.
5. `/chat/agent` returns:
   - `answer`: final message to show to the user,
   - `intent`: what it did (action/advice/search/conversation),
   - `execution_path`: exact nodes that ran (debuggable!),
   - optionally `citations` for search.
6. Frontend displays the result and updates lists if mutations occurred.

Sequence sketch (agent):
```
User → POST /chat/agent
        → run_agent
            → fetch_memory → classify_intent
               ↳ financial_action → synthesize → save_memory
        → return { answer, intent, execution_path }
```


## 3) Why this design (talking points for interviews)

- LangGraph vs a single prompt:
  - Pros: separation of concerns; conditional routing; explicit state; easier debugging (execution_path).
  - Enables adding new branches (e.g., `tax_advisor`) without breaking other code.

- Grounding vs Memory:
  - Live DB snapshot is the “source of truth” for numbers (spending, goals, dues).
  - Memory is used for personalization/tone but filtered for stale numerical facts.
  - This reduces hallucinations and keeps answers consistent with the real data.

- Lazy memory (mem0 + Qdrant):
  - Avoids startup failures if vector DB isn’t available.
  - Makes local/dev iterations smoother.

- Tools for domain actions:
  - Fine-grained “unit ops” like `add_expense_tool` are easy to test and reason about.
  - The agent orchestrates, tools mutate state.

- Observability:
  - `execution_path` is an audit trail — helpful for debugging and interviews (“here’s what ran”).

- Extensibility:
  - Can add nodes like `tax_advisor`, or wire in a proper web search retriever.
  - Swap SQLite with Postgres later (Neon, etc.) with minimal code changes.


## 4) Deep dive: the important files

A) `pattern_service.py` (analytics/insights)
- Gathers:
  - Weekly expenses since (now - 7 days)
  - Category breakdown
  - Profile (income, saving capacity)
  - Savings this period and accumulated savings
  - Dues risk: pending vs overdue, and their impact
  - Goal progress for saving/expense goals
- Produces:
  - Structured dict for the agent
  - Human-readable “risk flags” and “insight” strings
- Why it matters:
  - This is the “ground truth” the AI should use. The agent is told to prioritize this over memory.

B) `ai_service.py` (LLM helpers)
- `generate_ai_advice(data)`: short, practical guidance using the fresh stats.
- `generate_clarifying_questions()`: when user asks vague questions.
- `detect_user_intent()`: robust JSON-only detector with many examples.
- Note:
  - Uses OpenAI’s chat completions.
  - Prompts emphasize ignoring stale memory when numbers conflict with the live DB snapshot.

C) `langgraph_agent.py` (the heart)
- `GraphState`: typed state used by nodes.
- Nodes:
  1) `fetch_memory_node`
  2) `classify_intent_node`
  3) `web_search_node`
  4) `financial_action_node` — calls `ai_tools.py` functions
  5) `financial_advisor_node` — uses `generate_ai_advice`
  6) `conversation_node`
  7) `synthesize_node`
  8) `save_memory_node`
- `build_agent_graph()`: compiles once (singleton pattern).
- `run_agent()`: entry point invoked by `/chat/agent`.
- `execution_path`: Annotated reducer concatenates node names for a trace.

D) `ai_tools.py` (domain mutations)
- Small, focused functions that change the DB state:
  - `add_expense_tool`, `add_goal_tool`, `add_due_tool`
  - `delete_*` tools
  - `update_profile_tool`
- Advice:
  - Keep them pure and predictable (validate inputs; rollback on failure).
  - Return user-friendly strings for synthesis.

E) `routes/expenses.py`
- Exposes CRUD endpoints and convenience endpoints:
  - `/people`: builds a unique person list from unsettled splits & dues.
  - `/insights/weekly`: calls `pattern_service.get_weekly_spending(db)`.

F) `routes/chat.py`
- Two flavors:
  - `/chat/`: simpler composed path with helpers (intent detection, advice).
  - `/chat/agent`: the LangGraph-powered path with better explainability (intent, execution_path).

G) `memory_service.py`
- Lazy load pattern which calls mem0 only when needed.
- Points at Qdrant at `localhost:6333` by default (works with `docker-compose.yml`).


## 5) Data model — how entities relate

- Expense 1—* Split
  - An expense can have multiple splits (each person owes an amount).
  - Splits have a `settled` status.

- Expense *—1 Goal
  - An expense can optionally be linked to a goal (e.g., expenses under a “Goa trip” goal).

- Dues are standalone
  - Represent money the user owes to someone else (creditor) with due_date and status.

- UserProfile
  - Stores monthly income and saving capacity. Used for analytics and advice.

These relationships are reflected in SQLAlchemy models (`models.py`) and marshalled via `schemas.py`.


## 6) End-to-end example — “Add an expense” via chat

1) Frontend:
   - User types “I spent 800 on food today.”
   - Sends to `/chat/agent`.

2) Backend:
   - Builds `financial_data`.
   - `run_agent(...)`:
     - `fetch_memory_node` → adds some non-stale context (if available)
     - `classify_intent_node` → decides `action` with `{ title, amount, category }`
     - `financial_action_node` → calls `add_expense_tool(db, ...)` and returns results
     - `synthesize_node` → merges into a final message (e.g., “Added ₹800 to Food”)
     - `save_memory_node` → stores a short memory (best-effort)
   - Returns `{ answer, intent: "action", execution_path: [...] }`

3) Frontend:
   - Shows the assistant message.
   - Optionally refreshes the expense list.

Contrast this with “advice” queries (e.g., “What are my spending patterns?”) — the agent routes to `financial_advisor_node` which summarizes data from `pattern_service` into a concise, grounded answer.


## 7) Debugging and tracing

- `execution_path` (agent output):
  - Tells you exactly which nodes ran, in order. Use it to debug mis-routings.

- Where numbers come from:
  - Always from `pattern_service.get_weekly_spending(db)`. If the AI says something weird, check the analytics function first.

- Memory issues:
  - If Qdrant/mem0 is down, the app still works (lazy init). Memory calls may fail silently or be skipped; responses should still be grounded in DB.

- Common errors:
  - Missing `OPENAI_API_KEY`.
  - SQLite locked if multiple writers (rare in dev).
  - CORS: left open for dev; in prod lock it down.


## 8) How to talk about this in interviews

Elevator pitch:
- “I built a LangGraph-powered personal finance copilot that can add expenses/splits/dues/goals via chat, and gives weekly insights grounded in the user’s live data. It uses a multi-node agent with conditional routing and optional vector memory. We prioritize live DB stats over memory to avoid stale hallucinations, and every run is explainable via an execution path.”

Key architectural decisions:
- LangGraph stateful graph vs a single prompt (explainability, routing, modularity).
- Ground truth from database analytics; memory is only for personalization/context.
- Tools layer for DB mutations (keeps agent orchestration clean).
- Lazy memory init for resilience in dev/prod.

Trade-offs / future work:
- Web search is stubby now — plan to integrate a proper retriever and citations.
- SQLite → Postgres (Neon) with Alembic for real prod usage.
- Add checkpointing (LangGraph SqliteSaver/Postgres) to resume sessions.
- Ship OCR bills/receipts, QR ingestion, and voice I/O.
- Auth & multi-user isolation.

Metrics you can add later (once measured):
- p95 agent latency on free tier.
- Intent routing accuracy on a small labeled set.
- Auto-parse success rate for receipts (after you ship that feature).


## 9) Local dev, config, and deployment

- Required env:
  - `OPENAI_API_KEY=sk-...`
- Run backend:
  - `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Optional memory:
  - `docker compose up -d` in `backend/` to start Qdrant at `localhost:6333`
- Run frontend:
  - `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` then `npm run dev`

Student-friendly deploy:
- Frontend: Vercel (free)
- Backend: Render (free) — set `OPENAI_API_KEY`
- Memory: Optional (host Qdrant elsewhere or skip it)


## 10) FAQ

Q: What if memory and DB disagree on numbers?
- We intentionally filter memory for stale numerical facts and instruct the model to trust the DB snapshot for facts.

Q: How do you prevent the agent from “doing the wrong thing”?
- The `classify_intent_node` has many examples to improve accuracy.
- `financial_action_node` validates inputs (amount/title present). When vague, we can add clarifying questions.

Q: Can we add new flows easily?
- Yes. Add a node, wire it in `build_agent_graph()` after `classify_intent_node`, and update the conditional router.

Q: Why SQLite in dev?
- Fast startup and zero external dependencies. We plan to move to Neon Postgres with Alembic migrations for production scaling.

Q: How do I quickly prove it works?
- Use `/chat/agent` with messages like “I spent 500 on groceries” and then `GET /expenses/`. Check `execution_path` in the response.


---

If you’re preparing for an interview:
- Skim this walkthrough to recall how the system is layered.
- Practice a 60-second explanation of:
  1) The agent graph + why LangGraph,
  2) Grounding on database analytics vs memory,
  3) A quick “add expense” sequence,
  4) How `execution_path` helps debug and builds trust.
- Bonus: Keep a small curl command ready to demonstrate `/chat/agent` live.