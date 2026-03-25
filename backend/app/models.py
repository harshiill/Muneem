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
    created_at = Column(DateTime, default=datetime.utcnow)
    
    goal = relationship("Goal", back_populates="expenses")
    splits = relationship("Split", back_populates="expense", cascade="all, delete-orphan")
    

class Split(Base):
    __tablename__ = "splits"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"))
    person_name = Column(String)  # Name of person to split with
    amount_owed = Column(Float)   # How much they owe you
    settled = Column(String, default="pending")  # pending, settled
    created_at = Column(DateTime, default=datetime.utcnow)
    
    expense = relationship("Expense", back_populates="splits")

    

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


class Due(Base):
    __tablename__ = "dues"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)  # What is the due for (e.g., "Loan to John", "Credit Card Payment")
    amount = Column(Float)
    creditor = Column(String)  # Who the user owes money to
    due_date = Column(DateTime)  # When payment is due
    category = Column(String, default="personal")  # "personal", "loan", "credit_card", "other"
    status = Column(String, default="pending")  # "pending", "paid", "overdue"
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, nullable=True)  # Additional notes about the due