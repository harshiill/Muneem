"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          LangGraph Multi-Flow AI Financial Agent                             ║
║                                                                              ║
║  Architecture:                                                               ║
║    START → fetch_memory → classify_intent → [conditional routing]            ║
║                                              ├── web_search   (Responses API)║
║                                              ├── action       (DB tools)     ║
║                                              ├── advisor      (analysis)     ║
║                                              └── conversation (general chat) ║
║                                              ↓                               ║
║                                           synthesize → save_memory → END     ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import json
import os
from operator import add as list_add
from typing import Annotated, Any, List, Optional, TypedDict

from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from openai import OpenAI

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ═══════════════════════════════════════════════════════════════════════════════
# GRAPH STATE DEFINITION
# ═══════════════════════════════════════════════════════════════════════════════


class GraphState(TypedDict):
    # ── Inputs ──────────────────────────────────────────────────────────────
    user_question: str
    user_id: str
    db: Any  # SQLAlchemy Session (not serialized)
    financial_data: dict  # Live snapshot from DB analytics

    # ── Processing ──────────────────────────────────────────────────────────
    memory_context: List[str]  # Relevant past conversations
    intent: str  # web_search | action | advice | conversation
    intent_data: dict  # Structured extraction from classifier

    # ── Branch Results ───────────────────────────────────────────────────────
    action_results: List[str]  # Tool execution output
    web_search_result: Optional[str]  # Live web search response
    web_citations: List[dict]  # Source citations from web search
    advisor_response: Optional[str]  # Personalized financial advice

    # ── Output ──────────────────────────────────────────────────────────────
    final_response: str
    error: Optional[str]
    execution_path: Annotated[List[str], list_add]  # Tracks node flow (auto-append)


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 1 — FETCH MEMORY
# Purpose: Retrieve relevant conversation history from mem0 vector store
# ═══════════════════════════════════════════════════════════════════════════════


def fetch_memory_node(state: GraphState) -> dict:
    """Retrieve semantically similar memories for context enrichment."""
    from app.services.memory_service import mem_client

    # Only filter memories that carry stale *numerical* financial facts.
    # Personal facts (name, location, relationships) must NEVER be filtered.
    STALE_KEYWORDS = [
        "total spending",
        "monthly saving capacity",
        "goal progress",
        "accumulated savings",
    ]

    try:
        raw = mem_client.search(
            filters={"user_id": state["user_id"]},
            query=state["user_question"],
            limit=8,  # fetch more so filtering doesn't starve the context
        )

        # mem0 can return either {"results": [...]} or a plain list
        results = []
        if isinstance(raw, dict):
            results = raw.get("results") or raw.get("memories") or []
        elif isinstance(raw, list):
            results = raw

        memory_context: List[str] = []
        for mem in results:
            mem_text = mem.get("memory", "")
            if mem_text and not any(
                kw.lower() in mem_text.lower() for kw in STALE_KEYWORDS
            ):
                memory_context.append(mem_text)

        print(
            f"[fetch_memory] Raw results: {len(results)} | "
            f"After filter: {len(memory_context)} | "
            f"Memories: {memory_context}"
        )
        return {
            "memory_context": memory_context,
            "execution_path": ["fetch_memory"],
        }

    except Exception as exc:
        print(f"[fetch_memory] Error: {exc}")
        return {"memory_context": [], "execution_path": ["fetch_memory"]}


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 2 — CLASSIFY INTENT
# Purpose: Smart LLM-based routing to the correct processing flow
# ═══════════════════════════════════════════════════════════════════════════════


def classify_intent_node(state: GraphState) -> dict:
    """
    Classify the user message into one of four intents:
      - web_search   → needs real-time external financial data
      - action       → CRUD operation on user's financial records
      - advice       → personalized analysis of user's own data
      - conversation → general chat / greetings / personal recall questions
    """
    prompt = f"""
You are an intent classifier for an AI financial assistant named "Muneem".

Classify the user's message into EXACTLY ONE intent:

────────────────────────────────────────────────────
1. web_search  — Needs real-time / external information:
   • Stock prices, mutual fund NAV, crypto rates
   • SIP, FD, PPF, NPS, ELSS investment options
   • RBI policies, inflation, repo rate, tax slabs
   • "Best mutual funds 2024", "Current gold price"
   • "How does SIP work?", "What is ELSS?"
   • General financial concepts needing current data

2. action  — CRUD operations on user's financial data:
   • Adding expenses:  "I spent X on Y", "Bought groceries for 500"
   • Adding goals:     "Save 50000 for Goa trip"
   • Adding dues:      "I owe 3000 to Rahul", "Credit card due"
   • Update income:    "My salary is 60000"
   • Delete records:   "Delete my trip goal", "Remove the due"
   • Bill splits (USER PAID, others owe me): use action_type "add_expense" + splits array
     Examples: "Dinner 1200 with Priya and Ayush", "Lunch 600 split 3 ways"
     Also: "I paid for Rahul at lunch 400" → add_expense, splits=[{{person_name:Rahul, amount_owed:400}}]
     Also: "I covered Priya's share" → add_expense, splits=[{{person_name:Priya, amount_owed:<amount>}}]
     Key signal: "I" is the grammatical subject who paid / "with X and Y" / "split with"
   • Paid on behalf (SOMEONE ELSE PAID for user): use action_type "add_expense_and_due"
     ONLY when ANOTHER PERSON is the grammatical subject who paid:
     - "Shaunak paid 500 on my behalf" ✓
     - "Rahul covered my share" ✓
     - "X paid on behalf of mine" ✓
     - "X paid for my lunch" ✓ (X = another person, not "I paid")
     RULE: creditor MUST be explicitly named. If creditor is null/unknown → use "add_expense" instead.
     NEVER use "add_expense_and_due" for "Dinner with X and Y" — that is a normal split.

   ⚠️  CRITICAL GRAMMAR RULE — read carefully:
     WHO IS THE GRAMMATICAL SUBJECT?
     ┌─────────────────────────────────────────────────────────────────────────┐
     │ Subject = "I" / "I paid" / "I covered"  →  add_expense  (X owes ME)   │
     │   "I paid for Rahul"  →  add_expense, splits=[Rahul]                   │
     │   "I covered Priya"   →  add_expense, splits=[Priya]                   │
     │   "I treated Ayush"   →  add_expense, splits=[Ayush]                   │
     ├─────────────────────────────────────────────────────────────────────────┤
     │ Subject = other person  →  add_expense_and_due  (I owe THEM)           │
     │   "Rahul paid for me"          →  add_expense_and_due, creditor=Rahul  │
     │   "Shaunak paid on my behalf"  →  add_expense_and_due, creditor=Shaunak│
     │   "Priya covered my share"     →  add_expense_and_due, creditor=Priya  │
     └─────────────────────────────────────────────────────────────────────────┘
     If the sentence starts with "I paid / I covered / I treated" → ALWAYS add_expense + splits.
     If the sentence starts with "[PersonName] paid / covered / treated" → add_expense_and_due.

3. advice  — Personalized advice using user's own financial data:
   • "Can I afford a MacBook?"
   • "Am I saving enough this month?"
   • "Should I go on a trip to Goa?"
   • "How are my finances?"
   • "Can I take a loan?"
   • "What's my spending pattern?"

4. conversation  — General chat AND personal recall questions:
   • Greetings: "Hello", "Hi", "Thanks", "What can you do?"
   • Non-financial small talk
   • Personal recall: "What is my name?", "Where do I live?",
     "What is my girlfriend's name?", "Do you remember me?"
   • Any question about the user's personal identity or preferences
────────────────────────────────────────────────────

Return ONLY a valid JSON object. No markdown, no code fences, no extra text.

Schema:
{{
  "intent": "web_search | action | advice | conversation",
  "reason": "<one-line reason>",
  "action_type": "add_expense | add_expense_and_due | add_goal | add_due | update_profile | delete_expense | delete_goal | delete_due | none",
  "amount": <number or null>,
  "title": "<string or null>",
  "category": "<string or null>",
  "target_amount": <number or null>,
  "deadline": "<YYYY-MM-DD or null>",
  "goal_type": "<saving | expense | null>",
  "creditor": "<string or null>",
  "due_date": "<YYYY-MM-DD or null>",
  "due_category": "<personal | loan | credit_card | other | null>",
  "monthly_income": <number or null>,
  "monthly_saving_capacity": <number or null>,
  "goal_name": "<string or null>",
  "expense_id": <number or null>,
  "goal_id": <number or null>,
  "due_id": <number or null>,
  "splits": [{{"person_name": "<name>", "amount_owed": <number>}}]
}}

User Message: "{state["user_question"]}"
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Return ONLY valid JSON. No markdown, no code blocks.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0,
        )

        raw = response.choices[0].message.content.strip()

        # Strip markdown fences if the model disobeyed instructions
        if "```" in raw:
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        data = json.loads(raw)
        intent = data.get("intent", "advice")

        print(f"[classify_intent] Intent={intent} | Reason={data.get('reason', '')}")
        return {
            "intent": intent,
            "intent_data": data,
            "execution_path": ["classify_intent"],
        }

    except (json.JSONDecodeError, Exception) as exc:
        print(f"[classify_intent] Error: {exc}")
        return {
            "intent": "advice",
            "intent_data": {},
            "execution_path": ["classify_intent"],
        }


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 3 — WEB SEARCH
# Purpose: Real-time financial info via OpenAI Responses API (web_search_preview)
#          Falls back to gpt-4o-search-preview → gpt-4o-mini on failure
# ═══════════════════════════════════════════════════════════════════════════════


def web_search_node(state: GraphState) -> dict:
    """
    Fetch live financial data using OpenAI's web search capability.

    Fallback chain:
      1. Responses API  (client.responses.create + web_search_preview tool)
      2. gpt-4o-search-preview via chat.completions
      3. gpt-4o-mini  (no live search — knowledge cutoff)
    """
    fin = state.get("financial_data", {})

    enriched_query = (
        f"User Financial Context:\n"
        f"  - Monthly Income: ₹{fin.get('monthly_income', 'Not set')}\n"
        f"  - Monthly Savings Capacity: ₹{fin.get('monthly_capacity', 'Not set')}\n"
        f"  - Current Period Savings: ₹{fin.get('savings_this_period', 0)}\n\n"
        f"User Question: {state['user_question']}\n\n"
        f"Provide accurate, up-to-date financial information. "
        f"Include specific numbers, current rates, and actionable recommendations. "
        f"Relate the answer to the user's financial context where relevant."
    )

    # ── Attempt 1: OpenAI Responses API with web_search_preview ──────────────
    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            tools=[{"type": "web_search_preview"}],
            input=enriched_query,
        )

        result_text: str = response.output_text

        # Extract URL citations from annotated output blocks
        citations: List[dict] = []
        for item in response.output:
            content_blocks = getattr(item, "content", [])
            if not isinstance(content_blocks, list):
                content_blocks = [content_blocks]
            for block in content_blocks:
                annotations = getattr(block, "annotations", [])
                for ann in annotations:
                    if getattr(ann, "type", "") == "url_citation":
                        citations.append(
                            {
                                "url": getattr(ann, "url", ""),
                                "title": getattr(ann, "title", getattr(ann, "url", "")),
                            }
                        )

        print(f"[web_search] Responses API succeeded. Citations: {len(citations)}")
        return {
            "web_search_result": result_text,
            "web_citations": citations,
            "execution_path": ["web_search"],
        }

    except Exception as exc1:
        print(f"[web_search] Responses API failed: {exc1}")

    # ── Attempt 2: gpt-4o-search-preview via chat completions ────────────────
    try:
        response = client.chat.completions.create(
            model="gpt-4o-search-preview",
            messages=[{"role": "user", "content": enriched_query}],
        )
        result_text = response.choices[0].message.content
        print("[web_search] gpt-4o-search-preview fallback succeeded.")
        return {
            "web_search_result": result_text,
            "web_citations": [],
            "execution_path": ["web_search"],
        }

    except Exception as exc2:
        print(f"[web_search] gpt-4o-search-preview failed: {exc2}")

    # ── Attempt 3: Standard gpt-4o-mini (no live search) ─────────────────────
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a knowledgeable financial advisor. "
                        "Provide the best answer based on your training knowledge. "
                        "Note: Real-time data may not be available."
                    ),
                },
                {"role": "user", "content": state["user_question"]},
            ],
        )
        result_text = response.choices[0].message.content
        print("[web_search] Standard completion fallback succeeded.")
        return {
            "web_search_result": result_text,
            "web_citations": [],
            "execution_path": ["web_search"],
        }

    except Exception as exc3:
        print(f"[web_search] All attempts failed: {exc3}")
        return {
            "web_search_result": None,
            "web_citations": [],
            "error": str(exc3),
            "execution_path": ["web_search"],
        }


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 4 — FINANCIAL ACTION
# Purpose: Execute CRUD operations on the user's financial database
# ═══════════════════════════════════════════════════════════════════════════════


def financial_action_node(state: GraphState) -> dict:
    """Execute financial tool calls: add/delete expenses, goals, dues, update profile."""
    from app import models
    from app.services.ai_tools import (
        add_due_tool,
        add_expense_tool,
        add_goal_tool,
        delete_due_tool,
        delete_expense_tool,
        delete_goal_tool,
        update_profile_tool,
    )

    db = state["db"]
    data = state.get("intent_data", {})
    action = data.get("action_type", "none")
    results: List[str] = []

    print(f"[financial_action] Executing action: {action}")

    try:
        # ── ADD EXPENSE ───────────────────────────────────────────────────────
        if action == "add_expense":
            amount = data.get("amount")
            title = data.get("title") or "Expense"
            category = data.get("category") or "Other"

            if not amount:
                results.append("❓ Please specify the amount you spent!")
            else:
                result = add_expense_tool(db, title, float(amount), category)
                results.append(f"✅ {result}")

                # Handle bill splits
                splits = data.get("splits") or []
                if splits:
                    expense = (
                        db.query(models.Expense)
                        .order_by(models.Expense.id.desc())
                        .first()
                    )
                    if expense:
                        for split in splits:
                            db.add(
                                models.Split(
                                    expense_id=expense.id,
                                    person_name=split.get("person_name", "Unknown"),
                                    amount_owed=float(split.get("amount_owed", 0)),
                                    settled="pending",
                                )
                            )
                        db.commit()
                        split_lines = "\n".join(
                            f"  • {s.get('person_name')}: ₹{float(s.get('amount_owed', 0)):.0f}"
                            for s in splits
                        )
                        results.append(f"\n💰 **Split Details:**\n{split_lines}")

                # Handle goal linking
                goal_name = data.get("goal_name")
                if goal_name:
                    expense = (
                        db.query(models.Expense)
                        .order_by(models.Expense.id.desc())
                        .first()
                    )
                    matching = (
                        db.query(models.Goal)
                        .filter(models.Goal.title.ilike(f"%{goal_name}%"))
                        .all()
                    )
                    if matching and expense:
                        expense.goal_id = matching[0].id
                        db.commit()
                        results.append(f"🎯 Linked to goal: **{matching[0].title}**")

        # ── ADD EXPENSE + DUE (someone paid on behalf of user) ───────────────
        elif action == "add_expense_and_due":
            amount = data.get("amount")
            title = data.get("title") or "Expense"
            category = data.get("category") or "Food"
            creditor = data.get("creditor")

            if not amount:
                results.append("❓ Please specify the amount!")
            elif not creditor:
                results.append("❓ Please specify who paid on your behalf!")
            else:
                # Step 1: Record the expense
                exp_result = add_expense_tool(db, title, float(amount), category)
                results.append(f"✅ {exp_result}")

                # Step 2: Create a due (user owes creditor)
                due_result = add_due_tool(
                    db,
                    data.get("title") or f"{creditor} paid for {title}",
                    float(amount),
                    creditor,
                    data.get("due_date") or "2026-12-31",
                    data.get("due_category") or "personal",
                )
                results.append(f"📋 Due recorded: {due_result}")
                results.append(
                    f"\n💡 **{creditor}** paid ₹{float(amount):.0f} on your behalf.\n"
                    f"This has been added as an expense and a due — you owe **{creditor}** ₹{float(amount):.0f}."
                )

        # ── ADD GOAL ──────────────────────────────────────────────────────────
        elif action == "add_goal":
            target = data.get("target_amount")
            if not target:
                results.append("❓ Please specify the target amount for your goal!")
            else:
                result = add_goal_tool(
                    db,
                    data.get("title") or "Goal",
                    float(target),
                    data.get("deadline") or "2026-12-31",
                    data.get("goal_type") or "saving",
                )
                results.append(f"🎯 {result}")

        # ── ADD DUE ───────────────────────────────────────────────────────────
        elif action == "add_due":
            amount = data.get("amount")
            creditor = data.get("creditor")
            if not amount or not creditor:
                results.append("❓ Please specify the amount and who you owe it to!")
            else:
                result = add_due_tool(
                    db,
                    data.get("title") or f"Due to {creditor}",
                    float(amount),
                    creditor,
                    data.get("due_date") or "2026-12-31",
                    data.get("due_category") or "personal",
                )
                results.append(result)

        # ── UPDATE PROFILE ────────────────────────────────────────────────────
        elif action == "update_profile":
            income = data.get("monthly_income") or 0
            capacity = data.get("monthly_saving_capacity") or 0
            if not income:
                results.append("❓ Please specify your monthly income!")
            else:
                result = update_profile_tool(db, float(income), float(capacity))
                results.append(f"📊 {result}")

        # ── DELETE EXPENSE ────────────────────────────────────────────────────
        elif action == "delete_expense":
            expense_id = data.get("expense_id")
            if expense_id:
                result = delete_expense_tool(db, int(expense_id))
                results.append(f"🗑️ {result}")
            else:
                # Try to find by title
                title = data.get("title")
                if title:
                    expense = (
                        db.query(models.Expense)
                        .filter(models.Expense.title.ilike(f"%{title}%"))
                        .first()
                    )
                    if expense:
                        result = delete_expense_tool(db, expense.id)
                        results.append(f"🗑️ {result}")
                    else:
                        recent = (
                            db.query(models.Expense)
                            .order_by(models.Expense.id.desc())
                            .limit(5)
                            .all()
                        )
                        expense_list = "\n".join(
                            f"  [{e.id}] {e.title} — ₹{e.amount}" for e in recent
                        )
                        results.append(
                            f"❓ Expense '{title}' not found.\n\nRecent expenses:\n{expense_list}"
                        )
                else:
                    results.append(
                        "❓ Please specify which expense to delete (name or ID)."
                    )

        # ── DELETE GOAL ───────────────────────────────────────────────────────
        elif action == "delete_goal":
            goal_id = data.get("goal_id")
            goal_name = data.get("goal_name")

            if goal_id:
                result = delete_goal_tool(db, int(goal_id))
                results.append(f"🗑️ {result}")
            elif goal_name:
                goal = (
                    db.query(models.Goal)
                    .filter(models.Goal.title.ilike(f"%{goal_name}%"))
                    .first()
                )
                if goal:
                    result = delete_goal_tool(db, goal.id)
                    results.append(f"🗑️ {result}")
                else:
                    all_goals = db.query(models.Goal).all()
                    if all_goals:
                        goal_list = "\n".join(f"  • {g.title}" for g in all_goals)
                        results.append(
                            f"❓ Goal '{goal_name}' not found.\n\nYour goals:\n{goal_list}"
                        )
                    else:
                        results.append("You have no active goals to delete.")
            else:
                results.append("❓ Please specify which goal to delete.")

        # ── DELETE DUE ────────────────────────────────────────────────────────
        elif action == "delete_due":
            due_id = data.get("due_id")
            creditor = data.get("creditor")

            if due_id:
                result = delete_due_tool(db, int(due_id))
                results.append(f"🗑️ {result}")
            elif creditor:
                due = (
                    db.query(models.Due)
                    .filter(models.Due.creditor.ilike(f"%{creditor}%"))
                    .first()
                )
                if due:
                    result = delete_due_tool(db, due.id)
                    results.append(f"🗑️ {result}")
                else:
                    pending = (
                        db.query(models.Due)
                        .filter(models.Due.status == "pending")
                        .all()
                    )
                    if pending:
                        due_list = "\n".join(
                            f"  • ₹{d.amount} → {d.creditor}" for d in pending
                        )
                        results.append(
                            f"❓ No due found for '{creditor}'.\n\nPending dues:\n{due_list}"
                        )
                    else:
                        results.append("You have no pending dues.")
            else:
                results.append("❓ Please specify which due to delete.")

        # ── UNKNOWN ACTION ────────────────────────────────────────────────────
        else:
            results.append(
                "I couldn't identify a specific action. Could you please rephrase?"
            )

    except Exception as exc:
        print(f"[financial_action] Error: {exc}")
        results.append(f"⚠️ Error performing action: {str(exc)[:120]}")

    return {"action_results": results, "execution_path": ["financial_action"]}


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 5 — FINANCIAL ADVISOR
# Purpose: Generate personalized financial advice using user's live DB data
# ═══════════════════════════════════════════════════════════════════════════════


def financial_advisor_node(state: GraphState) -> dict:
    """Produce personalized financial analysis using the user's real-time data."""
    from app.services.ai_service import generate_chat_response

    print("[financial_advisor] Generating personalized advice...")

    try:
        response = generate_chat_response(
            {
                **state["financial_data"],
                "user_question": state["user_question"],
                "memory_context": state.get("memory_context", []),
            }
        )
        return {
            "advisor_response": response,
            "execution_path": ["financial_advisor"],
        }

    except Exception as exc:
        print(f"[financial_advisor] Error: {exc}")
        return {
            "advisor_response": (
                "I encountered an issue analyzing your finances. Please try again."
            ),
            "error": str(exc),
            "execution_path": ["financial_advisor"],
        }


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 6 — CONVERSATION
# Purpose: Handle general chat, greetings, and non-financial queries
# ═══════════════════════════════════════════════════════════════════════════════


def conversation_node(state: GraphState) -> dict:
    """
    Handle general conversation — always injecting the user's stored memory
    so that personal questions (name, location, relationships, preferences)
    are answered correctly from Qdrant/mem0, not hallucinated.
    """
    memory_context = state.get("memory_context", [])
    print(
        f"[conversation] Handling chat. Memory available: {len(memory_context)} facts."
    )

    messages: List[dict] = []

    # ── System persona ────────────────────────────────────────────────────────
    messages.append(
        {
            "role": "system",
            "content": (
                "You are Muneem — a friendly, smart AI financial assistant. "
                "Keep responses warm, concise, and helpful. "
                "You have access to stored personal facts about this user (see below). "
                "When the user asks about themselves — their name, location, relationships, "
                "preferences, or any personal detail — answer DIRECTLY and CONFIDENTLY "
                "using the stored facts. Never say you don't have access to personal info "
                "if the fact is present in the stored information."
            ),
        }
    )

    # ── Inject memory context ─────────────────────────────────────────────────
    if memory_context:
        memory_block = "\n".join(f"• {m}" for m in memory_context)
        messages.append(
            {
                "role": "system",
                "content": (
                    f"Stored facts about this user (retrieved from long-term memory):\n"
                    f"{memory_block}\n\n"
                    "Use these facts to answer any personal questions the user asks. "
                    "If a fact directly answers the question, state it clearly."
                ),
            }
        )
    else:
        # No memory yet — guide the user gently
        messages.append(
            {
                "role": "system",
                "content": (
                    "No personal facts are stored yet for this user. "
                    "If they ask something personal you don't know, politely say so "
                    "and offer to help with financial tasks instead."
                ),
            }
        )

    messages.append({"role": "user", "content": state["user_question"]})

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.7,
        )
        return {
            "advisor_response": response.choices[0].message.content,
            "execution_path": ["conversation"],
        }

    except Exception as exc:
        print(f"[conversation] Error: {exc}")
        return {
            "advisor_response": (
                "Hello! I'm Muneem, your AI financial friend. "
                "Ask me to track expenses, manage goals, or give you financial advice!"
            ),
            "execution_path": ["conversation"],
        }


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 7 — SYNTHESIZE
# Purpose: Combine branch results into a clean, formatted final response
# ═══════════════════════════════════════════════════════════════════════════════


def synthesize_node(state: GraphState) -> dict:
    """Merge branch outputs into the final user-facing response."""
    intent = state.get("intent", "conversation")
    print(f"[synthesize] Formatting response for intent={intent}")

    # ── Web Search ────────────────────────────────────────────────────────────
    if intent == "web_search":
        result = state.get("web_search_result") or ""
        citations = state.get("web_citations") or []

        if result:
            if citations:
                result += "\n\n---\n**Sources:**\n"
                seen_urls = set()
                for c in citations[:4]:
                    url = c.get("url", "")
                    title = c.get("title") or url
                    if url and url not in seen_urls:
                        result += f"• [{title}]({url})\n"
                        seen_urls.add(url)
            final = result
        else:
            final = (
                "⚠️ I couldn't find live data for that query right now. "
                "Please try rephrasing, or ask me about your personal finances instead."
            )

    # ── Action ────────────────────────────────────────────────────────────────
    elif intent == "action":
        action_results = state.get("action_results") or []
        final = "\n".join(action_results) if action_results else "✅ Action completed."

    # ── Advice / Conversation ─────────────────────────────────────────────────
    else:
        final = (
            state.get("advisor_response")
            or "I'm here to help! What would you like to know about your finances?"
        )

    return {"final_response": final, "execution_path": ["synthesize"]}


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 8 — SAVE MEMORY
# Purpose: Persist the conversation turn to mem0 for future context
# ═══════════════════════════════════════════════════════════════════════════════


def save_memory_node(state: GraphState) -> dict:
    """Store the completed conversation turn in the mem0 vector store."""
    from app.services.memory_service import mem_client

    try:
        mem_client.add(
            user_id=state["user_id"],
            messages=[
                {"role": "user", "content": state["user_question"]},
                {"role": "assistant", "content": state["final_response"]},
            ],
        )
        print(f"[save_memory] Conversation saved for user={state['user_id']}")
    except Exception as exc:
        print(f"[save_memory] Error (non-critical): {exc}")

    return {"execution_path": ["save_memory"]}


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTING FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════


def route_by_intent(state: GraphState) -> str:
    """
    Conditional edge function: maps classified intent → next node name.
    LangGraph uses the returned string to select the outgoing edge.
    """
    routing_map = {
        "web_search": "web_search",
        "action": "financial_action",
        "advice": "financial_advisor",
        "conversation": "conversation",
    }
    intent = state.get("intent", "conversation")
    destination = routing_map.get(intent, "conversation")
    print(f"[router] Intent '{intent}' → node '{destination}'")
    return destination


# ═══════════════════════════════════════════════════════════════════════════════
# GRAPH BUILDER
# ═══════════════════════════════════════════════════════════════════════════════


def build_agent_graph() -> StateGraph:
    """
    Construct and compile the LangGraph StateGraph.

    Node topology:
      START
        └─► fetch_memory
              └─► classify_intent
                    ├─► web_search ─────────────────┐
                    ├─► financial_action ────────────┤
                    ├─► financial_advisor ───────────┤
                    └─► conversation ────────────────┘
                                                    ↓
                                               synthesize
                                                    └─► save_memory
                                                              └─► END
    """
    graph = StateGraph(GraphState)

    # ── Register Nodes ────────────────────────────────────────────────────────
    graph.add_node("fetch_memory", fetch_memory_node)
    graph.add_node("classify_intent", classify_intent_node)
    graph.add_node("web_search", web_search_node)
    graph.add_node("financial_action", financial_action_node)
    graph.add_node("financial_advisor", financial_advisor_node)
    graph.add_node("conversation", conversation_node)
    graph.add_node("synthesize", synthesize_node)
    graph.add_node("save_memory", save_memory_node)

    # ── Entry Edges ───────────────────────────────────────────────────────────
    graph.add_edge(START, "fetch_memory")
    graph.add_edge("fetch_memory", "classify_intent")

    # ── Conditional Routing ───────────────────────────────────────────────────
    graph.add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "web_search": "web_search",
            "financial_action": "financial_action",
            "financial_advisor": "financial_advisor",
            "conversation": "conversation",
        },
    )

    # ── Branch Convergence ────────────────────────────────────────────────────
    for branch_node in [
        "web_search",
        "financial_action",
        "financial_advisor",
        "conversation",
    ]:
        graph.add_edge(branch_node, "synthesize")

    # ── Output Edges ──────────────────────────────────────────────────────────
    graph.add_edge("synthesize", "save_memory")
    graph.add_edge("save_memory", END)

    compiled = graph.compile()
    print("[LangGraph] Agent graph compiled successfully.")
    return compiled


# Compile once at module import (singleton pattern)
agent_graph = build_agent_graph()


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════


def run_agent(
    user_question: str,
    user_id: str,
    db: Any,
    financial_data: dict,
) -> dict:
    """
    Invoke the full LangGraph agent pipeline.

    Args:
        user_question:  Raw message from the user.
        user_id:        Unique identifier for memory isolation.
        db:             Active SQLAlchemy database session.
        financial_data: Pre-fetched financial snapshot from DB analytics.

    Returns:
        {
            "answer":         str   — Final formatted response,
            "intent":         str   — Detected flow (web_search|action|advice|conversation),
            "citations":      list  — Source URLs (populated for web_search intent),
            "execution_path": list  — Ordered list of nodes that ran,
            "error":          str?  — Error message if something went wrong,
        }
    """
    initial_state: GraphState = {
        # Inputs
        "user_question": user_question,
        "user_id": user_id,
        "db": db,
        "financial_data": financial_data,
        # Processing (initialized empty)
        "memory_context": [],
        "intent": "",
        "intent_data": {},
        # Branch results (initialized empty)
        "action_results": [],
        "web_search_result": None,
        "web_citations": [],
        "advisor_response": None,
        # Output
        "final_response": "",
        "error": None,
        "execution_path": [],
    }

    print(f"\n{'═' * 60}")
    print(f"[LangGraph Agent] Processing: '{user_question[:80]}'")
    print(f"{'═' * 60}")

    result_state = agent_graph.invoke(initial_state)

    path = result_state.get("execution_path", [])
    print(f"[LangGraph Agent] Execution path: {' → '.join(path)}")
    print(f"{'═' * 60}\n")

    return {
        "answer": result_state.get("final_response", ""),
        "intent": result_state.get("intent", "unknown"),
        "citations": result_state.get("web_citations", []),
        "execution_path": path,
        "error": result_state.get("error"),
    }
