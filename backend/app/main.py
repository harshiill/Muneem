from fastapi import FastAPI
from app.routes import expenses, chat
from app import models, schema
from app.database import engine
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

frontend_url = os.getenv("FRONTEND_URL")
origins = [frontend_url] if frontend_url else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

app.include_router(expenses.router)
app.include_router(chat.router)

@app.on_event("startup")
def startup_event():
    pass
    
@app.get("/")
def home():
    return {"message": "Backend is running"}