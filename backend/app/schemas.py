"""Pydantic models cho request/response của API."""
from typing import Optional
from pydantic import BaseModel

class DocumentInfo(BaseModel):
    id: str
    filename: str
    source_type: str
    status: str                    # "processing" | "ready" | "failed"
    chunk_count: int = 0
    error: Optional[str] = None
    uploaded_at: str

class UploadResponse(BaseModel):
    document_id: str
    filename: str
    status: str

class ChatRequest(BaseModel):
    question: str
    use_rerank: bool = True

class CitationOut(BaseModel):
    ref: int
    source_file: str
    location: str
    snippet: str

class ChatResponse(BaseModel):
    answer: str
    citations: list[CitationOut]
    found_answer: bool

class ChatTurn(BaseModel):
    question: str
    answer: str
    citations: list[CitationOut] = []
    found_answer: bool = True
    created_at: str
