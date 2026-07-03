from dataclasses import dataclass
from pypdf import PdfReader

@dataclass
class PageContent:
    page_number: int
    text: str
    is_scanned: bool

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