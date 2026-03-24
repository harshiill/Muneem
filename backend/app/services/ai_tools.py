from sqlalchemy.orm import Session
from app.models import Expense, Goal, UserProfile
from datetime import datetime

# 🟢 Add Expense
def add_expense_tool(db: Session, data: dict):
    expense = Expense(
        title=data["title"],
        amount=data["amount"],
        category=data["category"],
        goal_id=data.get("goal_id"),
        created_at=datetime.utcnow()
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    return f"Added ₹{data['amount']} expense in {data['category']}."


# 🔵 Add Goal
def add_goal_tool(db: Session, data: dict):
    goal = Goal(
        title=data["title"],
        target_amount=data["target_amount"],
        deadline=datetime.fromisoformat(data["deadline"]),
        goal_type=data["goal_type"]
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    return f"Goal '{data['title']}' created successfully."


# 🟣 Update Profile
def update_profile_tool(db: Session, data: dict):
    profile = db.query(UserProfile).first()

    if profile:
        profile.monthly_income = data["monthly_income"]
        profile.monthly_saving_capacity = data["monthly_saving_capacity"]
    else:
        profile = UserProfile(**data)
        db.add(profile)

    db.commit()
    db.refresh(profile)

    return "Profile updated successfully."