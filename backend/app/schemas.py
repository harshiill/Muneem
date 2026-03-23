from datetime import datetime
from pydantic import BaseModel

class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str
    goal_id: int | None = None
    
class UserProfileCreate(BaseModel):
    monthly_saving_capacity: float
    monthly_income : float
    
class GoalCreate(BaseModel):
    title: str
    target_amount: float
    deadline: datetime
    goal_type: str  # "saving" or "expense"
    
    
class ChatRequest(BaseModel):
    message: str
    refresh_context: bool = False  # Set to True to ignore memory and use only fresh data