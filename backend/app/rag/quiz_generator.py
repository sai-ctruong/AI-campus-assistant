"""Phase 8: sinh quiz (MCQ) + flashcard từ chunks của 1 tài liệu bằng Gemini structured output."""
import random
from typing import Optional
from pydantic import BaseModel
from google import genai
from google.genai import types
from app.config import settings
from app.db.chroma_client import get_document_chunks

_client = genai.Client(api_key=settings.gemini_api_key)
_MODEL = "gemini-2.5-flash"

# Giới hạn ngữ liệu đưa vào 1 lần gọi (tránh vượt context + tiết kiệm quota).
_MAX_CONTEXT_CHARS = 24000

_SYSTEM_PROMPT = """Bạn là trợ lý học tập tạo câu hỏi ôn tập cho sinh viên.
Từ các đoạn tài liệu được cung cấp, hãy sinh câu hỏi trắc nghiệm (MCQ) và flashcard.

QUY TẮC:
1. Câu hỏi CHỈ dựa trên nội dung tài liệu, không dùng kiến thức ngoài.
2. Mỗi MCQ có đúng 4 lựa chọn, chỉ 1 đáp án đúng (correct_index là chỉ số 0-3).
3. explanation giải thích ngắn gọn vì sao đáp án đúng, kèm vị trí trong tài liệu nếu có (trang/cell).
4. source_hint ghi vị trí nguồn (ví dụ "trang 12").
5. Câu hỏi bằng tiếng Việt (giữ nguyên thuật ngữ tiếng Anh chuyên ngành).
6. Độ khó đa dạng: nhớ khái niệm, hiểu, áp dụng."""

class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct_index: int
    explanation: str
    source_hint: str

class Flashcard(BaseModel):
    front: str
    back: str

class _QuizSchema(BaseModel):
    questions: list[QuizQuestion]
    flashcards: list[Flashcard]

def _build_context(document_id: str) -> str:
    chunks = get_document_chunks(document_id)
    if not chunks:
        return ""
    # Xáo trộn để quiz không lần nào cũng lấy đúng phần đầu tài liệu,
    # rồi nhồi tới giới hạn ký tự.
    random.shuffle(chunks)
    parts: list[str] = []
    total = 0
    for c in chunks:
        meta = c["metadata"]
        loc = (
            f"cell {meta.get('cell_index')}"
            if meta.get("source_type") == "notebook"
            else f"trang {meta.get('page_number')}"
        )
        block = f"[{loc}] {c['text']}"
        if total + len(block) > _MAX_CONTEXT_CHARS:
            break
        parts.append(block)
        total += len(block)
    return "\n\n".join(parts)

def generate_quiz(
    document_id: str, n_questions: int = 5, n_flashcards: int = 5
) -> Optional[_QuizSchema]:
    context = _build_context(document_id)
    if not context:
        return None

    prompt = (
        f"[Các đoạn tài liệu]\n{context}\n\n"
        f"Hãy sinh {n_questions} câu hỏi trắc nghiệm và {n_flashcards} flashcard."
    )
    response = _client.models.generate_content(
        model=_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=_QuizSchema,
            temperature=0.7,  # cao hơn chat để câu hỏi đa dạng giữa các lần sinh
        ),
    )
    return response.parsed
