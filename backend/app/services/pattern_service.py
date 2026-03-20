from sqlalchemy.orm import Session
from app.models import Expense, UserProfile, Goal
from datetime import datetime, timedelta
from collections import defaultdict
from app.services.ai_service import generate_ai_advice


# 🔹 Helper: Monthly Savings Calculation
def calculate_monthly_savings(db: Session, monthly_income):
    all_expenses = db.query(Expense).all()

    monthly_expenses = defaultdict(float)

    for exp in all_expenses:
        key = (exp.created_at.year, exp.created_at.month)
        monthly_expenses[key] += exp.amount

    monthly_savings = {}

    for key, spent in monthly_expenses.items():
        if monthly_income is not None:
            month_key = f"{key[0]}-{key[1]}"  # FIX: string key for JSON
            monthly_savings[month_key] = monthly_income - spent

    return monthly_savings


# 🔹 Main Function
def get_weekly_speedning(db: Session):
    one_week_ago = datetime.utcnow() - timedelta(days=7)

    # 🔹 Weekly Expenses
    expenses = db.query(Expense).filter(
        Expense.created_at >= one_week_ago
    ).all()

    total = sum(exp.amount for exp in expenses)

    # 🔹 Category Breakdown
    category_breakdown = defaultdict(float)
    for exp in expenses:
        category_breakdown[exp.category] += exp.amount

    top_category = max(category_breakdown, key=category_breakdown.get) if category_breakdown else None

    # 🔹 Basic Insight
    insight = ""
    if top_category:
        insight = f"You spent most on {top_category} this week. Consider reducing spending in this category."

    # 🔹 User Profile
    profile = db.query(UserProfile).first()
    monthly_capacity = profile.monthly_saving_capacity if profile else None
    monthly_income = profile.monthly_income if profile else None

    # 🔹 Goals
    goals = db.query(Goal).all()
    goal_insights = []

    if monthly_capacity:
        for goal in goals:
            months_needed = goal.target_amount / monthly_capacity if monthly_capacity > 0 else float('inf')

            goal_insights.append({
                "goal": goal.title,
                "target_amount": goal.target_amount,
                "months_needed": round(months_needed, 1)
            })

    # 🔹 Savings (CURRENT WEEK CONTEXT)
    savings = None
    can_save = None

    if monthly_income is not None:
        savings = monthly_income - total

    if monthly_capacity is not None and savings is not None:
        can_save = savings >= monthly_capacity

    savings_insight = ""
    if savings is not None:
        if can_save:
            savings_insight = "You're on track to meet your savings goal this period."
        else:
            savings_insight = "Your current spending may prevent you from meeting your savings goal."

    # 🔹 Monthly + Accumulated (FIXED STRUCTURE)
    monthly_savings = calculate_monthly_savings(db, monthly_income)
    accumulated_savings = sum(monthly_savings.values()) if monthly_savings else 0

    # 🔹 AI Advice
    ai_advice = generate_ai_advice({
        "total_spending": total,
        "top_category": top_category,
        "monthly_capacity": monthly_capacity,
        "monthly_income": monthly_income,
        "goal_insights": goal_insights,
        "savings_this_period": savings,
        "can_meet_saving_goal": can_save,
        "accumulated_savings": accumulated_savings
    })

    return {
        "total_spending": total,
        "transactions": len(expenses),
        "category_breakdown": dict(category_breakdown),
        "top_category": top_category,
        "insight": insight,
        "goal_insights": goal_insights,
        "monthly_savings": monthly_savings,
        "savings_this_period": savings,
        "can_meet_saving_goal": can_save,
        "savings_insight": savings_insight,
        "accumulated_savings": accumulated_savings,
        "ai_advice": ai_advice
    }