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
    new_expense = models.Expense(**expense.dict())
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return new_expense

@router.get("/")
def get_expenses(db: Session = Depends(get_db)):
    return db.query(models.Expense).all()


@router.get("/insights/weekly")
def weekly_insights(db : Session = Depends(get_db)):
    return get_weekly_speedning(db)

@router.post('/profile')
def set_profile(profile : schemas.UserProfileCreate, db : Session = Depends(get_db)):
        existing = db.query(models.UserProfile).first()
        
        if existing:
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