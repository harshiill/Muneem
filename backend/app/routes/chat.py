from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.pattern_service import get_weekly_speedning
from app.services.ai_service import generate_ai_advice, generate_chat_response
from app import models, schemas
from app.schemas import ChatRequest
from app.services.memory_store import save_message, get_memory


router = APIRouter(prefix="/chat", tags=["chat"])


        
@router.post("/")
def chat(query: ChatRequest, db : Session = Depends(get_db)):
    
    user_question = query.message
    user_id = "default_user" # later from auth
    if not user_question:
        return {"error": "Message is required"}
    
    # Save user message to memory
    save_message(user_id, user_question, "user")
    
    
    insights = get_weekly_speedning(db)
    
    history = get_memory(user_id)
    
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
        "history": history
    }
    
    response = generate_chat_response(prompt_data)
    
    save_message(user_id, response, "assistant")
    
    return{
     "question": user_question,
     "answer" : response,
    }