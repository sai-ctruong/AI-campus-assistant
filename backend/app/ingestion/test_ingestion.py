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