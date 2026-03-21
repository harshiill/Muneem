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
            month_key = f"{key[0]}-{key[1]}"
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

    # 🔹 Insight
    insight = ""
    if top_category:
        insight = f"You spent most on {top_category} this week. Consider reducing spending."

    # 🔹 Profile
    profile = db.query(UserProfile).first()
    monthly_capacity = profile.monthly_saving_capacity if profile else None
    monthly_income = profile.monthly_income if profile else None

    # 🔹 Savings (FIRST calculate this)
    savings = None
    can_save = None

    if monthly_income is not None:
        savings = monthly_income - total

    if monthly_capacity is not None and savings is not None:
        can_save = savings >= monthly_capacity

    savings_insight = ""
    if savings is not None:
        if can_save:
            savings_insight = "You're on track to meet your savings goal."
        else:
            savings_insight = "You may not meet your savings goal."

    # 🔴 Risk Flags
    risk_flags = []

    # Monthly saving risk
    if savings is not None and monthly_capacity is not None:
        if savings < monthly_capacity:
            risk_flags.append("You may not meet your monthly saving goal.")

    # High spending risk (ONLY ONCE)
    if monthly_income and total > 0.7 * monthly_income:
        risk_flags.append("Your spending is very high compared to your income.")

    # 🔹 Goals
    goals = db.query(Goal).all()
    goal_insights = []

    for goal in goals:

        # 🟢 Saving goal
        if goal.goal_type == "saving" and monthly_capacity:
            months_needed = goal.target_amount / monthly_capacity

            months_left = None
            if goal.deadline:
                months_left = (goal.deadline - datetime.utcnow()).days / 30

            goal_insights.append({
                "goal": goal.title,
                "type": "saving",
                "target_amount": goal.target_amount,
                "months_needed": round(months_needed, 1),
                "months_left": round(months_left, 1) if months_left else None
            })

            if months_left and months_needed > months_left:
                risk_flags.append(
                    f"You may not reach '{goal.title}' before its deadline."
                )

        # 🔵 Expense goal
        elif goal.goal_type == "expense":
            goal_expenses = goal.expenses

            spent = sum(e.amount for e in goal_expenses)
            remaining = goal.target_amount - spent

            progress = (spent / goal.target_amount) * 100 if goal.target_amount > 0 else 0

            goal_insights.append({
                "goal": goal.title,
                "type": "expense",
                "target_amount": goal.target_amount,
                "spent": spent,
                "remaining": remaining,
                "progress_percent": round(progress, 1)
            })

            if goal.deadline:
                days_left = (goal.deadline - datetime.utcnow()).days

                if days_left < 10 and progress < 50:
                    risk_flags.append(
                        f"Your goal '{goal.title}' is nearing deadline with low progress."
                    )

    # 🔹 Monthly + Accumulated
    monthly_savings = calculate_monthly_savings(db, monthly_income)
    accumulated_savings = sum(monthly_savings.values()) if monthly_savings else 0

    # 🔹 AI
    ai_advice = generate_ai_advice({
        "total_spending": total,
        "top_category": top_category,
        "monthly_capacity": monthly_capacity,
        "monthly_income": monthly_income,
        "goal_insights": goal_insights,
        "savings_this_period": savings,
        "can_meet_saving_goal": can_save,
        "accumulated_savings": accumulated_savings,
        "risk_flags": risk_flags
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
        "risk_flags": risk_flags,
        "ai_advice": ai_advice
    }