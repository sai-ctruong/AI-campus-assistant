"""Hybrid retrieval: vector (semantic) + BM25 (lexical), gộp bằng Reciprocal Rank Fusion."""
import re
from dataclasses import dataclass
from typing import Optional
from rank_bm25 import BM25Okapi
from app.embedding.embedder import embed_query
from app.db.chroma_client import query as vector_query, get_document_chunks

@dataclass
class RetrievedChunk:
    id: str
    text: str
    metadata: dict
    score: float

# Cache BM25 index theo document_id để khỏi build lại mỗi query.
_bm25_cache: dict = {}

def _tokenize(text: str) -> list[str]:
    # Tách token đơn giản: hạ chữ thường + lấy các "từ" (chữ/số).
    # Tiếng Việt có khoảng trắng giữa các âm tiết nên whitespace-based là đủ dùng cho MVP.
    return re.findall(r"\w+", text.lower(), flags=re.UNICODE)

def vector_search(query_text: str, top_k: int, document_id: Optional[str] = None) -> list[RetrievedChunk]:
    res = vector_query(embed_query(query_text), top_k=top_k, document_id=document_id)
    if not res["ids"] or not res["ids"][0]:
        return []
    out = []
    for _id, doc, meta, dist in zip(
        res["ids"][0], res["documents"][0], res["metadatas"][0], res["distances"][0]
    ):
        out.append(RetrievedChunk(id=_id, text=doc, metadata=meta, score=1.0 - dist))
    return out

def _get_bm25(document_id: Optional[str]):
    if document_id in _bm25_cache:
        return _bm25_cache[document_id]
    corpus = get_document_chunks(document_id)
    if not corpus:
        return None, []
    bm25 = BM25Okapi([_tokenize(c["text"]) for c in corpus])
    _bm25_cache[document_id] = (bm25, corpus)
    return bm25, corpus

def bm25_search(query_text: str, top_k: int, document_id: Optional[str] = None) -> list[RetrievedChunk]:
    bm25, corpus = _get_bm25(document_id)
    if bm25 is None:
        return []
    scores = bm25.get_scores(_tokenize(query_text))
    ranked = sorted(zip(corpus, scores), key=lambda x: x[1], reverse=True)[:top_k]
    return [
        RetrievedChunk(id=c["id"], text=c["text"], metadata=c["metadata"], score=float(s))
        for c, s in ranked
    ]

def reciprocal_rank_fusion(
    result_lists: list[list[RetrievedChunk]], top_k: int = 5, k: int = 60
) -> list[RetrievedChunk]:
    """RRF: mỗi kết quả góp điểm 1/(k + rank). Gộp nhiều nguồn ranking khác nhau."""
    fused_scores: dict = {}
    data: dict = {}
    for results in result_lists:
        for rank, rc in enumerate(results):
            fused_scores[rc.id] = fused_scores.get(rc.id, 0.0) + 1.0 / (k + rank + 1)
            data[rc.id] = rc
    ranked = sorted(fused_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
    return [
        RetrievedChunk(id=_id, text=data[_id].text, metadata=data[_id].metadata, score=score)
        for _id, score in ranked
    ]

def hybrid_retrieve(
    query_text: str, top_k: int = 5, document_id: Optional[str] = None, candidate_k: int = 20
) -> list[RetrievedChunk]:
    """Lấy candidate_k từ mỗi nguồn (vector + BM25), gộp RRF, trả top_k."""
    vector_hits = vector_search(query_text, candidate_k, document_id)
    bm25_hits = bm25_search(query_text, candidate_k, document_id)
    return reciprocal_rank_fusion([vector_hits, bm25_hits], top_k=top_k)

def invalidate_bm25_cache(document_id: Optional[str] = None) -> None:
    """Gọi khi thêm/xóa chunk để BM25 index build lại lần query kế tiếp."""
    if document_id is None:
        _bm25_cache.clear()
    else:
        _bm25_cache.pop(document_id, None)
