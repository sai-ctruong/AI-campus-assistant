# Phase 03 — Embedding & Vector Store (ChromaDB)

## 1. Lý thuyết

### 1.1 Embedding là gì?
Một model (khác LLM sinh text) biến 1 đoạn văn bản thành 1 vector số thực (ví dụ 768 chiều), sao cho 2 đoạn có ý nghĩa gần nhau thì vector của chúng gần nhau khi đo bằng **cosine similarity**:
```
cosine_sim(A, B) = (A · B) / (‖A‖ × ‖B‖)
```
Giá trị càng gần 1 → càng giống nghĩa.

### 1.2 Chọn embedding model
Slide/giáo trình đại học VN thường lẫn cả tiếng Việt và tiếng Anh (thuật ngữ) → phải dùng model đa ngôn ngữ:
- **`text-embedding-004`** (Gemini API) — khuyến nghị, cùng hệ sinh thái với LLM đang dùng.
- **`intfloat/multilingual-e5-base`** (Sentence-Transformers, chạy local/free) — dùng nếu muốn tiết kiệm API quota hoặc offline.

### 1.3 ChromaDB hoạt động thế nào?
- Một **collection** giống 1 bảng: mỗi record gồm `id`, `embedding`, `document` (text gốc), `metadata`.
- Khi `collection.query(query_texts=[...])`, Chroma tự embed câu hỏi (nếu gắn embedding function) rồi tìm k-nearest-neighbors bằng cosine.
- **1 collection chung + filter theo `document_id`** dễ quản lý hơn nhiều collection riêng — khuyến nghị dùng cách này.

---

## 2. Code

### 2.1 `backend/app/embedding/embedder.py`
```python
from google import genai
from app.config import settings

_client = genai.Client(api_key=settings.gemini_api_key)
EMBED_MODEL = "text-embedding-004"

def embed_batch(texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
    """Luôn batch thay vì gọi từng chunk — tiết kiệm API call và nhanh hơn nhiều."""
    if not texts:
        return []
    result = _client.models.embed_content(
        model=EMBED_MODEL,
        contents=texts,
        config={"task_type": task_type},
    )
    return [e.values for e in result.embeddings]

def embed_query(query: str) -> list[float]:
    """Query dùng task_type khác với document để tối ưu retrieval theo hướng dẫn Gemini."""
    return embed_batch([query], task_type="RETRIEVAL_QUERY")[0]
```

> Lưu ý: `task_type=RETRIEVAL_DOCUMENT` khi embed chunk lưu vào DB, `RETRIEVAL_QUERY` khi embed câu hỏi user — Gemini tối ưu vector khác nhau cho 2 vai trò này, đừng dùng lẫn.

### 2.2 `backend/app/embedding/vector_store.py`
```python
import chromadb
from app.config import settings
from app.embedding.embedder import embed_batch, embed_query

_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
COLLECTION_NAME = "campus_documents"

def get_collection():
    return _client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

def store_chunks(chunks: list) -> None:
    """chunks: list[Chunk] từ chunker.py (Phase 02)."""
    if not chunks:
        return
    collection = get_collection()
    texts = [c.text for c in chunks]
    embeddings = embed_batch(texts)
    collection.add(
        ids=[c.id for c in chunks],
        embeddings=embeddings,
        documents=texts,
        metadatas=[c.metadata for c in chunks],
    )

def query_chunks(query: str, document_id: str, k: int = 5) -> dict:
    collection = get_collection()
    query_embedding = embed_query(query)
    return collection.query(
        query_embeddings=[query_embedding],
        n_results=k,
        where={"document_id": document_id},  # filter: chỉ tìm trong tài liệu user đang chọn
    )

def delete_document(document_id: str) -> None:
    collection = get_collection()
    collection.delete(where={"document_id": document_id})
```

### 2.3 Pipeline nối toàn bộ: `backend/app/ingestion/pipeline.py`
```python
import uuid
from app.ingestion.pdf_parser import parse_pdf
from app.ingestion.notebook_parser import parse_notebook
from app.ingestion.chunker import chunk_pdf_pages, chunk_notebook_cells
from app.embedding.vector_store import store_chunks

def ingest_document(file_path: str, filename: str) -> str:
    document_id = str(uuid.uuid4())

    if filename.lower().endswith(".pdf"):
        pages = parse_pdf(file_path)
        chunks = chunk_pdf_pages(pages, document_id, filename)
    elif filename.lower().endswith(".ipynb"):
        cells = parse_notebook(file_path)
        chunks = chunk_notebook_cells(cells, document_id, filename)
    else:
        raise ValueError(f"Định dạng không hỗ trợ: {filename}")

    store_chunks(chunks)
    return document_id
```

### 2.4 Test thử

`backend/scripts/test_vector_store.py`:
```python
import sys
sys.path.append("..")
from app.ingestion.pipeline import ingest_document
from app.embedding.vector_store import query_chunks

doc_id = ingest_document("../data/uploads/sample_slide.pdf", "sample_slide.pdf")
print("Đã ingest document_id:", doc_id)

results = query_chunks("kiến trúc mạng neural là gì", document_id=doc_id, k=5)
for doc, meta, dist in zip(results["documents"][0], results["metadatas"][0], results["distances"][0]):
    print(f"[dist={dist:.3f}] trang {meta.get('page_number')}: {doc[:150]}")
```

Đánh giá bằng mắt: top-5 kết quả có thật sự liên quan đến câu hỏi không? Nếu không, quay lại kiểm tra chất lượng chunk ở Phase 02 trước khi đổ lỗi cho retrieval.

---

## 3. Checklist hoàn thành Phase 03
- [ ] `embed_batch` chạy được, trả về vector đúng chiều (768 với `text-embedding-004`)
- [ ] Ingest 1 file → lưu vào ChromaDB thành công, không lỗi
- [ ] Query thử trả về chunk liên quan hợp lý (đánh giá thủ công)
- [ ] Metadata filter `document_id` hoạt động đúng — query tài liệu A không trả kết quả của tài liệu B
- [ ] `delete_document` xóa đúng, không để sót chunk mồ côi trong Chroma

→ Xong Phase 03, chuyển sang **Phase 04: RAG Retrieval Pipeline nâng cao**.
