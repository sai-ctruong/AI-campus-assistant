from typing import Optional
import chromadb
from app.config import settings

_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
_COLLECTION_NAME = "documents"
_MAX_ADD_BATCH_SIZE = 166  # giới hạn batch insert của ChromaDB local (SQLite backend)

def get_collection():
    return _client.get_or_create_collection(_COLLECTION_NAME)

def add_chunks(chunks, embeddings: list[list[float]]) -> None:
    if not chunks:
        return
    collection = get_collection()
    for start in range(0, len(chunks), _MAX_ADD_BATCH_SIZE):
        batch_chunks = chunks[start:start + _MAX_ADD_BATCH_SIZE]
        batch_embeddings = embeddings[start:start + _MAX_ADD_BATCH_SIZE]
        collection.add(
            ids=[c.id for c in batch_chunks],
            embeddings=batch_embeddings,
            documents=[c.text for c in batch_chunks],
            metadatas=[c.metadata for c in batch_chunks],
        )

def query(query_embedding: list[float], top_k: int = 5, document_id: Optional[str] = None):
    collection = get_collection()
    where = {"document_id": document_id} if document_id else None
    return collection.query(query_embeddings=[query_embedding], n_results=top_k, where=where)

def get_document_chunks(document_id: Optional[str] = None) -> list[dict]:
    """Lấy toàn bộ chunk (text + metadata) của 1 document — dùng để build BM25 index."""
    collection = get_collection()
    where = {"document_id": document_id} if document_id else None
    res = collection.get(where=where, include=["documents", "metadatas"])
    return [
        {"id": _id, "text": doc, "metadata": meta}
        for _id, doc, meta in zip(res["ids"], res["documents"], res["metadatas"])
    ]

def delete_document(document_id: str) -> None:
    collection = get_collection()
    collection.delete(where={"document_id": document_id})
