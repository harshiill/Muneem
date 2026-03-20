from sqlalchemy import Column, Integer, String, Float,DateTime
from datetime import datetime

from app.database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    amount = Column(Float)
    category = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    

class UserProfile(Base):
    __tablename__ = "user_profile"

    id = Column(Integer, primary_key=True, index=True)
    monthly_income = Column(Float)
    monthly_saving_capacity = Column(Float)
    

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    target_amount = Column(Float)