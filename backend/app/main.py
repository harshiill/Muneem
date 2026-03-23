from fastapi import FastAPI
from app.routes import expenses, chat
from app import models, schemas
from app.database import engine
#from app.services.qdrant_memory import init_qdrant
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

app.include_router(expenses.router)
app.include_router(chat.router)

# @app.on_event("startup")
# def startup_event():
#     init_qdrant()
    
@app.get("/")
def home():
    return {"message": "Backend is running"}