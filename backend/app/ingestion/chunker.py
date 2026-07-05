from dataclasses import dataclass, field
import uuid

@dataclass
class Chunk:
    id: str
    text: str
    metadata: dict = field(default_factory=dict)

def _split_fixed_size(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    words = text.split()
    if len(words) <= chunk_size:
        return [text]
    chunks = []
    step = chunk_size - overlap
    for start in range(0, len(words), step):
        chunk_words = words[start:start + chunk_size]
        chunks.append(" ".join(chunk_words))
        if start + chunk_size >= len(words):
            break
    return chunks

def chunk_pdf_pages(pages, document_id: str, source_file: str) -> list[Chunk]:
    chunks: list[Chunk] = []
    for page in pages:
        if page.is_scanned or not page.text:
            continue  # TODO: xử lý OCR ở bước riêng, bỏ qua trong MVP
        sub_texts = _split_fixed_size(page.text, chunk_size=500, overlap=50)
        for idx, sub_text in enumerate(sub_texts):
            chunks.append(Chunk(
                id=str(uuid.uuid4()),
                text=sub_text,
                metadata={
                    "document_id": document_id,
                    "source_file": source_file,
                    "page_number": page.page_number,
                    "chunk_index": idx,
                    "source_type": "pdf",
                },
            ))
    return chunks

def chunk_docx_text(text: str, document_id: str, source_file: str) -> list[Chunk]:
    if not text.strip():
        return []
    chunks: list[Chunk] = []
    for idx, sub_text in enumerate(_split_fixed_size(text, chunk_size=500, overlap=50)):
        chunks.append(Chunk(
            id=str(uuid.uuid4()),
            text=sub_text,
            metadata={
                "document_id": document_id,
                "source_file": source_file,
                "section_index": idx,
                "chunk_index": idx,
                "source_type": "docx",
            },
        ))
    return chunks

def chunk_notebook_cells(cells, document_id: str, source_file: str) -> list[Chunk]:
    chunks: list[Chunk] = []
    for cell in cells:
        chunks.append(Chunk(
            id=str(uuid.uuid4()),
            text=cell.source,
            metadata={
                "document_id": document_id,
                "source_file": source_file,
                "cell_index": cell.cell_index,
                "cell_type": cell.cell_type,
                "source_type": "notebook",
            },
        ))
    return chunks