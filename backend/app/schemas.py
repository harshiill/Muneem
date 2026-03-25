from datetime import datetime
from pydantic import BaseModel

class SplitCreate(BaseModel):
    person_name: str
    amount_owed: float
    
class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str
    goal_id: int | None = None
    splits: list[SplitCreate] = []  # Optional list of splits
    
class UserProfileCreate(BaseModel):
    monthly_saving_capacity: float
    monthly_income : float
    
class GoalCreate(BaseModel):
    title: str
    target_amount: float
    deadline: datetime
    goal_type: str  # "saving" or "expense"
    
class DueCreate(BaseModel):
    title: str
    amount: float
    creditor: str
    due_date: datetime
    category: str = "personal"  # "personal", "loan", "credit_card", "other"
    notes: str | None = None

class ChatRequest(BaseModel):
    message: str
    refresh_context: bool = False  # Set to True to ignore memory and use only fresh data