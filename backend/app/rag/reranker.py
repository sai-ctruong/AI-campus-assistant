"""Cross-encoder reranking: chấm lại độ liên quan của top-k candidate chính xác hơn retrieval."""
from typing import Optional
from app.rag.retriever import RetrievedChunk

# Model đa ngôn ngữ (hỗ trợ tiếng Việt tốt hơn ms-marco tiếng Anh thuần).
_MODEL_NAME = "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1"
_model = None

def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import CrossEncoder  # import lazy: chỉ nạp torch khi thật sự rerank
        _model = CrossEncoder(_MODEL_NAME)
    return _model

def rerank(
    query_text: str, candidates: list[RetrievedChunk], top_k: int = 5
) -> list[RetrievedChunk]:
    if not candidates:
        return []
    pairs = [(query_text, c.text) for c in candidates]
    scores = _get_model().predict(pairs)
    ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)[:top_k]
    return [
        RetrievedChunk(id=c.id, text=c.text, metadata=c.metadata, score=float(s))
        for c, s in ranked
    ]
