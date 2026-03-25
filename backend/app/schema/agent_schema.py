from pydantic import BaseModel
from typing import Optional, Literal

class AgentAction(BaseModel):
    
    intent_type: Literal[
        "action",
        "advice",
        "question",
        "impossible"
    ]
    
    action: Optional[Literal[
        "add_expense",
        "add_goal",
        "update_profile",
        "none"
    ]] = "none"
    
    title: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    
    target_amount: Optional[float] = None
    deadline: Optional[str] = None
    goal_type: Optional[str] = None
    
    monthly_income: Optional[float] = None
    monthly_saving_capacity: Optional[float] = None