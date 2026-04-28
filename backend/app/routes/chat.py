import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.schemas import ChatRequest
from app.services.ai_service import (
    client,
    detect_user_intent,
    generate_chat_response,
    generate_clarifying_questions,
)
from app.services.ai_tools import (
    add_due_tool,
    add_expense_tool,
    add_goal_tool,
    delete_due_tool,
    delete_expense_tool,
    delete_goal_tool,
    update_profile_tool,
)
from app.services.langgraph_agent import run_agent
from app.services.memory_service import mem_client
from app.services.pattern_service import get_weekly_spending

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/")
def chat(query: ChatRequest, db: Session = Depends(get_db)):

    user_question = query.message
    refresh_context = query.refresh_context
    user_id = "default_user"  # later from auth

    if not user_question:
        return {"error": "Message is required"}

    # Fetch fresh data from database
    insights = get_weekly_spending(db)

    # Get memory context - but filter out old factual data
    if refresh_context:
        memory_context = []
    else:
        try:
            memories = mem_client.search(filters={"user_id": user_id}, query=user_question, limit=5)

            memory_context = []
            if memories and memories.get("results"):
                for mem in memories.get("results", []):
                    mem_text = mem.get("memory", "")
                    skip_keywords = [
                        "saving goal",
                        "expense goal",
                        "total spending",
                        "monthly income",
                        "monthly saving",
                        "goal progress",
                        "birthday party",
                        "goa trip",
                    ]
                    if mem_text and not any(
                        keyword.lower() in mem_text.lower() for keyword in skip_keywords
                    ):
                        memory_context.append(mem_text)
        except Exception as e:
            print(f"Memory search error: {e}")
            memory_context = []

    # Prepare data for AI
    prompt_data = {
        "user_question": user_question,
        "total_spending": insights.get("total_spending", 0),
        "top_category": insights.get("top_category"),
        "monthly_capacity": insights.get("monthly_capacity") or 0,
        "monthly_income": insights.get("monthly_income") or 0,
        "goal_insights": insights.get("goal_insights", []),
        "due_insights": insights.get("due_insights", []),
        "savings_this_period": insights.get("savings_this_period") or 0,
        "can_meet_saving_goal": insights.get("can_meet_saving_goal") or False,
        "accumulated_savings": insights.get("accumulated_savings") or 0,
        "risk_flags": insights.get("risk_flags", []),
        "memory_context": memory_context,
        "total_pending_dues": insights.get("total_pending_dues", 0),
        "total_overdue": insights.get("total_overdue", 0),
    }

    # Detect user intent
    result = detect_user_intent(user_question)

    # Handle impossible requests
    if result.intent_type == "impossible":
        response = (
            "That doesn't seem realistic right now. Let's focus on achievable goals 😊"
        )
        mem_client.add(
            user_id=user_id,
            messages=[
                {"role": "user", "content": user_question},
                {"role": "assistant", "content": response},
            ],
        )
        return {"answer": response}

    # Handle advice/questions - generate smart clarifying questions if needed
    if result.intent_type == "advice" or result.intent_type == "question":
        response = generate_chat_response(prompt_data)

        # Optionally add clarifying questions for vague requests
        if len(user_question.split()) < 5 or "?" in user_question:
            clarifying_qs = generate_clarifying_questions(user_question, prompt_data)
            response = f"{response}\n\n**To help you better:**\n{clarifying_qs}"

        mem_client.add(
            user_id=user_id,
            messages=[
                {"role": "user", "content": user_question},
                {"role": "assistant", "content": response},
            ],
        )
        return {"answer": response}

    # Handle action requests
    if result.intent_type == "action":
        action_result = None

        # ADD EXPENSE
        if result.action == "add_expense":
            try:
                # Validate expense data
                if not result.amount:
                    action_result = "Please specify the amount you spent!"
                elif not result.title:
                    action_result = "Please describe what you spent on!"
                else:
                    # Add the expense first
                    action_result = add_expense_tool(
                        db,
                        result.title or "Expense",
                        result.amount,
                        result.category or "other",
                        None,  # Don't pass goal_id initially
                    )

                    # Get the newly added expense
                    expense = (
                        db.query(models.Expense)
                        .order_by(models.Expense.id.desc())
                        .first()
                    )

                    # Try to add splits if any
                    if expense and result.splits:
                        for split in result.splits:
                            split_record = models.Split(
                                expense_id=expense.id,
                                person_name=split.person_name,
                                amount_owed=split.amount_owed,
                                settled="pending",
                            )
                            db.add(split_record)
                        db.commit()
                        action_result += f"\n\n💰 **Expense Split:**"
                        for split in result.splits:
                            action_result += (
                                f"\n  • {split.person_name}: ₹{split.amount_owed:.0f}"
                            )

                    # Check if goal was mentioned and try to link
                    if result.goal_name and expense:
                        matching_goals = (
                            db.query(models.Goal)
                            .filter(models.Goal.title.ilike(f"%{result.goal_name}%"))
                            .all()
                        )

                        if matching_goals:
                            if len(matching_goals) == 1:
                                # Auto-link to single matching goal
                                expense.goal_id = matching_goals[0].id
                                db.commit()
                                action_result += f"\n\n✅ Expense linked to goal: **{matching_goals[0].title}**"
                            else:
                                # Multiple matches - ask user to select
                                goal_list = "\n".join(
                                    [
                                        f"  • {g.title} (₹{g.target_amount})"
                                        for g in matching_goals
                                    ]
                                )
                                action_result += f"\n\n🎯 **Which goal is this for?**\n{goal_list}\n\nLet me know the goal name!"
                        else:
                            # No matching goal found - show available goals
                            all_goals = db.query(models.Goal).all()
                            if all_goals:
                                goal_list = "\n".join(
                                    [f"  • {g.title}" for g in all_goals]
                                )
                                action_result += f"\n\n📌 No goal matching '{result.goal_name}' found. Your goals:\n{goal_list}"
            except Exception as e:
                print(f"Error adding expense: {e}")
                action_result = f"Error adding expense: {str(e)[:100]}"

        # ADD GOAL
        elif result.action == "add_goal":
            action_result = add_goal_tool(
                db,
                result.title or "Goal",
                result.target_amount,
                result.deadline or "2026-12-31",
                result.goal_type or "saving",
            )

        # ADD DUE (NEW)
        elif result.action == "add_due":
            try:
                # Validate amount is provided
                if not result.amount:
                    action_result = "Please specify how much you owe!"
                elif not result.creditor:
                    action_result = "Please specify who you owe this to!"
                else:
                    action_result = add_due_tool(
                        db,
                        result.title or f"Due to {result.creditor}",
                        result.amount,
                        result.creditor,
                        result.due_date or "2026-12-31",
                        result.due_category or "personal",
                    )
            except Exception as e:
                print(f"Error adding due: {e}")
                action_result = f"Error recording due: {str(e)[:100]}"

        # DELETE EXPENSE (NEW)
        elif result.action == "delete_expense":
            action_result = delete_expense_tool(db, result.expense_id or 0)

        # DELETE GOAL (NEW)
        elif result.action == "delete_goal":
            try:
                # Try to find goal by name if goal_id not provided
                if hasattr(result, "goal_id") and result.goal_id:
                    action_result = delete_goal_tool(db, result.goal_id)
                elif hasattr(result, "goal_name") and result.goal_name:
                    # Find goal by name
                    matching_goal = (
                        db.query(models.Goal)
                        .filter(models.Goal.title.ilike(f"%{result.goal_name}%"))
                        .first()
                    )

                    if matching_goal:
                        action_result = delete_goal_tool(db, matching_goal.id)
                    else:
                        # List available goals
                        all_goals = db.query(models.Goal).all()
                        if all_goals:
                            goal_list = "\n".join([f"  • {g.title}" for g in all_goals])
                            action_result = f"Goal '{result.goal_name}' not found. Your goals:\n{goal_list}"
                        else:
                            action_result = "You have no goals to delete."
                else:
                    action_result = "Please specify which goal to delete!"
            except Exception as e:
                print(f"Error deleting goal: {e}")
                action_result = f"Error deleting goal: {str(e)[:100]}"

        # DELETE DUE (NEW)
        elif result.action == "delete_due":
            try:
                # Try to find due by creditor name if due_id not provided
                if hasattr(result, "due_id") and result.due_id:
                    action_result = delete_due_tool(db, result.due_id)
                elif hasattr(result, "creditor") and result.creditor:
                    # Find due by creditor name
                    matching_due = (
                        db.query(models.Due)
                        .filter(models.Due.creditor.ilike(f"%{result.creditor}%"))
                        .first()
                    )

                    if matching_due:
                        action_result = delete_due_tool(db, matching_due.id)
                    else:
                        # List available dues
                        all_dues = (
                            db.query(models.Due)
                            .filter(models.Due.status == "pending")
                            .all()
                        )
                        if all_dues:
                            due_list = "\n".join(
                                [f"  • ₹{d.amount} to {d.creditor}" for d in all_dues]
                            )
                            action_result = f"Due to '{result.creditor}' not found. Your pending dues:\n{due_list}"
                        else:
                            action_result = "You have no pending dues to delete."
                else:
                    action_result = "Please specify which due to delete!"
            except Exception as e:
                print(f"Error deleting due: {e}")
                action_result = f"Error deleting due: {str(e)[:100]}"

        # UPDATE PROFILE
        elif result.action == "update_profile":
            action_result = update_profile_tool(
                db, result.monthly_income or 0, result.monthly_saving_capacity or 0
            )

        # ADD EXPENSE TO GOAL (NEW)
        elif result.action == "add_expense_to_goal":
            # Link expense to goal
            if result.expense_id and result.goal_id:
                expense = (
                    db.query(models.Expense)
                    .filter(models.Expense.id == result.expense_id)
                    .first()
                )
                if expense:
                    expense.goal_id = result.goal_id
                    db.commit()
                    action_result = f"Expense linked to goal successfully"
                else:
                    action_result = "Expense not found"
            else:
                action_result = "Please specify expense and goal"

        if action_result:
            mem_client.add(
                user_id=user_id,
                messages=[
                    {"role": "user", "content": user_question},
                    {"role": "assistant", "content": action_result},
                ],
            )
            return {"answer": action_result}

    # Default: generate chat response
    response = generate_chat_response(prompt_data)
    mem_client.add(
        user_id=user_id,
        messages=[
            {"role": "user", "content": user_question},
            {"role": "assistant", "content": response},
        ],
    )

    return {
        "question": user_question,
        "answer": response,
    }


# 🔹 NEW: Streaming chat endpoint for real-time responses
@router.post("/stream")
async def chat_stream(query: ChatRequest, db: Session = Depends(get_db)):
    """Stream chat responses in real-time using Server-Sent Events"""

    user_question = query.message
    refresh_context = query.refresh_context
    user_id = "default_user"

    if not user_question:
        return {"error": "Message is required"}

    # Detect intent FIRST with timeout
    try:
        result = detect_user_intent(user_question)
    except Exception as e:
        print(f"Intent detection error: {e}")
        result = None

    # Fetch data only if needed (for non-action intents)
    insights = None
    memory_context = []
    if result and result.intent_type in ["advice", "question"]:
        try:
            insights = get_weekly_spending(db)
            if not refresh_context:
                try:
                    memories = mem_client.search(filters={"user_id": user_id}, query=user_question)
                    for mem in memories.get("results", []):
                        mem_text = mem.get("memory", "")
                        skip_keywords = [
                            "saving goal",
                            "expense goal",
                            "total spending",
                            "monthly income",
                        ]
                        if mem_text and not any(
                            keyword.lower() in mem_text.lower()
                            for keyword in skip_keywords
                        ):
                            memory_context.append(mem_text)
                except Exception as e:
                    print(f"Memory fetch error: {e}")
        except Exception as e:
            print(f"Insights fetch error: {e}")
            insights = {}

    async def generate():
        """Generate streaming response as Server-Sent Events"""
        try:
            if not result:
                yield f"data: {json.dumps({'text': 'Sorry, I encountered an error processing your request.'})}\n\n"
                return

            if result.intent_type == "action" and result.action in [
                "add_expense",
                "add_due",
                "add_goal",
            ]:
                # Quick action response (no streaming needed)
                action_result = "Action recorded successfully"
                if result.action == "add_expense" and result.amount:
                    action_result = add_expense_tool(
                        db,
                        result.title or "Expense",
                        result.amount,
                        result.category or "other",
                        result.goal_id,
                    )
                elif result.action == "add_due" and result.amount and result.creditor:
                    action_result = add_due_tool(
                        db,
                        result.title or f"Due to {result.creditor}",
                        result.amount,
                        result.creditor,
                        result.due_date or "2026-12-31",
                        result.due_category or "personal",
                    )

                yield f"data: {json.dumps({'text': action_result})}\n\n"

            elif result.intent_type == "impossible":
                response = "That doesn't seem realistic right now. Let's focus on achievable goals 😊"
                yield f"data: {json.dumps({'text': response})}\n\n"

            else:
                # Stream the advice/chat response with timeout protection
                try:
                    # Format data like in regular endpoint
                    full_response = ""
                    if insights:
                        prompt_data = {
                            "user_question": user_question,
                            "total_spending": insights.get("total_spending", 0),
                            "top_category": insights.get("top_category"),
                            "monthly_capacity": insights.get("monthly_capacity") or 0,
                            "monthly_income": insights.get("monthly_income") or 0,
                            "goal_insights": insights.get("goal_insights", []),
                            "due_insights": insights.get("due_insights", []),
                            "savings_this_period": insights.get("savings_this_period")
                            or 0,
                            "accumulated_savings": insights.get("accumulated_savings")
                            or 0,
                            "risk_flags": insights.get("risk_flags", []),
                            "memory_context": memory_context,
                        }
                        # Generate response with full data context
                        full_response = generate_chat_response(prompt_data)
                        yield f"data: {json.dumps({'text': full_response})}\n\n"
                    else:
                        # Fallback: basic response without stats
                        stream_response = client.chat.completions.create(
                            model="gpt-4o-mini",
                            messages=[
                                {
                                    "role": "system",
                                    "content": "You are a helpful financial advisor. Answer concisely in 100-200 words.",
                                },
                                {"role": "user", "content": user_question},
                            ],
                            stream=True,
                            temperature=0.7,
                            max_tokens=300,
                            timeout=60,
                        )

                        for chunk in stream_response:
                            if chunk.choices[0].delta.content:
                                text = chunk.choices[0].delta.content
                                full_response += text
                                yield f"data: {json.dumps({'text': text})}\n\n"

                    # Store in memory (async, non-blocking)
                    try:
                        mem_client.add(
                            user_id=user_id,
                            messages=[
                                {"role": "user", "content": user_question},
                                {"role": "assistant", "content": full_response},
                            ],
                        )
                    except:
                        pass  # Memory storage is optional

                except Exception as e:
                    print(f"Stream generation error: {e}")
                    yield f"data: {json.dumps({'text': 'Sorry, the AI response took too long. Please try again.'})}\n\n"
        except Exception as e:
            print(f"Unexpected error in stream generator: {e}")
            yield f"data: {json.dumps({'text': 'An error occurred. Please try again.'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ═══════════════════════════════════════════════════════════════════════════════
# LangGraph Multi-Flow Agent Endpoint
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/agent")
def chat_agent(query: ChatRequest, db: Session = Depends(get_db)):
    """
    LangGraph-powered multi-flow AI financial agent.

    Routes each message through an 8-node graph:
      fetch_memory → classify_intent → [web_search | action | advisor | conversation]
                                     → synthesize → save_memory

    Returns:
      - answer:         Final AI response
      - intent:         Detected flow (web_search | action | advice | conversation)
      - citations:      Source URLs (populated when intent=web_search)
      - execution_path: Ordered list of graph nodes that executed
    """
    user_question = query.message
    user_id = "default_user"  # TODO: replace with auth user_id

    if not user_question:
        return {"error": "Message is required"}

    # ── Fetch live financial snapshot from DB ──────────────────────────────────
    try:
        insights = get_weekly_spending(db)
    except Exception as exc:
        print(f"[/chat/agent] Failed to fetch insights: {exc}")
        insights = {}

    financial_data = {
        "total_spending": insights.get("total_spending", 0),
        "top_category": insights.get("top_category"),
        "monthly_capacity": insights.get("monthly_capacity") or 0,
        "monthly_income": insights.get("monthly_income") or 0,
        "goal_insights": insights.get("goal_insights", []),
        "due_insights": insights.get("due_insights", []),
        "savings_this_period": insights.get("savings_this_period") or 0,
        "can_meet_saving_goal": insights.get("can_meet_saving_goal") or False,
        "accumulated_savings": insights.get("accumulated_savings") or 0,
        "risk_flags": insights.get("risk_flags", []),
        "total_pending_dues": insights.get("total_pending_dues", 0),
        "total_overdue": insights.get("total_overdue", 0),
    }

    # ── Invoke the LangGraph agent ─────────────────────────────────────────────
    result = run_agent(
        user_question=user_question,
        user_id=user_id,
        db=db,
        financial_data=financial_data,
    )

    return result
