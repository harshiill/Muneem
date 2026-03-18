from sqlalchemy.orm import Session
from app.models import Expense
from datetime import datetime, timedelta
from collections import defaultdict

def get_weekly_speedning(db : Session):
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    
    expenses = db.query(Expense).filter(
        Expense.created_at >= one_week_ago
    ).all()
    
    total = sum(exp.amount for exp in expenses)
    
    category_breakdown = defaultdict(float)
    for exp in expenses:
        category_breakdown[exp.category] += exp.amount

    top_category = None
    if category_breakdown:
        top_category = max(category_breakdown, key = category_breakdown.get)

    
    return {
        "total_spending" : total,
        "transactions" : len(expenses),
        "category_breakdown": dict(category_breakdown),
        "top_category": top_category
    }