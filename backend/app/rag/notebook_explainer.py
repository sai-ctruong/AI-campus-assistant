"""Giải thích từng code cell của notebook (đưa cả notebook vào 1 lần gọi để giữ ngữ cảnh)."""
from typing import Optional
from pydantic import BaseModel
from google import genai
from google.genai import types
from app.config import settings
from app.db.chroma_client import get_document_chunks

_client = genai.Client(api_key=settings.gemini_api_key)
_MODEL = "gemini-2.5-flash"
_MAX_CONTEXT_CHARS = 30000

_SYSTEM_PROMPT = """Bạn là trợ giảng giải thích Jupyter notebook cho sinh viên.
Với MỖI code cell, hãy giải thích ngắn gọn nó làm gì và vai trò trong toàn bài.

QUY TẮC:
1. Chỉ giải thích code cell (bỏ qua markdown cell — chúng chỉ là ngữ cảnh).
2. cell_index phải khớp đúng chỉ số cell được đánh dấu trong input.
3. title: 1 cụm ngắn tóm tắt cell làm gì. explanation: 2-4 câu tiếng Việt, nhắc tới biến/hàm liên quan từ các cell trước nếu có.
4. Giữ nguyên tên hàm/thư viện tiếng Anh."""

class CellExplanation(BaseModel):
    cell_index: int
    title: str
    explanation: str

class _ExplainSchema(BaseModel):
    summary: str  # tóm tắt 1-2 câu cả notebook làm gì
    cells: list[CellExplanation]

class NotebookCellOut(BaseModel):
    cell_index: int
    cell_type: str
    source: str

def get_notebook_cells(document_id: str) -> list[NotebookCellOut]:
    chunks = get_document_chunks(document_id)
    cells = [
        NotebookCellOut(
            cell_index=c["metadata"].get("cell_index", 0),
            cell_type=c["metadata"].get("cell_type", "code"),
            source=c["text"],
        )
        for c in chunks
        if c["metadata"].get("source_type") == "notebook"
    ]
    cells.sort(key=lambda c: c.cell_index)
    return cells

def explain_notebook(document_id: str) -> Optional[_ExplainSchema]:
    cells = get_notebook_cells(document_id)
    if not cells:
        return None

    parts: list[str] = []
    total = 0
    for c in cells:
        block = f"--- cell {c.cell_index} ({c.cell_type}) ---\n{c.source}"
        if total + len(block) > _MAX_CONTEXT_CHARS:
            break
        parts.append(block)
        total += len(block)

    prompt = "[Notebook]\n" + "\n\n".join(parts) + "\n\nHãy giải thích các code cell theo thứ tự."
    response = _client.models.generate_content(
        model=_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=_ExplainSchema,
            temperature=0.3,
        ),
    )
    return response.parsed
