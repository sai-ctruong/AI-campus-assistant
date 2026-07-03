# Phase 08 — Tính năng nâng cao: Sinh đề ôn tập (Quiz Generation)

## 1. Lý thuyết

### 1.1 Cách tiếp cận
Lấy toàn bộ chunk của 1 document (hoặc theo section nếu detect được), đưa vào LLM với prompt yêu cầu sinh N câu hỏi dạng structured JSON.

### 1.2 Vấn đề context window
Không đưa cả tài liệu vào 1 lần nếu quá dài (vượt context window hoặc làm loãng chất lượng câu hỏi). Chia theo section (dùng metadata `page_number` để nhóm — ví dụ mỗi 10 trang là 1 section), sinh quiz từng phần rồi gộp lại.

### 1.3 Sinh cùng lúc MCQ + flashcard
Tiết kiệm API call bằng cách yêu cầu LLM sinh cả 2 loại trong 1 lần gọi, dùng chung 1 schema JSON lớn.

---

## 2. Code

### 2.1 Schema: `backend/app/quiz/schemas.py`
```python
from pydantic import BaseModel

class MCQQuestion(BaseModel):
    question: str
    options: list[str]  # 4 lựa chọn
    correct_answer: str  # phải trùng khớp 1 trong options
    explanation: str
    source_page: int | None = None

class Flashcard(BaseModel):
    front: str
    back: str
    source_page: int | None = None

class QuizSet(BaseModel):
    mcq_questions: list[MCQQuestion]
    flashcards: list[Flashcard]
```

### 2.2 Chia section theo trang: `backend/app/quiz/sectioning.py`
```python
def group_chunks_by_section(chunks: list[dict], pages_per_section: int = 10) -> list[list[dict]]:
    """Nhóm chunk theo cụm N trang liên tiếp để tránh vượt context window."""
    sections: dict[int, list[dict]] = {}
    for c in chunks:
        page = c["metadata"].get("page_number", 0)
        section_key = page // pages_per_section
        sections.setdefault(section_key, []).append(c)
    return [sections[k] for k in sorted(sections.keys())]
```

### 2.3 Generator: `backend/app/quiz/generator.py`
```python
from google import genai
from app.config import settings
from app.embedding.vector_store import get_all_chunks_by_document
from app.quiz.schemas import QuizSet
from app.quiz.sectioning import group_chunks_by_section

_client = genai.Client(api_key=settings.gemini_api_key)
GEN_MODEL = "gemini-2.0-flash"

QUIZ_SYSTEM_PROMPT = """Bạn là trợ lý tạo đề ôn tập cho sinh viên. Dựa trên nội dung tài liệu được cung cấp,
hãy sinh câu hỏi trắc nghiệm (MCQ) và flashcard bám sát nội dung, KHÔNG bịa thông tin ngoài tài liệu.
Mỗi câu MCQ có đúng 4 lựa chọn, chỉ 1 đáp án đúng, kèm giải thích ngắn gọn.
Trả về đúng schema JSON được yêu cầu."""

def _generate_for_section(section_chunks: list[dict], num_mcq: int, num_flashcard: int) -> QuizSet:
    context = "\n\n".join(
        f"[Trang {c['metadata'].get('page_number')}]: {c['text']}" for c in section_chunks
    )
    prompt = f"""Nội dung tài liệu:
{context}

Hãy sinh {num_mcq} câu hỏi trắc nghiệm và {num_flashcard} flashcard dựa trên nội dung trên."""

    response = _client.models.generate_content(
        model=GEN_MODEL,
        contents=prompt,
        config={
            "system_instruction": QUIZ_SYSTEM_PROMPT,
            "response_mime_type": "application/json",
            "response_schema": QuizSet,
        },
    )
    return response.parsed

def generate_quiz(document_id: str, total_mcq: int = 10, total_flashcard: int = 10) -> QuizSet:
    all_chunks_raw = get_all_chunks_by_document(document_id)
    chunks = [
        {"text": d, "metadata": m}
        for d, m in zip(all_chunks_raw["documents"], all_chunks_raw["metadatas"])
    ]
    sections = group_chunks_by_section(chunks, pages_per_section=10)
    if not sections:
        return QuizSet(mcq_questions=[], flashcards=[])

    mcq_per_section = max(1, total_mcq // len(sections))
    flashcard_per_section = max(1, total_flashcard // len(sections))

    all_mcq, all_flashcards = [], []
    for section in sections:
        result = _generate_for_section(section, mcq_per_section, flashcard_per_section)
        all_mcq.extend(result.mcq_questions)
        all_flashcards.extend(result.flashcards)

    return QuizSet(mcq_questions=all_mcq[:total_mcq], flashcards=all_flashcards[:total_flashcard])
```

### 2.4 Router: `backend/app/routers/quiz.py`
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Document
from app.quiz.generator import generate_quiz

router = APIRouter(prefix="/quiz", tags=["quiz"])

@router.post("/{document_id}/generate")
def generate_quiz_endpoint(document_id: str, num_mcq: int = 10, num_flashcard: int = 10, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or doc.status != "ready":
        raise HTTPException(409, "Document chưa sẵn sàng")
    quiz = generate_quiz(document_id, num_mcq, num_flashcard)
    return quiz.model_dump()
```

Gắn router vào `main.py`: `app.include_router(quiz.router)`.

### 2.5 Frontend — component làm quiz: `frontend/src/components/QuizPanel.tsx`
```tsx
import { useState } from "react";

interface MCQ {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function QuizPanel({ documentId }: { documentId: string }) {
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const loadQuiz = async () => {
    const res = await fetch(`${API_URL}/quiz/${documentId}/generate?num_mcq=10&num_flashcard=0`, { method: "POST" });
    const data = await res.json();
    setQuestions(data.mcq_questions);
    setAnswers({});
    setSubmitted(false);
  };

  const score = questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.correct_answer ? 1 : 0),
    0
  );

  return (
    <div className="p-4 space-y-4">
      <button onClick={loadQuiz} className="bg-emerald-600 rounded px-4 py-2">Sinh đề ôn tập</button>
      {questions.map((q, i) => (
        <div key={i} className="border border-slate-700 rounded p-3">
          <p className="font-medium">{i + 1}. {q.question}</p>
          {q.options.map((opt) => (
            <label key={opt} className="block mt-1">
              <input
                type="radio"
                name={`q-${i}`}
                checked={answers[i] === opt}
                onChange={() => setAnswers((prev) => ({ ...prev, [i]: opt }))}
                className="mr-2"
              />
              {opt}
            </label>
          ))}
          {submitted && (
            <p className={`mt-2 text-sm ${answers[i] === q.correct_answer ? "text-emerald-400" : "text-red-400"}`}>
              Đáp án đúng: {q.correct_answer} — {q.explanation}
            </p>
          )}
        </div>
      ))}
      {questions.length > 0 && !submitted && (
        <button onClick={() => setSubmitted(true)} className="bg-blue-600 rounded px-4 py-2">Chấm điểm</button>
      )}
      {submitted && <p>Điểm: {score}/{questions.length}</p>}
    </div>
  );
}
```

---

## 3. Checklist hoàn thành Phase 08
- [ ] Sinh MCQ có đúng 4 lựa chọn, đáp án đúng khớp với 1 trong `options`, có giải thích
- [ ] Sinh flashcard `{front, back}`
- [ ] Sectioning hoạt động đúng — tài liệu dài không bị lỗi context window
- [ ] UI cho user làm quiz, chấm điểm ngay, hiển thị giải thích sau khi nộp

→ Xong Phase 08, chuyển sang **Phase 09: Notebook Explainer**.
