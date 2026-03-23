from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.pattern_service import get_weekly_speedning
from app.services.ai_service import generate_ai_advice, generate_chat_response
from app import models, schemas
from app.schemas import ChatRequest
# from app.services.memory_store import save_message, get_memory
# from app.services.vector_memory import add_to_memory, search_memory as local_search
# from app.services.qdrant_memory import add_memory, search_memory as qdrant_search
from app.services.memory_service import mem_client

router = APIRouter(prefix="/chat", tags=["chat"])


        
@router.post("/")
def chat(query: ChatRequest, db : Session = Depends(get_db)):
    
    user_question = query.message
    refresh_context = query.refresh_context  # If True, ignore memory and use only fresh data
    user_id = "default_user" # later from auth
    if not user_question:
        return {"error": "Message is required"}
    
    # Fetch fresh data from database
    insights = get_weekly_speedning(db)
    
    # Get memory context - but filter out old factual data
    if refresh_context:
        # Force empty memory when user explicitly asks for context refresh
        memory_context = []
    else:
        memories = mem_client.search(
            user_id = user_id,
            query = user_question,
        )
        
        memory_context = []
        for mem in memories.get("results", []):
            mem_text = mem.get("memory", "")
            # Skip memory items that contain old financial facts (goals, income, expenses)
            # This prevents old data from conflicting with fresh data from the database
            skip_keywords = ['saving goal', 'expense goal', 'total spending', 'monthly income', 'monthly saving', 'goal progress', 'birthday party', 'goa trip']
            if mem_text and not any(keyword.lower() in mem_text.lower() for keyword in skip_keywords):
                memory_context.append(mem_text)
    
    prompt_data = {
        "user_question": user_question,
        "total_spending": insights.get("total_spending", 0),
        "top_category": insights.get("top_category"),
        "monthly_capacity": insights.get("monthly_capacity") or 0,
        "monthly_income": insights.get("monthly_income") or 0,
        "goal_insights": insights.get("goal_insights", []),
        "savings_this_period": insights.get("savings_this_period") or 0,
        "can_meet_saving_goal": insights.get("can_meet_saving_goal") or False,
        "accumulated_savings": insights.get("accumulated_savings") or 0,
        "risk_flags": insights.get("risk_flags", []),
       # "relevant_history": relevant_history_qdrant,
        "memory_context": memory_context
    }
    
    response = generate_chat_response(prompt_data)
    
    #save_message(user_id, response, "assistant")
   # add_to_memory(response)
    #add_memory(response)
    mem_client.add(
        user_id = user_id,
        messages = [
            {"role": "user", "content": user_question},
            {"role": "assistant", "content": response}
        ]
    )
    
    return{
     "question": user_question,
     "answer" : response,
    }
    
    
