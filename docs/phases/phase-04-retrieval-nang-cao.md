# Phase 04 — RAG Retrieval Pipeline nâng cao (Hybrid Search + Reranking)

## 1. Lý thuyết

### 1.1 Nhược điểm của vector search đơn thuần
Semantic search đôi khi bỏ sót khi câu hỏi chứa từ khóa chính xác (tên hàm, thuật ngữ riêng, mã môn học...) mà không "gần nghĩa" theo embedding — vì embedding tối ưu cho ngữ nghĩa tổng thể, không phải khớp từ khóa chính xác.

### 1.2 Giải pháp: Hybrid retrieval
Kết hợp:
- **Vector search** (semantic, đã có ở Phase 03) — bắt được ý nghĩa dù không trùng từ.
- **BM25** (lexical/keyword, thuật toán TF-IDF cải tiến) — bắt chính xác từ khóa.

Merge 2 danh sách kết quả bằng **Reciprocal Rank Fusion (RRF)**:
```
score(doc) = Σ 1 / (k + rank_i(doc))
```
với `k` thường = 60, `rank_i` là thứ hạng của doc trong danh sách kết quả thứ i (1-indexed). Doc xuất hiện ở top của cả 2 nguồn sẽ có điểm cao nhất.

### 1.3 Reranking bằng Cross-Encoder
Sau khi lấy top-20 (nhanh nhưng thô) từ hybrid retrieval, dùng **Cross-Encoder** — model chấm điểm độ liên quan (query, document) theo cặp, chính xác hơn nhiều so với so sánh 2 vector độc lập (bi-encoder) vì model "nhìn" cả câu hỏi và document cùng lúc. Chỉ giữ lại top-5 cuối cùng đưa vào LLM.

Trade-off: Cross-Encoder chậm hơn nhiều so với vector search → chỉ áp dụng trên tập nhỏ (20 candidate), không áp dụng trên toàn bộ corpus.

### 1.4 Query transformation (V2, có thể bỏ qua ở MVP)
Dùng LLM viết lại câu hỏi user cho rõ ràng hơn trước khi retrieve (ví dụ câu hỏi follow-up ngắn "còn phần kia thì sao?" → viết lại thành câu đầy đủ ngữ cảnh).

---

## 2. Code

### 2.1 BM25 index: `backend/app/rag/bm25_index.py`
```python
from rank_bm25 import BM25Okapi
import re

def _tokenize(text: str) -> list[str]:
    # Tokenize đơn giản: lowercase + tách theo non-alphanumeric.
    # Với tiếng Việt có dấu, BM25 vẫn hoạt động tốt ở mức từ (word-level) vì không cần stemming.
    return re.findall(r"\w+", text.lower())

class BM25Index:
    def __init__(self, chunk_ids: list[str], texts: list[str]):
        self.chunk_ids = chunk_ids
        self.tokenized_corpus = [_tokenize(t) for t in texts]
        self.bm25 = BM25Okapi(self.tokenized_corpus)

    def search(self, query: str, k: int = 20) -> list[tuple[str, float]]:
        scores = self.bm25.get_scores(_tokenize(query))
        ranked = sorted(zip(self.chunk_ids, scores), key=lambda x: x[1], reverse=True)
        return ranked[:k]
```

> Lưu ý: BM25 cần build lại index mỗi khi có chunk mới — với MVP, build theo `document_id` on-the-fly khi user chọn tài liệu (đọc toàn bộ chunk của document đó từ Chroma, build index tạm trong RAM). Nếu corpus lớn, cân nhắc cache index theo `document_id`.

### 2.2 Lấy toàn bộ chunk của 1 document từ Chroma: thêm hàm vào `vector_store.py`
```python
def get_all_chunks_by_document(document_id: str) -> dict:
    collection = get_collection()
    return collection.get(where={"document_id": document_id}, include=["documents", "metadatas"])
```

### 2.3 Hybrid retrieval + RRF: `backend/app/rag/hybrid_retriever.py`
```python
from app.embedding.vector_store import query_chunks, get_all_chunks_by_document
from app.rag.bm25_index import BM25Index

def reciprocal_rank_fusion(rank_lists: list[list[str]], k: int = 60) -> list[str]:
    scores: dict[str, float] = {}
    for rank_list in rank_lists:
        for rank, chunk_id in enumerate(rank_list, start=1):
            scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (k + rank)
    return [cid for cid, _ in sorted(scores.items(), key=lambda x: x[1], reverse=True)]

def hybrid_search(query: str, document_id: str, top_k: int = 20) -> list[dict]:
    # 1. Vector search
    vector_results = query_chunks(query, document_id, k=top_k)
    vector_ids = vector_results["ids"][0]

    # 2. BM25 search (build index tạm từ toàn bộ chunk của document)
    all_chunks = get_all_chunks_by_document(document_id)
    bm25_index = BM25Index(all_chunks["ids"], all_chunks["documents"])
    bm25_results = bm25_index.search(query, k=top_k)
    bm25_ids = [cid for cid, _ in bm25_results]

    # 3. Merge bằng RRF
    fused_ids = reciprocal_rank_fusion([vector_ids, bm25_ids])[:top_k]

    # 4. Map lại text + metadata theo id
    id_to_text = dict(zip(all_chunks["ids"], all_chunks["documents"]))
    id_to_meta = dict(zip(all_chunks["ids"], all_chunks["metadatas"]))

    return [
        {"id": cid, "text": id_to_text.get(cid, ""), "metadata": id_to_meta.get(cid, {})}
        for cid in fused_ids
        if cid in id_to_text
    ]
```

### 2.4 Cross-Encoder reranker: `backend/app/rag/reranker.py`
```python
from sentence_transformers import CrossEncoder

_reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
# Nếu cần đa ngôn ngữ tốt hơn cho tiếng Việt, thay bằng:
# "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1"

def rerank(query: str, candidates: list[dict], top_k: int = 5) -> list[dict]:
    if not candidates:
        return []
    pairs = [(query, c["text"]) for c in candidates]
    scores = _reranker.predict(pairs)
    for c, s in zip(candidates, scores):
        c["rerank_score"] = float(s)
    ranked = sorted(candidates, key=lambda x: x["rerank_score"], reverse=True)
    return ranked[:top_k]
```

Thêm `sentence-transformers==3.1.1` vào `requirements.txt`.

### 2.5 Hàm tổng hợp dùng ở Phase 05: `backend/app/rag/retriever.py`
```python
from app.rag.hybrid_retriever import hybrid_search
from app.rag.reranker import rerank

def retrieve(query: str, document_id: str, use_hybrid: bool = True, use_rerank: bool = True) -> list[dict]:
    if use_hybrid:
        candidates = hybrid_search(query, document_id, top_k=20)
    else:
        from app.embedding.vector_store import query_chunks
        results = query_chunks(query, document_id, k=20)
        candidates = [
            {"id": i, "text": d, "metadata": m}
            for i, d, m in zip(results["ids"][0], results["documents"][0], results["metadatas"][0])
        ]

    if use_rerank:
        return rerank(query, candidates, top_k=5)
    return candidates[:5]
```

### 2.6 Test so sánh trước/sau

`backend/scripts/test_retrieval.py`:
```python
import sys
sys.path.append("..")
from app.rag.retriever import retrieve

QUESTIONS = ["định nghĩa overfitting là gì", "hàm loss function nào dùng cho classification"]
DOC_ID = "doc-test-1"

for q in QUESTIONS:
    print(f"\n=== Query: {q} ===")
    print("-- MVP (vector only) --")
    for r in retrieve(q, DOC_ID, use_hybrid=False, use_rerank=False):
        print(r["metadata"].get("page_number"), r["text"][:100])
    print("-- Hybrid + Rerank --")
    for r in retrieve(q, DOC_ID, use_hybrid=True, use_rerank=True):
        print(r["metadata"].get("page_number"), round(r.get("rerank_score", 0), 3), r["text"][:100])
```

---

## 3. Checklist hoàn thành Phase 04
- [ ] MVP retrieval (vector-only) vẫn hoạt động — không phá code cũ
- [ ] BM25 search chạy được trên chunk của 1 document
- [ ] RRF merge đúng công thức, không lỗi khi 1 trong 2 danh sách rỗng
- [ ] Cross-Encoder rerank chạy được, trả về `rerank_score` hợp lý
- [ ] So sánh bằng vài câu hỏi test set tự tạo, thấy rõ hybrid+rerank cho kết quả liên quan hơn vector-only ở các câu hỏi chứa từ khóa/thuật ngữ riêng

→ Xong Phase 04, chuyển sang **Phase 05: LLM Integration & Citation**.
