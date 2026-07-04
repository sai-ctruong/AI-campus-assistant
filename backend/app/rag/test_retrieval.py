"""Test Phase 4: so sánh vector / BM25 / hybrid / hybrid+rerank trên dữ liệu đã ingest.

Chạy: python -m app.rag.test_retrieval
(Dùng dữ liệu có sẵn trong ChromaDB, không ingest lại.)
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")

from app.rag.retriever import vector_search, bm25_search, hybrid_retrieve

DOCUMENT_ID = "doc-test-1"
QUESTIONS = [
    "thì hiện tại hoàn thành",
    "mẹo làm bài đọc hiểu reading",
    "các dạng câu trong TOEIC",
]

def _show(title, results):
    print(f"  {title}")
    for r in results:
        page = r.metadata.get("page_number", "?")
        print(f"    trang {page:>3}  score={r.score:.4f}")

for q in QUESTIONS:
    print(f"\n### Câu hỏi: {q}")
    _show("Vector:", vector_search(q, top_k=5, document_id=DOCUMENT_ID))
    _show("BM25:  ", bm25_search(q, top_k=5, document_id=DOCUMENT_ID))
    hybrid = hybrid_retrieve(q, top_k=5, document_id=DOCUMENT_ID)
    _show("Hybrid:", hybrid)

    # Rerank là bước tùy chọn (cần sentence-transformers). Bỏ qua nếu chưa cài.
    try:
        from app.rag.reranker import rerank
        candidates = hybrid_retrieve(q, top_k=20, document_id=DOCUMENT_ID)
        _show("Rerank:", rerank(q, candidates, top_k=5))
    except ImportError:
        print("    (bỏ qua rerank — chưa cài sentence-transformers)")
