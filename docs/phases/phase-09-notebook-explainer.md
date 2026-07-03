# Phase 09 — Giải thích code (Notebook Explainer)

## 1. Lý thuyết

### 1.1 Cách tiếp cận
Tái sử dụng `notebook_parser.py` từ Phase 02. Với mỗi code cell, gửi cell đó + N cell context xung quanh (để LLM hiểu biến/hàm được định nghĩa ở đâu, tránh giải thích "mù" từng cell độc lập) vào LLM, yêu cầu giải thích ngắn gọn.

### 1.2 Vì sao cần context xung quanh?
Một cell như `model.fit(X_train, y_train)` vô nghĩa nếu không biết `X_train`, `model` được định nghĩa ở cell nào trước đó. Giữ context giúp giải thích chính xác và có tính liên kết giữa các cell — đây là yêu cầu cốt lõi phân biệt "giải thích code tốt" với "giải thích code hời hợt".

---

## 2. Code

### 2.1 Schema: `backend/app/notebook_explainer/schemas.py`
```python
from pydantic import BaseModel

class CellExplanation(BaseModel):
    cell_index: int
    cell_type: str
    source: str
    explanation: str
```

### 2.2 Explainer: `backend/app/notebook_explainer/explainer.py`
```python
from google import genai
from app.config import settings
from app.ingestion.notebook_parser import parse_notebook, NotebookCell
from app.notebook_explainer.schemas import CellExplanation

_client = genai.Client(api_key=settings.gemini_api_key)
GEN_MODEL = "gemini-2.0-flash"

EXPLAIN_SYSTEM_PROMPT = """Bạn là trợ giảng lập trình AI/ML. Nhiệm vụ: giải thích 1 cell code Python
trong ngữ cảnh các cell trước đó (biến, hàm, model đã được định nghĩa ở đâu).
Giải thích ngắn gọn (2-4 câu), bằng tiếng Việt, tập trung vào Ý NGHĨA và MỤC ĐÍCH của đoạn code,
không diễn giải từng dòng syntax cơ bản."""

def _build_context(cells: list[NotebookCell], target_index: int, context_window: int = 3) -> str:
    start = max(0, target_index - context_window)
    context_cells = cells[start:target_index]
    lines = []
    for c in context_cells:
        tag = "CODE" if c.cell_type == "code" else "MARKDOWN"
        lines.append(f"[Cell {c.cell_index} - {tag}]:\n{c.source}")
    return "\n\n".join(lines)

def explain_cell(cells: list[NotebookCell], target_index: int) -> CellExplanation:
    target_cell = next(c for c in cells if c.cell_index == target_index)
    context_str = _build_context(cells, cells.index(target_cell))

    prompt = f"""CÁC CELL TRƯỚC ĐÓ (ngữ cảnh):
{context_str}

CELL CẦN GIẢI THÍCH (Cell {target_cell.cell_index}):
{target_cell.source}

Hãy giải thích cell trên."""

    response = _client.models.generate_content(
        model=GEN_MODEL,
        contents=prompt,
        config={"system_instruction": EXPLAIN_SYSTEM_PROMPT},
    )

    return CellExplanation(
        cell_index=target_cell.cell_index,
        cell_type=target_cell.cell_type,
        source=target_cell.source,
        explanation=response.text.strip(),
    )

def explain_notebook(file_path: str) -> list[CellExplanation]:
    cells = parse_notebook(file_path)
    code_cells = [c for c in cells if c.cell_type == "code"]
    return [explain_cell(cells, c.cell_index) for c in code_cells]
```

> Lưu ý hiệu năng: `explain_notebook` gọi LLM tuần tự cho mỗi code cell — với notebook nhiều cell, cân nhắc dùng `asyncio.gather` hoặc batch song song có giới hạn concurrency (ví dụ 5 request cùng lúc) để giảm thời gian chờ.

### 2.3 Router: `backend/app/routers/notebook_explainer.py`
```python
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.notebook_explainer.explainer import explain_notebook
from app.config import settings

router = APIRouter(prefix="/notebook", tags=["notebook"])

@router.post("/explain")
async def explain_notebook_endpoint(file: UploadFile = File(...)):
    if not file.filename.endswith(".ipynb"):
        raise HTTPException(400, "Chỉ chấp nhận file .ipynb")

    os.makedirs(settings.upload_dir, exist_ok=True)
    temp_path = os.path.join(settings.upload_dir, f"tmp_{file.filename}")
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    try:
        explanations = explain_notebook(temp_path)
    finally:
        os.remove(temp_path)

    return [e.model_dump() for e in explanations]
```

Gắn vào `main.py`: `app.include_router(notebook_explainer.router)`.

### 2.4 Frontend — hiển thị side-by-side: `frontend/src/components/NotebookExplainer.tsx`
```tsx
import { useState } from "react";

interface CellExplanation {
  cell_index: number;
  cell_type: string;
  source: string;
  explanation: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function NotebookExplainer() {
  const [cells, setCells] = useState<CellExplanation[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (file: File) => {
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API_URL}/notebook/explain`, { method: "POST", body: form });
      setCells(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <input
        type="file"
        accept=".ipynb"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
      {loading && <p className="text-slate-400">Đang phân tích notebook...</p>}
      {cells.map((c) => (
        <div key={c.cell_index} className="grid grid-cols-2 gap-4 border border-slate-700 rounded p-3">
          <pre className="bg-slate-900 rounded p-2 text-sm overflow-x-auto text-emerald-300">
            {c.source}
          </pre>
          <p className="text-sm text-slate-200">{c.explanation}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 3. Checklist hoàn thành Phase 09
- [ ] Parse notebook + giải thích từng cell code chính xác
- [ ] Context giữa các cell được giữ — thử 1 notebook có biến định nghĩa ở cell đầu, dùng lại ở cell sau, kiểm tra giải thích có nhắc đúng nguồn gốc biến không
- [ ] UI hiển thị side-by-side code/giải thích rõ ràng, dễ đọc
- [ ] Xử lý notebook không có code cell nào (chỉ markdown) không bị crash

→ Xong Phase 09, chuyển sang **Phase 10: Progress Tracking**.
