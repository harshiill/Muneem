from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app import models, schemas
from app.database import get_db
from app.services.pattern_service import get_weekly_speedning
# create tables

router = APIRouter(prefix="/expenses", tags=["Expenses"])



@router.post("/")
def add_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    new_expense = models.Expense(
        title=expense.title,
        amount=expense.amount,
        category=expense.category,
        goal_id=expense.goal_id
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    
    # Create splits if provided
    if expense.splits:
        for split_data in expense.splits:
            new_split = models.Split(
                expense_id=new_expense.id,
                person_name=split_data.person_name,
                amount_owed=split_data.amount_owed,
                settled="pending"
            )
            db.add(new_split)
        db.commit()
        db.refresh(new_expense)
    
    return new_expense


@router.get("/")
def get_expenses(db: Session = Depends(get_db)):
    return db.query(models.Expense).all()

@router.get("/lent/unsettled")
def get_lent_money(db: Session = Depends(get_db)):
    """Get all unsettled splits (money lent to others)"""
    from sqlalchemy import and_
    unsettled_splits = db.query(models.Split).filter(
        models.Split.settled == "pending"
    ).all()
    
    result = []
    for split in unsettled_splits:
        expense = db.query(models.Expense).filter(models.Expense.id == split.expense_id).first()
        result.append({
            "split_id": split.id,
            "person_name": split.person_name,
            "amount_owed": split.amount_owed,
            "expense_title": expense.title if expense else "Unknown",
            "created_at": split.created_at,
            "settled": split.settled
        })
    
    return result

@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()

    if not expense:
        return {"error": "Expense not found"}

    db.delete(expense)
    db.commit()

    return {"message": "Expense deleted"}

@router.get("/insights/weekly")
def weekly_insights(db : Session = Depends(get_db)):
    return get_weekly_speedning(db)

@router.post('/profile')
def set_profile(profile : schemas.UserProfileCreate, db : Session = Depends(get_db)):
        existing = db.query(models.UserProfile).first()
        
        if existing:
            existing.monthly_income = profile.monthly_income
            existing.monthly_saving_capacity = profile.monthly_saving_capacity
            db.commit()
            db.refresh(existing)
            return existing
        
        new_profile = models.UserProfile(**profile.dict())
        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)
        return new_profile
    

@router.get('/profile')
def get_profile(db : Session = Depends(get_db)):
        return db.query(models.UserProfile).first()

@router.post("/goals")
def add_goal(goal: schemas.GoalCreate, db: Session = Depends(get_db)):
    new_goal = models.Goal(**goal.dict())
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal


@router.get("/goals")
def get_goals(db: Session = Depends(get_db)):
    return db.query(models.Goal).all()

@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()

    if not goal:
        return {"error": "Goal not found"}

    db.delete(goal)
    db.commit()

    return {"message": "Goal deleted"}


# ============== DUES ENDPOINTS ==============

@router.post("/dues")
def add_due(due: schemas.DueCreate, db: Session = Depends(get_db)):
    new_due = models.Due(**due.dict())
    db.add(new_due)
    db.commit()
    db.refresh(new_due)
    return new_due


@router.get("/dues")
def get_dues(db: Session = Depends(get_db)):
    return db.query(models.Due).all()


@router.get("/dues/{due_id}")
def get_due(due_id: int, db: Session = Depends(get_db)):
    due = db.query(models.Due).filter(models.Due.id == due_id).first()
    
    if not due:
        return {"error": "Due not found"}
    
    return due


@router.delete("/dues/{due_id}")
def delete_due(due_id: int, db: Session = Depends(get_db)):
    due = db.query(models.Due).filter(models.Due.id == due_id).first()

    if not due:
        return {"error": "Due not found"}

    db.delete(due)
    db.commit()

    return {"message": "Due deleted"}


@router.patch("/dues/{due_id}/status")
def update_due_status(due_id: int, status: str, db: Session = Depends(get_db)):
    due = db.query(models.Due).filter(models.Due.id == due_id).first()

    if not due:
        return {"error": "Due not found"}
    
    if status not in ["pending", "paid", "overdue"]:
        return {"error": "Invalid status. Must be 'pending', 'paid', or 'overdue'"}

    due.status = status
    db.commit()
    db.refresh(due)

    return due


# ============== SPLITS ENDPOINTS ==============

@router.post("/splits")
def add_split(split: schemas.SplitCreate, expense_id: int, db: Session = Depends(get_db)):
    """Add a split to an existing expense (for Splitwise-like feature)"""
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    
    if not expense:
        return {"error": "Expense not found"}
    
    new_split = models.Split(
        expense_id=expense_id,
        person_name=split.person_name,
        amount_owed=split.amount_owed,
        settled="pending"
    )
    db.add(new_split)
    db.commit()
    db.refresh(new_split)
    return new_split


@router.get("/splits/{expense_id}")
def get_splits(expense_id: int, db: Session = Depends(get_db)):
    """Get all splits for an expense"""
    splits = db.query(models.Split).filter(models.Split.expense_id == expense_id).all()
    
    if not splits:
        return {"message": "No splits for this expense"}
    
    return splits


@router.patch("/splits/{split_id}/settle")
def mark_split_settled(split_id: int, db: Session = Depends(get_db)):
    """Mark a split as settled (person paid their share)"""
    split = db.query(models.Split).filter(models.Split.id == split_id).first()
    
    if not split:
        return {"error": "Split not found"}
    
    split.settled = "settled"
    db.commit()
    db.refresh(split)
    return split


@router.delete("/splits/{split_id}")
def delete_split(split_id: int, db: Session = Depends(get_db)):
    """Remove a split from an expense"""
    split = db.query(models.Split).filter(models.Split.id == split_id).first()
    
    if not split:
        return {"error": "Split not found"}
    
    db.delete(split)
    db.commit()
    return {"message": "Split deleted"}