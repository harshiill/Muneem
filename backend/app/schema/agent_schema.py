from pydantic import BaseModel
from typing import Optional, Literal, List

class SplitInfo(BaseModel):
    """Info about an expense split with another person"""
    person_name: str
    amount_owed: float

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
        "add_due",
        "delete_expense",
        "delete_goal",
        "delete_due",
        "add_expense_to_goal",
        "update_profile",
        "update_due_status",
        "none"
    ]] = "none"
    
    # Expense fields
    title: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    goal_id: Optional[int] = None
    goal_name: Optional[str] = None  # NEW: Goal name extracted from user input (not ID)
    needs_goal_confirmation: Optional[bool] = False  # NEW: Ask user to confirm which goal
    splits: Optional[List[SplitInfo]] = []  # NEW: List of people sharing this expense
    
    # Goal fields
    target_amount: Optional[float] = None
    deadline: Optional[str] = None
    goal_type: Optional[str] = None
    
    # Due fields
    creditor: Optional[str] = None
    due_date: Optional[str] = None
    due_category: Optional[str] = None
    due_id: Optional[int] = None
    expense_id: Optional[int] = None
    
    # Profile fields
    monthly_income: Optional[float] = None
    monthly_saving_capacity: Optional[float] = None
    
    # Status update field
    status: Optional[str] = None