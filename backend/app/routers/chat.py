"""API chat: hỏi (RAG answer + citation) và lấy lịch sử."""
from fastapi import APIRouter, HTTPException
from app.schemas import ChatRequest, ChatResponse, ChatTurn, CitationOut
from app.db import document_store, chat_store
from app.rag.generator import generate_answer

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/{document_id}", response_model=ChatResponse)
def chat(document_id: str, req: ChatRequest):
    doc = document_store.get(document_id)
    if doc is None:
        raise HTTPException(404, "Không tìm thấy tài liệu")
    if doc["status"] != "ready":
        raise HTTPException(409, f"Tài liệu chưa sẵn sàng (status={doc['status']})")

    # Lấy lịch sử để hỗ trợ câu hỏi follow-up.
    history = [{"question": t["question"], "answer": t["answer"]} for t in chat_store.get_history(document_id)]

    try:
        result = generate_answer(
            req.question, document_id=document_id, history=history, use_rerank=req.use_rerank
        )
    except Exception as e:  # noqa: BLE001 — bọc lỗi LLM/API thành 502 cho client
        raise HTTPException(502, f"Lỗi khi sinh câu trả lời: {e}")

    citations = [
        CitationOut(ref=c.ref, source_file=c.source_file, location=c.location, snippet=c.snippet)
        for c in result.citations
    ]
    chat_store.append(
        document_id, req.question, result.answer,
        citations=[c.model_dump() for c in citations], found_answer=result.found_answer,
    )
    return ChatResponse(answer=result.answer, citations=citations, found_answer=result.found_answer)

@router.get("/{document_id}/history", response_model=list[ChatTurn])
def get_history(document_id: str):
    if document_store.get(document_id) is None:
        raise HTTPException(404, "Không tìm thấy tài liệu")
    return chat_store.get_history(document_id)
