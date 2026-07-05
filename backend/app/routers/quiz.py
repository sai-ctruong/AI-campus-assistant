"""API quiz (Phase 8) + progress tracking (Phase 10)."""
from collections import defaultdict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import document_store, quiz_store
from app.rag.quiz_generator import generate_quiz, QuizQuestion, Flashcard

router = APIRouter(tags=["quiz"])

# ---------- Sinh quiz ----------

class GenerateQuizRequest(BaseModel):
    n_questions: int = 5
    n_flashcards: int = 5

class QuizResponse(BaseModel):
    document_id: str
    questions: list[QuizQuestion]
    flashcards: list[Flashcard]

@router.post("/quiz/{document_id}/generate", response_model=QuizResponse)
def generate(document_id: str, req: GenerateQuizRequest):
    doc = document_store.get(document_id)
    if doc is None:
        raise HTTPException(404, "Không tìm thấy tài liệu")
    if doc["status"] != "ready":
        raise HTTPException(409, f"Tài liệu chưa sẵn sàng (status={doc['status']})")

    try:
        quiz = generate_quiz(document_id, req.n_questions, req.n_flashcards)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"Lỗi khi sinh quiz: {e}")
    if quiz is None or not quiz.questions:
        raise HTTPException(422, "Không sinh được câu hỏi từ tài liệu này")
    return QuizResponse(document_id=document_id, questions=quiz.questions, flashcards=quiz.flashcards)

# ---------- Ghi kết quả ----------

class AttemptRequest(BaseModel):
    document_id: str
    question: str
    is_correct: bool

@router.post("/quiz/attempts")
def record_attempt(req: AttemptRequest):
    if document_store.get(req.document_id) is None:
        raise HTTPException(404, "Không tìm thấy tài liệu")
    quiz_store.add_attempt(req.document_id, req.question, req.is_correct)
    return {"status": "recorded"}

# ---------- Progress ----------

class DocumentProgress(BaseModel):
    document_id: str
    filename: str
    attempts: int
    correct: int
    accuracy: float  # 0..1

class ProgressResponse(BaseModel):
    total_attempts: int
    total_correct: int
    overall_accuracy: float
    documents: list[DocumentProgress]

@router.get("/progress", response_model=ProgressResponse)
def get_progress():
    attempts = quiz_store.list_attempts()
    docs = {d["id"]: d for d in document_store.list_all()}

    by_doc: dict[str, list[dict]] = defaultdict(list)
    for a in attempts:
        by_doc[a["document_id"]].append(a)

    documents = []
    for doc_id, doc_attempts in by_doc.items():
        correct = sum(1 for a in doc_attempts if a["is_correct"])
        documents.append(DocumentProgress(
            document_id=doc_id,
            filename=docs.get(doc_id, {}).get("filename", "(đã xóa)"),
            attempts=len(doc_attempts),
            correct=correct,
            accuracy=correct / len(doc_attempts),
        ))
    documents.sort(key=lambda d: d.accuracy)  # yếu nhất lên đầu

    total = len(attempts)
    total_correct = sum(1 for a in attempts if a["is_correct"])
    return ProgressResponse(
        total_attempts=total,
        total_correct=total_correct,
        overall_accuracy=(total_correct / total) if total else 0.0,
        documents=documents,
    )
