from pydantic import BaseModel

class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str
    
class UserProfileCreate(BaseModel):
    monthly_saving_capacity: float
    monthly_income : float