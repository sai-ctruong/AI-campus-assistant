# Phase 02 — Document Ingestion Pipeline (Parse & Chunk)

## 1. Lý thuyết

### 1.1 Vì sao phải chunk?
Embedding model và LLM có giới hạn context. Nhét cả file PDF vào 1 embedding sẽ làm loãng ngữ nghĩa (semantic dilution) — vector đại diện cho "tất cả mọi thứ" thì không đại diện tốt cho "bất kỳ thứ gì". Chunk nhỏ hơn → mỗi vector mang ý nghĩa tập trung → retrieval chính xác hơn. Nhưng chunk quá nhỏ (ví dụ 1 câu) thì mất ngữ cảnh xung quanh.

### 1.2 Chiến lược chunking đã chọn cho project
| Loại tài liệu | Chiến lược | Lý do |
|---|---|---|
| PDF slide | 1 trang = 1 chunk | Slide vốn đã là 1 đơn vị ý nghĩa hoàn chỉnh |
| PDF giáo trình dài | Theo heading nếu detect được, fallback fixed-size 500 token + overlap 50 | Giữ cấu trúc chương/mục |
| Notebook `.ipynb` | 1 cell = 1 chunk | Cell là đơn vị logic tự nhiên, giữ `cell_type` |

### 1.3 Overlap
Overlap (10-15% chunk size) đảm bảo thông tin nằm vắt qua ranh giới 2 chunk không bị mất hoàn toàn — nếu câu trả lời nằm đúng chỗ cắt, chunk liền trước/sau vẫn "nhìn thấy" một phần.

### 1.4 Điểm mấu chốt: metadata
Mỗi chunk PHẢI mang `{source_file, page_number, chunk_index, document_id}`. Thiếu bước này thì Phase 05 (citation) không làm được — không thể lùi lại sửa dễ dàng vì phải re-ingest toàn bộ dữ liệu cũ.

---

## 2. Code

### 2.1 `backend/app/ingestion/pdf_parser.py`
```python
from dataclasses import dataclass
from pypdf import PdfReader

@dataclass
class PageContent:
    page_number: int  # 1-indexed
    text: str
    is_scanned: bool  # True nếu không extract được text (cần OCR sau này)

def parse_pdf(file_path: str) -> list[PageContent]:
    reader = PdfReader(file_path)
    pages: list[PageContent] = []
    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        pages.append(PageContent(
            page_number=i,
            text=text,
            is_scanned=len(text) < 10,  # heuristic: gần như trống -> có thể là ảnh scan
        ))
    return pages
```

### 2.2 `backend/app/ingestion/notebook_parser.py`
```python
from dataclasses import dataclass
import nbformat

@dataclass
class NotebookCell:
    cell_index: int
    cell_type: str  # "code" | "markdown"
    source: str

def parse_notebook(file_path: str) -> list[NotebookCell]:
    nb = nbformat.read(file_path, as_version=4)
    cells: list[NotebookCell] = []
    for i, cell in enumerate(nb.cells):
        source = cell.get("source", "").strip()
        if not source:
            continue
        cells.append(NotebookCell(
            cell_index=i,
            cell_type=cell.get("cell_type", "code"),
            source=source,
        ))
    return cells
```

### 2.3 `backend/app/ingestion/chunker.py`
```python
from dataclasses import dataclass, field
import uuid

@dataclass
class Chunk:
    id: str
    text: str
    metadata: dict = field(default_factory=dict)

def _split_fixed_size(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Chunk theo số từ (word count), overlap là số từ lặp lại giữa 2 chunk liền kề."""
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
    """1 trang PDF slide = 1 chunk tự nhiên. Nếu trang quá dài, fallback fixed-size."""
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
```

### 2.4 Test thử end-to-end (script tay, không phải unit test chính thức)

`backend/scripts/test_ingestion.py`:
```python
import sys
sys.path.append("..")
from app.ingestion.pdf_parser import parse_pdf
from app.ingestion.chunker import chunk_pdf_pages

pages = parse_pdf("../data/uploads/sample_slide.pdf")
chunks = chunk_pdf_pages(pages, document_id="doc-test-1", source_file="sample_slide.pdf")

print(f"Tổng số trang: {len(pages)}")
print(f"Tổng số chunk: {len(chunks)}")
for c in chunks[:3]:
    print("---")
    print(c.metadata)
    print(c.text[:200])
```

Chạy: `python scripts/test_ingestion.py` — đọc kỹ output, kiểm tra bằng mắt xem chunk có "đúng vibe" không (không bị cắt giữa câu quá thô, metadata đầy đủ trang).

---

## 3. Checklist hoàn thành Phase 02
- [ ] Parse được PDF text-based, giữ đúng số trang
- [ ] Parse được `.ipynb`, giữ `cell_type` + `cell_index`
- [ ] Chunk có overlap, có đầy đủ metadata `{document_id, source_file, page_number/cell_index, chunk_index}`
- [ ] Test với 1 file slide thật, in ra list chunk để kiểm tra chất lượng bằng mắt
- [ ] Xử lý case trang PDF là ảnh scan (`is_scanned=True`) — tối thiểu là bỏ qua có log rõ ràng, không crash

→ Xong Phase 02, chuyển sang **Phase 03: Embedding & Vector Store**.
