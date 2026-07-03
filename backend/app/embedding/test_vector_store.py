import sys
sys.stdout.reconfigure(encoding="utf-8")

from app.ingestion.pipeline import ingest_document
from app.embedding.embedder import embed_query
from app.db.chroma_client import query

DOCUMENT_ID = "doc-test-1"

n = ingest_document("../data/uploads/sample_slide.pdf", document_id=DOCUMENT_ID)
print(f"Đã embed + lưu {n} chunks vào ChromaDB")

question = "cấu trúc và thành phần cơ bản của câu trong tiếng Anh"
result = query(embed_query(question), top_k=5, document_id=DOCUMENT_ID)

print(f"\nCâu hỏi: {question}")
for doc, meta, dist in zip(result["documents"][0], result["metadatas"][0], result["distances"][0]):
    print("---")
    print(meta, f"distance={dist:.4f}")
    print(doc[:200])
