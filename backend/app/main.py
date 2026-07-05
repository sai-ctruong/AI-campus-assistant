from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import documents, chat, quiz, explain

app = FastAPI(title="AI Campus Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(quiz.router)
app.include_router(explain.router)

@app.get("/health")
def health():
    return {"status": "ok"}