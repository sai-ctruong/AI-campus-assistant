"""Test Phase 5: câu trả lời kèm citation, chống hallucination, conversation memory.

Chạy: python -m app.rag.test_generator   (dùng data đã ingest trong ChromaDB)
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")

from app.rag.generator import generate_answer

DOCUMENT_ID = "doc-test-1"

def _show(res):
    print(f"  found_answer = {res.found_answer}")
    print(f"  Trả lời: {res.answer}")
    if res.citations:
        print("  Trích dẫn:")
        for c in res.citations:
            print(f"    [{c.ref}] {c.source_file} — {c.location}")
    print()

# Case 1: câu hỏi trong phạm vi tài liệu → trả lời + citation
print("### Case 1: Câu hỏi có trong tài liệu")
res1 = generate_answer("Thì hiện tại hoàn thành dùng khi nào?", document_id=DOCUMENT_ID)
_show(res1)

# Case 2: câu hỏi NGOÀI phạm vi → phải từ chối, không bịa
print("### Case 2: Câu hỏi ngoài phạm vi tài liệu (chống hallucination)")
res2 = generate_answer("Cách nấu phở bò truyền thống gồm những bước nào?", document_id=DOCUMENT_ID)
_show(res2)

# Case 3: follow-up dùng conversation memory
print("### Case 3: Câu hỏi follow-up (conversation memory)")
history = [{"question": "Thì hiện tại hoàn thành là gì?", "answer": res1.answer}]
res3 = generate_answer("Còn cấu trúc của nó thì sao?", document_id=DOCUMENT_ID, history=history)
_show(res3)
