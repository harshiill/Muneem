from fastapi import APIRouter
from app.schemas import ExpenseCreate

router = APIRouter()

expenses = []

@router.post("/expenses")
def add_expense(expense : ExpenseCreate):
    expenses.append(expense)
    return {"message" : "Expense added" , "data" : expense}

@router.get("/expenses")
def get_expenses():
    return expenses