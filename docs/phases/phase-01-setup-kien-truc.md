# Phase 01 — Kiến trúc tổng thể & Setup môi trường

> Gộp Giai đoạn 0 (xác định phạm vi) + Giai đoạn 1 (setup khung dự án) từ roadmap.

## 1. Lý thuyết

### 1.1 Vì sao cần quyết định kiến trúc trước khi code?
RAG (Retrieval-Augmented Generation) là kiến trúc gồm 2 pha tách biệt:
- **Ingestion pipeline** (offline): file → parse → chunk → embed → lưu vector DB.
- **Query pipeline** (online, mỗi lần user hỏi): câu hỏi → embed → retrieve top-k chunks → đưa vào LLM cùng câu hỏi → sinh câu trả lời có trích dẫn.

Nếu không tách rõ 2 pha này ngay từ đầu, code sẽ rối khi thêm tính năng (quiz, voice…) vì mọi thứ đều phụ thuộc vào ingestion + retrieval đã có sẵn.

### 1.2 Quyết định kiến trúc cho project này
| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| LLM | Gemini API (`gemini-1.5-flash` hoặc `gemini-2.0-flash`) | Free tier hào phóng, hỗ trợ tiếng Việt tốt, structured output |
| Embedding | Gemini `text-embedding-004` (fallback: `intfloat/multilingual-e5-base` local) | Đa ngôn ngữ Việt-Anh |
| Vector DB | ChromaDB (persistent, local) | Dễ dùng, đủ nhanh cho vài nghìn chunk, có metadata filter sẵn |
| Backend | FastAPI + Uvicorn | Async tốt, tự sinh docs `/docs`, phù hợp AI pipeline |
| Frontend | React + TypeScript + Vite + Tailwind | Nhanh, quen thuộc |
| DB quan hệ | PostgreSQL | Lưu user, chat history, quiz, tiến độ học |

### 1.3 Sơ đồ kiến trúc
```
[User] → [React/Vite Frontend] → [FastAPI Backend]
                                        │
                ┌───────────────┬───────┼────────────────┐
                ▼               ▼       ▼                ▼
        [Ingestion module] [RAG pipeline] [PostgreSQL]  [Gemini API]
        (parse/chunk)      (retrieve+gen)  (users, chat,
                │                            quiz, progress)
                ▼
          [ChromaDB]  ◄── embed bằng Gemini text-embedding-004
```

### 1.4 MVP scope (bắt buộc phải viết ra, đừng ôm hết)
> **MVP**: chỉ hỗ trợ PDF text-based (chưa OCR), chat với 1 tài liệu tại một thời điểm, câu trả lời PHẢI kèm trích dẫn trang. Không có quiz/voice/progress ở bản MVP.

---

## 2. Cấu trúc thư mục

```
ai-campus-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── ingestion/
│   │   ├── embedding/
│   │   ├── rag/
│   │   ├── routers/
│   │   └── db/
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env
├── data/
│   ├── uploads/
│   └── chroma/
└── docs/
```

Tạo thư mục:

```bash
mkdir -p backend/app/{ingestion,embedding,rag,routers,db}
mkdir -p frontend
mkdir -p data/uploads data/chroma
```

---

## 3. Code: Backend "Hello World"

### 3.1 `backend/requirements.txt`
```
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-dotenv==1.0.1
pydantic-settings==2.5.2
google-genai==0.3.0
chromadb==0.5.20
pypdf==5.0.1
nbformat==5.10.4
rank-bm25==0.2.2
sqlalchemy==2.0.35
psycopg2-binary==2.9.9
python-multipart==0.0.12
```

Cài đặt:
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
pip install -r requirements.txt
```

### 3.2 `backend/app/config.py`
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    gemini_api_key: str
    chroma_persist_dir: str = "../data/chroma"
    upload_dir: str = "../data/uploads"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/campus_assistant"
    cors_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"

settings = Settings()
```

### 3.3 `backend/.env`
```
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/campus_assistant
```

### 3.4 `backend/app/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(title="AI Campus Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}
```

Chạy thử:
```bash
uvicorn app.main:app --reload --app-dir backend
```
Mở `http://localhost:8000/health` → phải thấy `{"status":"ok"}`.
Mở `http://localhost:8000/docs` → Swagger UI tự sinh, dùng để test API sau này.

---

## 4. Code: Frontend "Hello World"

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 4.1 `frontend/tailwind.config.js`
```js
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

### 4.2 `frontend/src/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4.3 `frontend/src/App.tsx`
```tsx
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function App() {
  const [status, setStatus] = useState<string>("checking...");

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("backend unreachable"));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <p className="text-xl">
        Backend status: <span className="font-mono text-emerald-400">{status}</span>
      </p>
    </div>
  );
}

export default App;
```

### 4.4 `frontend/.env`
```
VITE_API_URL=http://localhost:8000
```

Chạy: `npm run dev` → mở trình duyệt, nếu thấy "Backend status: ok" và **không có lỗi CORS trong console** thì bắt tay backend-frontend thành công.

---

## 5. `.gitignore` (root)

```
# backend
backend/venv/
backend/.env
__pycache__/
*.pyc

# frontend
frontend/node_modules/
frontend/.env
frontend/dist/

# data
data/uploads/*
data/chroma/*
!data/uploads/.gitkeep
!data/chroma/.gitkeep
```

---

## 6. Checklist hoàn thành Phase 01
- [ ] `uvicorn` chạy, `/health` trả `{"status":"ok"}`
- [ ] `/docs` Swagger UI mở được
- [ ] React app chạy, gọi được `/health`, không lỗi CORS
- [ ] `.env` (backend + frontend) đã tạo, đã thêm vào `.gitignore`
- [ ] Đã ghi rõ MVP scope ra file `CONTEXT.md` (copy phần 1.4 ở trên)

→ Xong Phase 01, chuyển sang **Phase 02: Document Ingestion Pipeline**.
