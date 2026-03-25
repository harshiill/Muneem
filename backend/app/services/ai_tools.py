from sqlalchemy.orm import Session
from app.models import Expense, Goal, UserProfile
from datetime import datetime

# 🟢 Add Expense
def add_expense_tool(db: Session, title, amount, category, goal_id=None):
    expense = Expense(
        title=title,
        amount=amount,
        category=category,
        goal_id=goal_id
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    
    return f"Added ₹{amount} to {category}"

# 🟢 Add Goal
def add_goal_tool(db: Session, title, target_amount, deadline, goal_type):
    goal = Goal(
        title=title,
        target_amount=target_amount,
        deadline=datetime.fromisoformat(deadline),
        goal_type=goal_type
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    
    return f"Goal '{title}' created successfully"

# 🟢 Update Profile
def update_profile_tool(db: Session, income, saving_capacity):
    profile = db.query(UserProfile).first()
    
    if profile:
        profile.monthly_income = income
        profile.monthly_saving_capacity = saving_capacity
    else:
        profile = UserProfile(
            monthly_income=income,
            monthly_saving_capacity=saving_capacity
        )
        db.add(profile)
    
    db.commit()
    db.refresh(profile)
    
    return "Profile updated successfully"