"""API tài liệu: upload (async ingest), list, delete."""
import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from app.config import settings
from app.schemas import DocumentInfo, UploadResponse
from app.db import document_store, chat_store, quiz_store
from app.db.chroma_client import delete_document
from app.ingestion.pipeline import ingest_document
from app.rag.retriever import invalidate_bm25_cache

router = APIRouter(prefix="/documents", tags=["documents"])

_ALLOWED_EXT = {".pdf": "pdf", ".ipynb": "notebook", ".docx": "docx"}

def _doc_dir(document_id: str) -> str:
    return os.path.join(settings.upload_dir, document_id)

def _run_ingestion(document_id: str, file_path: str) -> None:
    """Chạy nền: parse → chunk → embed → store. Cập nhật status khi xong/lỗi."""
    try:
        n = ingest_document(file_path, document_id)
        if n == 0:
            # PDF scan / không có lớp text → không tạo được đoạn nào. Chưa hỗ trợ OCR.
            document_store.update(
                document_id,
                status="failed",
                chunk_count=0,
                error="Không trích xuất được văn bản (có thể là PDF scan — chưa hỗ trợ OCR).",
            )
            return
        invalidate_bm25_cache(document_id)
        document_store.update(document_id, status="ready", chunk_count=n)
    except Exception as e:  # noqa: BLE001 — ghi lỗi vào record để client thấy
        document_store.update(document_id, status="failed", error=str(e))

@router.post("/upload", response_model=UploadResponse)
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in _ALLOWED_EXT:
        raise HTTPException(400, f"Chỉ hỗ trợ file {', '.join(_ALLOWED_EXT)} — nhận được '{ext}'")

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_upload_mb:
        raise HTTPException(413, f"File quá lớn ({size_mb:.1f}MB > {settings.max_upload_mb}MB)")

    document_id = str(uuid.uuid4())
    doc_dir = _doc_dir(document_id)
    os.makedirs(doc_dir, exist_ok=True)
    file_path = os.path.join(doc_dir, file.filename)
    with open(file_path, "wb") as f:
        f.write(content)

    document_store.add(document_id, filename=file.filename, source_type=_ALLOWED_EXT[ext])
    background_tasks.add_task(_run_ingestion, document_id, file_path)

    return UploadResponse(document_id=document_id, filename=file.filename, status="processing")

@router.get("", response_model=list[DocumentInfo])
def list_documents():
    return document_store.list_all()

@router.delete("/{document_id}")
def delete_document_endpoint(document_id: str):
    if document_store.get(document_id) is None:
        raise HTTPException(404, "Không tìm thấy tài liệu")
    delete_document(document_id)              # xóa vector trong ChromaDB
    invalidate_bm25_cache(document_id)
    chat_store.delete_for_document(document_id)
    quiz_store.delete_for_document(document_id)
    shutil.rmtree(_doc_dir(document_id), ignore_errors=True)
    document_store.delete(document_id)
    return {"status": "deleted", "document_id": document_id}
