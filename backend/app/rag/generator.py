"""Phase 5: ghép retrieval + Gemini LLM → câu trả lời kèm trích dẫn nguồn, chống hallucination."""
from dataclasses import dataclass
from typing import Optional
from pydantic import BaseModel
from google import genai
from google.genai import types
from app.config import settings
from app.rag.retriever import hybrid_retrieve, RetrievedChunk

_client = genai.Client(api_key=settings.gemini_api_key)
_MODEL = "gemini-2.5-flash"

_SYSTEM_PROMPT = """Bạn là trợ lý học tập AI cho sinh viên. Nhiệm vụ: trả lời câu hỏi CHỈ dựa trên các đoạn tài liệu được cung cấp.

QUY TẮC BẮT BUỘC:
1. CHỈ dùng thông tin trong các đoạn được đánh số bên dưới. TUYỆT ĐỐI KHÔNG bịa hay dùng kiến thức ngoài tài liệu.
2. Sau mỗi ý trong câu trả lời, chèn số nguồn dạng [1], [2]... tương ứng với đoạn bạn dùng.
3. Nếu các đoạn KHÔNG chứa thông tin để trả lời, đặt found_answer=false và answer="Tôi không tìm thấy thông tin này trong tài liệu."
4. Đưa số của các đoạn thực sự dùng vào used_chunks.
5. Trả lời bằng tiếng Việt, ngắn gọn, chính xác, bám sát tài liệu."""

class _AnswerSchema(BaseModel):
    answer: str
    used_chunks: list[int]
    found_answer: bool

@dataclass
class Citation:
    ref: int                       # số [n] trong câu trả lời
    source_file: str
    location: str                  # "trang 12" (PDF) hoặc "cell 3 (code)" (notebook)
    snippet: str

@dataclass
class RagAnswer:
    answer: str
    citations: list[Citation]
    found_answer: bool

def _chunk_location(meta: dict) -> str:
    stype = meta.get("source_type")
    if stype == "notebook":
        return f"cell {meta.get('cell_index')} ({meta.get('cell_type')})"
    if stype == "docx":
        return f"phần {meta.get('section_index', 0) + 1}"
    return f"trang {meta.get('page_number')}"

def _format_context(chunks: list[RetrievedChunk]) -> str:
    blocks = []
    for i, c in enumerate(chunks, start=1):
        loc = _chunk_location(c.metadata)
        blocks.append(f"[{i}] (Nguồn: {c.metadata.get('source_file')}, {loc})\n{c.text}")
    return "\n\n".join(blocks)

def _format_history(history: Optional[list[dict]], max_turns: int = 3) -> str:
    if not history:
        return ""
    recent = history[-max_turns:]
    lines = [f"Hỏi: {t['question']}\nĐáp: {t['answer']}" for t in recent]
    return "[Lịch sử hội thoại gần đây]\n" + "\n\n".join(lines) + "\n\n"

def generate_answer(
    query: str,
    document_id: Optional[str] = None,
    top_k: int = 5,
    history: Optional[list[dict]] = None,
    use_rerank: bool = True,
) -> RagAnswer:
    # 1. Retrieve (hybrid); rerank tùy chọn (cần sentence-transformers/torch).
    #    Nếu môi trường deploy không cài torch → tự bỏ qua rerank thay vì crash.
    chunks = None
    if use_rerank:
        try:
            from app.rag.reranker import rerank
            candidates = hybrid_retrieve(query, top_k=20, document_id=document_id)
            chunks = rerank(query, candidates, top_k=top_k)
        except ImportError:
            chunks = None  # torch không có → fallback hybrid bên dưới
    if chunks is None:
        chunks = hybrid_retrieve(query, top_k=top_k, document_id=document_id)

    if not chunks:
        return RagAnswer("Tôi không tìm thấy thông tin này trong tài liệu.", [], False)

    # 2. Build prompt: lịch sử + context đánh số + câu hỏi.
    prompt = (
        _format_history(history)
        + "[Các đoạn tài liệu]\n" + _format_context(chunks)
        + f"\n\n[Câu hỏi hiện tại]\n{query}"
    )

    # 3. Gọi LLM với structured JSON output.
    response = _client.models.generate_content(
        model=_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=_AnswerSchema,
            temperature=0.2,
        ),
    )
    parsed: _AnswerSchema = response.parsed

    # 4. Map số đoạn LLM dùng → citation thật (source_file, trang). Không tin số trang do LLM tự ghi.
    citations = []
    for ref in parsed.used_chunks:
        if 1 <= ref <= len(chunks):
            c = chunks[ref - 1]
            citations.append(Citation(
                ref=ref,
                source_file=c.metadata.get("source_file", ""),
                location=_chunk_location(c.metadata),
                snippet=c.text[:200],
            ))

    return RagAnswer(answer=parsed.answer, citations=citations, found_answer=parsed.found_answer)
