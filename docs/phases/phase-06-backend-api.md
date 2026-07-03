# Phase 06 — Backend API hoàn chỉnh (FastAPI)

## 1. Lý thuyết

### 1.1 Vì sao ingestion cần chạy background?
Parse + embed 1 file PDF lớn có thể mất vài giây đến vài phút. Nếu xử lý đồng bộ trong request, HTTP connection sẽ timeout hoặc user phải chờ trân trân. Giải pháp: trả về ngay `{status: "processing"}`, xử lý thật trong `BackgroundTasks` của FastAPI, frontend poll `GET /documents/{id}` để biết khi nào `status` chuyển sang `ready`.

### 1.2 Thiết kế REST rõ ràng
```
POST   /documents/upload            → upload + trigger ingestion
GET    /documents                   → list tài liệu đã upload
GET    /documents/{id}              → chi tiết + status ingestion
DELETE /documents/{id}              → xóa tài liệu + chunks trong Chroma
POST   /chat/{document_id}          → gửi câu hỏi, nhận câu trả lời + citations
GET    /chat/{document_id}/history  → lấy lịch sử chat
```

---

## 2. Code

### 2.1 Database models: `backend/app/db/models.py`
```python
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base
from datetime import datetime, timezone
import uuid

Base = declarative_base()

def gen_uuid() -> str:
    return str(uuid.uuid4())

class Document(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True, default=gen_uuid)
    filename = Column(String, nullable=False)
    status = Column(String, default="processing")  # processing | ready | failed
    error_message = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ChatMessage(Base):
    __tablename__ = "chat_history"
    id = Column(String, primary_key=True, default=gen_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)
    citations_json = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
```

### 2.2 DB session: `backend/app/db/session.py`
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.db.models import Base

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 2.3 Router documents: `backend/app/routers/documents.py`
```python
import os
import shutil
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Document
from app.ingestion.pipeline import ingest_document
from app.embedding.vector_store import delete_document as delete_chroma_document
from app.config import settings

router = APIRouter(prefix="/documents", tags=["documents"])
ALLOWED_EXTENSIONS = {".pdf", ".ipynb"}
MAX_SIZE_MB = 50

def _process_ingestion(document_id: str, file_path: str, filename: str, db: Session):
    try:
        ingest_document_with_id(document_id, file_path, filename)
        doc = db.query(Document).filter(Document.id == document_id).first()
        doc.status = "ready"
        db.commit()
    except Exception as e:
        doc = db.query(Document).filter(Document.id == document_id).first()
        doc.status = "failed"
        doc.error_message = str(e)
        db.commit()

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Định dạng không hỗ trợ: {ext}. Chỉ chấp nhận {ALLOWED_EXTENSIONS}")

    contents = await file.read()
    if len(contents) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File vượt quá {MAX_SIZE_MB}MB")

    os.makedirs(settings.upload_dir, exist_ok=True)
    document = Document(filename=file.filename, status="processing")
    db.add(document)
    db.commit()
    db.refresh(document)

    file_path = os.path.join(settings.upload_dir, f"{document.id}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(contents)

    background_tasks.add_task(_process_ingestion, document.id, file_path, file.filename, db)

    return {"document_id": document.id, "status": "processing"}

@router.get("")
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.uploaded_at.desc()).all()
    return [{"id": d.id, "filename": d.filename, "status": d.status, "uploaded_at": d.uploaded_at} for d in docs]

@router.get("/{document_id}")
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    return {"id": doc.id, "filename": doc.filename, "status": doc.status, "error_message": doc.error_message}

@router.delete("/{document_id}")
def delete_document_endpoint(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    delete_chroma_document(document_id)
    db.delete(doc)
    db.commit()
    return {"status": "deleted"}
```

> Cần sửa `ingest_document` (Phase 03) để nhận `document_id` có sẵn thay vì tự sinh — thêm hàm `ingest_document_with_id(document_id, file_path, filename)` trong `pipeline.py`, tái sử dụng logic parse/chunk/store, chỉ khác là không gọi `uuid.uuid4()` nữa mà dùng `document_id` truyền vào.

### 2.4 Router chat: `backend/app/routers/chat.py`
```python
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import ChatMessage, Document
from app.rag.generator import generate_answer

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    question: str

@router.post("/{document_id}")
def chat(document_id: str, req: ChatRequest, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    if doc.status != "ready":
        raise HTTPException(409, f"Document chưa sẵn sàng (status={doc.status})")

    history_rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.document_id == document_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(6)
        .all()
    )
    history = [{"role": h.role, "content": h.content} for h in reversed(history_rows)]

    result = generate_answer(req.question, document_id, history=history)

    db.add(ChatMessage(document_id=document_id, role="user", content=req.question))
    db.add(ChatMessage(
        document_id=document_id,
        role="assistant",
        content=result.answer,
        citations_json=json.dumps([c.model_dump() for c in result.citations]),
    ))
    db.commit()

    return result.model_dump()

@router.get("/{document_id}/history")
def get_chat_history(document_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.document_id == document_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [
        {
            "role": r.role,
            "content": r.content,
            "citations": json.loads(r.citations_json) if r.citations_json else [],
            "created_at": r.created_at,
        }
        for r in rows
    ]
```

### 2.5 Gắn router vào `main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.session import init_db
from app.routers import documents, chat

app = FastAPI(title="AI Campus Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(documents.router)
app.include_router(chat.router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

### 2.6 Setup PostgreSQL local nhanh
```bash
# Nếu dùng Docker:
docker run --name campus-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=campus_assistant -p 5432:5432 -d postgres:16
```

---

## 3. Checklist hoàn thành Phase 06
- [ ] Tất cả 5 endpoint hoạt động, test qua Swagger UI `/docs`
- [ ] Upload file lớn không block server — trả về `processing` ngay, `GET /documents/{id}` phản ánh đúng trạng thái sau khi xong
- [ ] Error handling rõ ràng: sai định dạng file → 400, document không tồn tại → 404, document chưa ready mà hỏi → 409
- [ ] `chat_history` lưu đúng vào PostgreSQL, `GET /chat/{id}/history` trả đúng thứ tự thời gian
- [ ] Xóa document xóa sạch cả PostgreSQL lẫn Chroma, không để sót dữ liệu mồ côi

→ Xong Phase 06, chuyển sang **Phase 07: Frontend Chat UI**.
