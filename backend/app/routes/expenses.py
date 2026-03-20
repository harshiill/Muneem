from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app import models, schemas
from app.services.pattern_service import get_weekly_speedning
# create tables
models.Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/expenses", tags=["Expenses"])

# dependency (DB session)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
            db.commit
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
