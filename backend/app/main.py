from fastapi import FastAPI
from app.routes import expenses, chat
from app import models, schemas
from app.database import engine
app = FastAPI()
models.Base.metadata.create_all(bind=engine)

app.include_router(expenses.router)
app.include_router(chat.router)

@app.get("/")
def home():
    return {"message": "Backend is running"}