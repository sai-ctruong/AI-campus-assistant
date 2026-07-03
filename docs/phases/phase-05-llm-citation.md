# Phase 05 — LLM Integration & Citation (câu trả lời kèm trích dẫn)

## 1. Lý thuyết

### 1.1 Prompt engineering cho RAG — tránh hallucination
System prompt phải chỉ rõ 3 điều:
1. LLM CHỈ được trả lời dựa trên context được cung cấp, không dùng kiến thức ngoài.
2. PHẢI trích dẫn `[Nguồn: file X, trang Y]` ngay sau mỗi claim.
3. Nếu context không đủ để trả lời → phải nói rõ "tôi không tìm thấy thông tin này trong tài liệu", **không được bịa**.

Đây là ranh giới giữa RAG "xịn" và RAG "hù dọa" — nhiều demo RAG trông ấn tượng nhưng vẫn hallucinate vì system prompt không đủ chặt.

### 1.2 Format context đưa vào prompt
Mỗi chunk cần kèm id/trang ngay trong text đưa vào prompt, để LLM "point" chính xác:
```
[Chunk 1 - trang 12]: nội dung...
[Chunk 2 - trang 15]: nội dung...
```

### 1.3 Structured output
Yêu cầu LLM trả JSON theo schema cố định giúp frontend hiển thị citation dễ dàng, không phải parse text tự do (dễ lỗi).

### 1.4 Conversation memory
Câu hỏi follow-up ("còn phần kia thì sao?") cần vài lượt hỏi-đáp trước để hiểu ngữ cảnh. Chỉ đưa N lượt gần nhất (ví dụ N=3) vào prompt — đưa toàn bộ lịch sử sẽ tốn token và loãng context không cần thiết.

---

## 2. Code

### 2.1 System prompt: `backend/app/rag/prompts.py`
```python
SYSTEM_PROMPT = """Bạn là trợ lý học tập AI cho sinh viên đại học. Nhiệm vụ của bạn là trả lời câu hỏi
CHỈ dựa trên các đoạn trích (context) được cung cấp bên dưới, KHÔNG được dùng kiến thức ngoài.

QUY TẮC BẮT BUỘC:
1. Sau MỖI luận điểm bạn đưa ra, PHẢI trích dẫn nguồn theo định dạng [Nguồn: trang X].
2. Nếu context KHÔNG chứa đủ thông tin để trả lời, hãy trả lời chính xác:
   "Tôi không tìm thấy thông tin này trong tài liệu được cung cấp."
   TUYỆT ĐỐI không bịa ra thông tin không có trong context.
3. Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, đúng trọng tâm câu hỏi.
4. Trả về kết quả ĐÚNG theo schema JSON được yêu cầu, không thêm text ngoài JSON.
"""

def build_context_block(chunks: list[dict]) -> str:
    lines = []
    for i, c in enumerate(chunks, start=1):
        page = c["metadata"].get("page_number") or c["metadata"].get("cell_index")
        lines.append(f"[Chunk {i} - trang {page}]: {c['text']}")
    return "\n\n".join(lines)

def build_user_prompt(query: str, chunks: list[dict], history: list[dict]) -> str:
    context_block = build_context_block(chunks)
    history_block = ""
    if history:
        history_lines = [f"{h['role']}: {h['content']}" for h in history[-3:]]  # N=3 lượt gần nhất
        history_block = "LỊCH SỬ HỘI THOẠI GẦN ĐÂY:\n" + "\n".join(history_lines) + "\n\n"
    return f"""{history_block}CONTEXT:
{context_block}

CÂU HỎI: {query}"""
```

### 2.2 Structured output schema: `backend/app/rag/schemas.py`
```python
from pydantic import BaseModel

class Citation(BaseModel):
    source_file: str
    page: int | None = None
    chunk_text_snippet: str

class RagAnswer(BaseModel):
    answer: str
    citations: list[Citation]
    found_in_document: bool  # False nếu LLM không tìm thấy thông tin
```

### 2.3 Generator: `backend/app/rag/generator.py`
```python
from google import genai
from app.config import settings
from app.rag.prompts import SYSTEM_PROMPT, build_user_prompt
from app.rag.schemas import RagAnswer
from app.rag.retriever import retrieve

_client = genai.Client(api_key=settings.gemini_api_key)
GEN_MODEL = "gemini-2.0-flash"

def generate_answer(query: str, document_id: str, history: list[dict] | None = None) -> RagAnswer:
    history = history or []
    chunks = retrieve(query, document_id)

    if not chunks:
        return RagAnswer(
            answer="Tôi không tìm thấy thông tin này trong tài liệu được cung cấp.",
            citations=[],
            found_in_document=False,
        )

    user_prompt = build_user_prompt(query, chunks, history)

    response = _client.models.generate_content(
        model=GEN_MODEL,
        contents=user_prompt,
        config={
            "system_instruction": SYSTEM_PROMPT,
            "response_mime_type": "application/json",
            "response_schema": RagAnswer,
        },
    )

    result: RagAnswer = response.parsed

    # Bổ sung source_file thật (LLM có thể không biết tên file, chỉ biết số trang)
    source_file = chunks[0]["metadata"].get("source_file", "unknown")
    for c in result.citations:
        if not c.source_file:
            c.source_file = source_file

    return result
```

### 2.4 Conversation memory — lưu tạm trong RAM (MVP), DB thật ở Phase 06/10

`backend/app/rag/memory.py`:
```python
from collections import defaultdict

_history_store: dict[str, list[dict]] = defaultdict(list)

def get_history(session_key: str) -> list[dict]:
    return _history_store[session_key]

def append_turn(session_key: str, role: str, content: str) -> None:
    _history_store[session_key].append({"role": role, "content": content})
```

> Lưu ý: `_history_store` trong RAM sẽ mất khi restart server — chỉ dùng để chạy thử ở Phase 05. Phase 06 sẽ chuyển sang lưu `chat_history` trong PostgreSQL.

### 2.5 Test thử — bao gồm case "câu hỏi ngoài phạm vi"

`backend/scripts/test_generator.py`:
```python
import sys
sys.path.append("..")
from app.rag.generator import generate_answer

DOC_ID = "doc-test-1"

# Case 1: câu hỏi có trong tài liệu
r1 = generate_answer("overfitting là gì", DOC_ID)
print("Case 1:", r1.answer)
print("Citations:", r1.citations)

# Case 2: câu hỏi chắc chắn KHÔNG có trong tài liệu (test chống hallucination)
r2 = generate_answer("công thức tính lãi suất ngân hàng là gì", DOC_ID)
print("\nCase 2 (out-of-scope):", r2.answer)
assert r2.found_in_document is False, "LLM đang hallucinate thay vì từ chối trả lời!"
```

---

## 3. Checklist hoàn thành Phase 05
- [ ] LLM trả lời đúng schema JSON, có `citations` với `page` chính xác
- [ ] Test case "câu hỏi ngoài phạm vi tài liệu" → LLM từ chối đúng cách (`found_in_document=False`), không bịa
- [ ] Conversation memory hoạt động: hỏi follow-up ngắn ("còn phần kia thì sao?") vẫn hiểu đúng ngữ cảnh nhờ N=3 lượt gần nhất
- [ ] Đã thử ít nhất 5 câu hỏi thực tế trên tài liệu thật, đọc kỹ câu trả lời để đánh giá chất lượng trích dẫn

→ Xong Phase 05, chuyển sang **Phase 06: Backend API hoàn chỉnh**.
