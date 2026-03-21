from sqlalchemy import Column, Integer, String, Float,DateTime
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    amount = Column(Float)
    category = Column(String)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)

    goal = relationship("Goal", back_populates="expenses")
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
    deadline = Column(DateTime)
    goal_type = Column(String, default="saving")  # "saving" or "expense"
    
    expenses = relationship("Expense", back_populates="goal")