# Phase 10 — Theo dõi tiến độ học (Progress Tracking)

## 1. Lý thuyết

### 1.1 Mục tiêu
Biết user yếu phần nào dựa trên kết quả quiz + câu hỏi họ hay hỏi, hiển thị dashboard gợi ý ôn tập.

### 1.2 Thiết kế schema quan hệ
```
users (id, name, email, ...)
documents (id, user_id, filename, uploaded_at, ...)
chat_history (id, user_id, document_id, question, answer, created_at)
quiz_attempts (id, user_id, quiz_question_id, is_correct, created_at)
quiz_questions (id, document_id, question, correct_answer, source_page)
```
Logic MVP: tính % đúng theo `document_id` → hiển thị "bạn đúng 65% ở tài liệu X, nên ôn lại". Nâng cao hơn (nếu còn thời gian): phân loại câu hỏi user hay hỏi vào topic, phát hiện pattern "hỏi đi hỏi lại 1 chủ đề" = dấu hiệu chưa hiểu.

---

## 2. Code

### 2.1 Models bổ sung: `backend/app/db/models.py` (thêm vào file đã có ở Phase 06)
```python
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, Float

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    id = Column(String, primary_key=True, default=gen_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    question = Column(Text, nullable=False)
    options_json = Column(Text, nullable=False)  # JSON list 4 options
    correct_answer = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)
    source_page = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(String, primary_key=True, default=gen_uuid)
    quiz_question_id = Column(String, ForeignKey("quiz_questions.id"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    selected_answer = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
```
> `datetime, timezone` đã import ở đầu file `models.py` từ Phase 06.

> Ghi chú: MVP dự án 1 người dùng nên bảng `users`/`user_id` có thể bỏ qua để đơn giản (giả định 1 user = 1 instance chạy local). Nếu deploy multi-user thật, thêm `user_id` vào từng bảng và middleware auth — không nằm trong phạm vi MVP.

### 2.2 Lưu câu hỏi quiz khi sinh (sửa `quiz.py` router ở Phase 08 để persist)
```python
import json
from app.db.models import QuizQuestion

@router.post("/{document_id}/generate")
def generate_quiz_endpoint(document_id: str, num_mcq: int = 10, num_flashcard: int = 10, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or doc.status != "ready":
        raise HTTPException(409, "Document chưa sẵn sàng")

    quiz = generate_quiz(document_id, num_mcq, num_flashcard)

    saved_questions = []
    for mcq in quiz.mcq_questions:
        row = QuizQuestion(
            document_id=document_id,
            question=mcq.question,
            options_json=json.dumps(mcq.options),
            correct_answer=mcq.correct_answer,
            explanation=mcq.explanation,
            source_page=mcq.source_page,
        )
        db.add(row)
        db.flush()  # để lấy row.id trước commit
        saved_questions.append({"id": row.id, **mcq.model_dump()})
    db.commit()

    return {"mcq_questions": saved_questions, "flashcards": [f.model_dump() for f in quiz.flashcards]}
```

### 2.3 Router chấm điểm + progress: `backend/app/routers/progress.py`
```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.db.models import QuizQuestion, QuizAttempt

router = APIRouter(prefix="/progress", tags=["progress"])

class SubmitAnswer(BaseModel):
    quiz_question_id: str
    selected_answer: str

@router.post("/{document_id}/submit-answer")
def submit_answer(document_id: str, req: SubmitAnswer, db: Session = Depends(get_db)):
    question = db.query(QuizQuestion).filter(QuizQuestion.id == req.quiz_question_id).first()
    if not question:
        raise HTTPException(404, "Câu hỏi không tồn tại")

    is_correct = req.selected_answer == question.correct_answer
    db.add(QuizAttempt(
        quiz_question_id=req.quiz_question_id,
        document_id=document_id,
        selected_answer=req.selected_answer,
        is_correct=is_correct,
    ))
    db.commit()
    return {"is_correct": is_correct, "correct_answer": question.correct_answer, "explanation": question.explanation}

@router.get("/{document_id}/summary")
def progress_summary(document_id: str, db: Session = Depends(get_db)):
    total = db.query(func.count(QuizAttempt.id)).filter(QuizAttempt.document_id == document_id).scalar()
    correct = (
        db.query(func.count(QuizAttempt.id))
        .filter(QuizAttempt.document_id == document_id, QuizAttempt.is_correct == True)  # noqa: E712
        .scalar()
    )
    accuracy = round(correct / total * 100, 1) if total else 0.0

    # Câu hỏi sai nhiều lần nhất (gợi ý ôn lại phần nào)
    weak_questions = (
        db.query(QuizQuestion, func.count(QuizAttempt.id).label("wrong_count"))
        .join(QuizAttempt, QuizAttempt.quiz_question_id == QuizQuestion.id)
        .filter(QuizQuestion.document_id == document_id, QuizAttempt.is_correct == False)  # noqa: E712
        .group_by(QuizQuestion.id)
        .order_by(func.count(QuizAttempt.id).desc())
        .limit(5)
        .all()
    )

    return {
        "total_attempts": total,
        "correct_attempts": correct,
        "accuracy_percent": accuracy,
        "weak_points": [
            {"question": q.question, "source_page": q.source_page, "wrong_count": wc}
            for q, wc in weak_questions
        ],
    }
```

Gắn vào `main.py`: `app.include_router(progress.router)`.

### 2.4 Frontend — dashboard đơn giản: `frontend/src/components/ProgressDashboard.tsx`
```tsx
import { useEffect, useState } from "react";

interface Summary {
  total_attempts: number;
  correct_attempts: number;
  accuracy_percent: number;
  weak_points: { question: string; source_page: number | null; wrong_count: number }[];
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function ProgressDashboard({ documentId }: { documentId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/progress/${documentId}/summary`)
      .then((res) => res.json())
      .then(setSummary);
  }, [documentId]);

  if (!summary) return <p className="text-slate-400 p-4">Đang tải...</p>;

  return (
    <div className="p-4 space-y-4">
      <div className="bg-slate-800 rounded p-4">
        <p className="text-2xl font-bold text-emerald-400">{summary.accuracy_percent}%</p>
        <p className="text-sm text-slate-400">
          {summary.correct_attempts}/{summary.total_attempts} câu đúng
        </p>
      </div>
      {summary.weak_points.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Bạn nên ôn lại:</h3>
          <ul className="space-y-1">
            {summary.weak_points.map((w, i) => (
              <li key={i} className="text-sm text-slate-300">
                Trang {w.source_page ?? "?"} — sai {w.wrong_count} lần: {w.question}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## 3. Checklist hoàn thành Phase 10
- [ ] Schema PostgreSQL thiết kế xong, foreign key đúng (`quiz_attempts.quiz_question_id → quiz_questions.id`)
- [ ] Câu hỏi quiz được lưu khi sinh, có `id` để chấm điểm sau này
- [ ] `POST /progress/{document_id}/submit-answer` chấm đúng/sai chính xác
- [ ] Dashboard hiển thị % đúng theo document + danh sách "điểm yếu" (câu hỏi sai nhiều lần)
- [ ] (nâng cao, optional) Phân tích pattern từ `chat_history` — bỏ qua nếu hết thời gian, không bắt buộc cho MVP

→ Xong Phase 10, chuyển sang **Phase 11: Voice Mode**.
