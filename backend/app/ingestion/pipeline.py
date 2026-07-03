import os
from app.ingestion.pdf_parser import parse_pdf
from app.ingestion.notebook_parser import parse_notebook
from app.ingestion.chunker import chunk_pdf_pages, chunk_notebook_cells
from app.embedding.embedder import embed_batch
from app.db.chroma_client import add_chunks

def ingest_document(file_path: str, document_id: str) -> int:
    filename = os.path.basename(file_path)
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        pages = parse_pdf(file_path)
        chunks = chunk_pdf_pages(pages, document_id=document_id, source_file=filename)
    elif ext == ".ipynb":
        cells = parse_notebook(file_path)
        chunks = chunk_notebook_cells(cells, document_id=document_id, source_file=filename)
    else:
        raise ValueError(f"Định dạng file không được hỗ trợ: {ext}")

    if not chunks:
        return 0

    embeddings = embed_batch([c.text for c in chunks])
    add_chunks(chunks, embeddings)
    return len(chunks)
