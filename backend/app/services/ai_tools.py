from sqlalchemy.orm import Session
from app.models import Expense, Goal, UserProfile, Due
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


# 🟢 Add Due
def add_due_tool(db: Session, title, amount, creditor, due_date, category="personal", notes=None):
    try:
        # Handle date parsing
        if isinstance(due_date, str):
            try:
                # Try ISO format (YYYY-MM-DD)
                parsed_date = datetime.fromisoformat(due_date)
            except (ValueError, TypeError):
                # If date parsing fails, default to 30 days from now
                from datetime import timedelta
                parsed_date = datetime.now() + timedelta(days=30)
                print(f"Date parsing failed for '{due_date}', using default: {parsed_date}")
        else:
            parsed_date = due_date
        
        due = Due(
            title=title,
            amount=amount,
            creditor=creditor,
            due_date=parsed_date,
            category=category,
            notes=notes,
            status="pending"
        )
        db.add(due)
        db.commit()
        db.refresh(due)
        
        return f"✅ Due '{title}' of ₹{amount} to {creditor} recorded successfully! Due: {parsed_date.strftime('%Y-%m-%d')}"
    except Exception as e:
        db.rollback()
        print(f"Error in add_due_tool: {e}")
        raise Exception(f"Failed to add due: {str(e)}")


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


# 🟢 Delete Expense
def delete_expense_tool(db: Session, expense_id: int):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        return f"Expense with id {expense_id} not found"
    
    db.delete(expense)
    db.commit()
    
    return f"Expense '{expense.title}' deleted successfully"


# 🟢 Delete Goal
def delete_goal_tool(db: Session, goal_id: int):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    
    if not goal:
        return f"Goal with id {goal_id} not found"
    
    db.delete(goal)
    db.commit()
    
    return f"Goal '{goal.title}' deleted successfully"


# 🟢 Delete Due
def delete_due_tool(db: Session, due_id: int):
    due = db.query(Due).filter(Due.id == due_id).first()
    
    if not due:
        return f"Due with id {due_id} not found"
    
    db.delete(due)
    db.commit()
    
    return f"Due '{due.title}' deleted successfully"