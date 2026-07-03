# AI Campus Assistant — Roadmap Chi Tiết Từng Giai Đoạn

> Mục tiêu: RAG-based study assistant cho sinh viên AI/IT — chat với slide/PDF/notebook, sinh quiz, giải thích code, theo dõi tiến độ học, voice mode tiếng Việt.
>
> Nguyên tắc xuyên suốt: **hiểu trước khi code**. Mỗi giai đoạn dưới đây có (1) mục tiêu, (2) khái niệm cần nắm, (3) các bước triển khai (mô tả, không paste code sẵn), (4) checklist để bạn tự kiểm tra khi xong.

---

## GIAI ĐOẠN 0 — Xác định phạm vi & kiến trúc tổng thể

**Mục tiêu:** Trước khi mở VS Code, bạn cần trả lời được 5 câu hỏi, vì chúng quyết định toàn bộ kiến trúc sau này.

1. **Nguồn tài liệu đầu vào là gì?** PDF slide, PDF giáo trình (text-based hay scan?), file `.ipynb` — mỗi loại cần một bộ parser khác nhau. Nếu PDF là scan (ảnh), bạn cần thêm OCR (Tesseract hoặc thư viện `pdf-reading` skill đã có sẵn trong môi trường Claude của bạn để tham khảo cách extract).
2. **LLM dùng API (OpenAI/Gemini) hay local (Llama/Qwen qua Ollama)?** API thì nhanh, chất lượng cao, tốn phí. Local thì free, chạy được offline, nhưng cần GPU đủ mạnh và quality thấp hơn. Với deadline dự án sinh viên, mình khuyên **bắt đầu bằng API (Gemini có free tier hào phóng)**, sau đó nếu muốn mở rộng thì thêm local LLM như một lựa chọn thứ hai.
3. **Vector DB: ChromaDB hay FAISS?** ChromaDB có sẵn persistence, metadata filtering, dễ dùng cho beginner. FAISS nhanh hơn ở scale lớn nhưng bạn phải tự quản lý metadata/persistence. → **Chọn ChromaDB** cho project này (dễ, đủ nhanh với vài trăm-vài nghìn chunks).
4. **Kiến trúc tổng thể** (vẽ ra giấy trước khi code):
   ```
   [User] → [React Frontend] → [FastAPI Backend]
                                      ↓
                        ┌─────────────┼─────────────┐
                        ↓             ↓              ↓
                 [Ingestion]   [RAG Pipeline]   [PostgreSQL]
                 (parse/chunk)  (retrieve+LLM)   (users, chat
                        ↓             ↓            history, progress)
                 [ChromaDB]  ←────────┘
                 (embeddings)
   ```
5. **MVP là gì?** Đừng làm hết 6 tính năng cùng lúc. Thứ tự ưu tiên đề xuất:
   - MVP (bắt buộc có để demo): Chat với tài liệu + trích dẫn nguồn
   - V2: Tạo đề ôn tập (quiz/flashcard)
   - V3: Giải thích code notebook
   - V4: Theo dõi tiến độ học
   - V5 (nice-to-have, làm sau cùng): Voice mode

**Checklist giai đoạn 0:**
- [ ] Đã liệt kê rõ loại tài liệu sẽ hỗ trợ (PDF text, PDF scan, ipynb, docx?)
- [ ] Đã chọn LLM provider
- [ ] Đã vẽ sơ đồ kiến trúc trên giấy/draw.io
- [ ] Đã viết ra MVP scope (giới hạn rõ ràng, ví dụ: "MVP chỉ hỗ trợ PDF text-based, chat + citation, không có voice")

---

## GIAI ĐOẠN 1 — Setup môi trường & khung dự án

**Mục tiêu:** Có một repo chạy được "Hello World" cho cả backend và frontend, kết nối được với nhau.

**Các bước:**

1. **Cấu trúc thư mục gốc** — tách rõ backend/frontend/data ngay từ đầu:
   ```
   ai-campus-assistant/
   ├── backend/          # FastAPI app
   ├── frontend/         # React app
   ├── data/             # nơi lưu file upload tạm, chroma persist dir
   └── CLAUDE.md hoặc CONTEXT.md   # (bạn đã quen dùng file này rồi — 
                                     ghi lại decisions, API contracts để
                                     Claude Code nhớ context giữa các session)
   ```
2. **Backend**: tạo virtual environment (`venv` hoặc `conda`), cài FastAPI + Uvicorn, viết 1 endpoint `/health` trả về `{"status": "ok"}`. Chạy thử bằng `uvicorn main:app --reload`.
3. **Frontend**: dùng Vite + React + TypeScript (bạn đã quen bộ này từ project Neural Maze portfolio rồi). Cài Tailwind luôn từ đầu để không phải setup lại sau.
4. **Kết nối thử**: frontend gọi `fetch` tới `/health` của backend, hiển thị kết quả ra màn hình. Đây là bước "bắt tay" quan trọng — nếu CORS lỗi thì sửa ngay ở đây (thêm `CORSMiddleware` trong FastAPI) trước khi build tính năng phức tạp.
5. **Quản lý secrets**: tạo `.env` cho API key (Gemini/OpenAI), thêm vào `.gitignore` ngay lập tức — đừng để lộ key.

**Checklist:**
- [ ] `uvicorn` chạy, `/health` trả 200
- [ ] React app chạy, gọi được `/health` từ backend, không lỗi CORS
- [ ] `.env` + `.gitignore` đã setup đúng

---

## GIAI ĐOẠN 2 — Document Ingestion Pipeline (Parse & Chunk)

**Mục tiêu:** Biến 1 file PDF/notebook thành các "chunks" văn bản sẵn sàng để embed.

**Khái niệm cần hiểu trước:**
- **Tại sao phải chunk?** LLM và embedding model có giới hạn context. Nếu nhét cả cuốn giáo trình vào 1 lần, embedding sẽ mất chi tiết (semantic dilution). Chunk nhỏ → tìm kiếm chính xác hơn, nhưng quá nhỏ thì mất ngữ cảnh.
- **Chunking strategy nào?**
  - *Fixed-size chunking* (ví dụ 500 tokens, overlap 50): đơn giản, nhanh, nhưng có thể cắt ngang giữa câu/ý.
  - *Semantic/structure-based chunking*: cắt theo heading, theo slide, theo đoạn văn — giữ ngữ nghĩa tốt hơn, phù hợp với slide PDF (mỗi slide = 1 chunk tự nhiên) và notebook (mỗi cell = 1 chunk tự nhiên).
  - → **Khuyến nghị cho project của bạn**: PDF slide → chunk theo từng trang/slide (vì slide vốn đã là 1 đơn vị ý nghĩa hoàn chỉnh). PDF giáo trình dài → chunk theo heading nếu có, fallback fixed-size overlap nếu không detect được cấu trúc. Notebook → chunk theo cell, giữ nguyên metadata "đây là code cell hay markdown cell".
- **Overlap là gì và tại sao cần?** Overlap (ví dụ 10-15% chunk size) giúp không bị mất thông tin nằm vắt qua ranh giới 2 chunk.

**Các bước triển khai (mô tả, bạn tự code theo logic này):**
1. Viết module `ingestion/pdf_parser.py`: dùng `pypdf` hoặc `pdfplumber` để extract text theo từng trang, giữ lại số trang (quan trọng cho citation sau này!). Nếu trang không có text (scan) → flag để xử lý OCR riêng.
2. Viết module `ingestion/notebook_parser.py`: dùng thư viện `nbformat` để đọc `.ipynb`, tách từng cell, gắn metadata `cell_type` (code/markdown) và `cell_index`.
3. Viết module `ingestion/chunker.py`: nhận vào text đã parse + metadata (nguồn file, số trang), trả ra list chunk kèm metadata. Đây là chỗ bạn quyết định chunking strategy ở trên.
4. **Điểm mấu chốt**: mỗi chunk PHẢI mang theo metadata `{source_file, page_number, chunk_index}` — nếu thiếu bước này ngay từ đầu, bạn sẽ không thể làm tính năng "trích dẫn nguồn" ở Giai đoạn 5.

**Checklist:**
- [ ] Parse được PDF text-based, giữ số trang
- [ ] Parse được notebook, giữ cell_type
- [ ] Chunk có overlap, có metadata đầy đủ
- [ ] Test thử với 1 file slide thật của bạn ở HCMUTE, in ra list chunks để mắt kiểm tra chất lượng

---

## GIAI ĐOẠN 3 — Embedding & Vector Store

**Mục tiêu:** Biến chunks thành vector và lưu vào ChromaDB để tìm kiếm semantic sau này.

**Khái niệm cần hiểu:**
- **Embedding là gì?** Một model (không phải LLM sinh text) biến đoạn văn bản thành 1 vector số (ví dụ 384 hoặc 768 chiều) sao cho 2 đoạn văn có ý nghĩa gần nhau thì vector gần nhau (đo bằng cosine similarity). Đây chính là kiến thức bạn đã làm trong project NLP Semantic Similarity của mình (MiniLM Bi-Encoder) — áp dụng lại được luôn!
- **Chọn embedding model nào?** Với tiếng Việt + tiếng Anh lẫn lộn (slide đại học VN thường có cả 2), khuyến nghị dùng model đa ngôn ngữ: `text-embedding-004` (Gemini, qua API) hoặc nếu muốn local/free: `intfloat/multilingual-e5-base` (Sentence Transformers). Đừng dùng model chỉ train tiếng Anh nếu tài liệu có tiếng Việt.
- **ChromaDB hoạt động thế nào?** Là 1 "collection" — giống 1 bảng — mỗi record gồm `id`, `embedding vector`, `document text`, `metadata`. Khi query, ChromaDB tự tính embedding cho câu hỏi rồi tìm k-nearest-neighbors bằng cosine similarity.

**Các bước:**
1. Viết `embedding/embedder.py`: wrap embedding model, có hàm `embed_batch(chunks)` — luôn batch thay vì gọi từng chunk một (tiết kiệm API call / nhanh hơn nhiều với local model).
2. Setup ChromaDB persistent client, tạo 1 collection riêng cho mỗi tài liệu hoặc 1 collection chung với metadata `document_id` để filter — khuyến nghị **1 collection chung**, filter bằng metadata, vì quản lý dễ hơn khi user có nhiều tài liệu.
3. Viết pipeline `ingest_document(file_path) → parse → chunk → embed → store` nối 3 giai đoạn trước lại thành 1 luồng end-to-end.
4. Test: ingest 1 file, query thử bằng 1 câu hỏi liên quan, in ra top-5 chunks gần nhất — tự đánh giá bằng mắt xem retrieval có "đúng vibe" không trước khi đi tiếp.

**Checklist:**
- [ ] Embed + lưu ChromaDB thành công
- [ ] Query thử trả về chunk liên quan (đánh giá thủ công)
- [ ] Metadata filter theo `document_id` hoạt động (để user chỉ hỏi trong phạm vi tài liệu họ chọn)

---

## GIAI ĐOẠN 4 — RAG Retrieval Pipeline (nâng cao hơn "retrieve rồi thôi")

**Mục tiêu:** Retrieval chất lượng cao — đây là phần quyết định AI Campus Assistant có "thông minh" hay không, quan trọng hơn cả việc chọn LLM nào.

**Khái niệm nâng cao (áp dụng đúng kiến thức bạn đã làm trong đồ án NLP — Hybrid Reranker MRR 0.876!):**
- **Vector search đơn thuần có nhược điểm gì?** Semantic search đôi khi bỏ sót khi câu hỏi dùng từ khóa chính xác (ví dụ tên hàm, thuật ngữ riêng) mà không "gần nghĩa" theo embedding. → Giải pháp: **Hybrid retrieval** kết hợp vector search (semantic) + BM25/keyword search (lexical), giống hệt kiến trúc Hybrid Reranker bạn đã làm.
- **Reranking**: sau khi lấy top-k (ví dụ top-20) bằng retrieval nhanh, dùng 1 Cross-Encoder nhỏ để chấm điểm lại độ liên quan chính xác hơn, chỉ giữ top-5 cuối cùng đưa vào LLM. Bạn đã có kinh nghiệm này từ Cross-Encoder NLI project rồi — áp dụng lại logic tương tự (khác domain, cùng kỹ thuật).
- **Query transformation**: đôi khi câu hỏi user viết tệ (ngắn, thiếu ngữ cảnh). Có thể dùng LLM để "rewrite" câu hỏi thành dạng rõ ràng hơn trước khi retrieve — nhưng đây là optimization, để dành cho V2, MVP có thể bỏ qua.

**Các bước (MVP trước, nâng cao sau):**
1. **MVP**: retrieval đơn giản — top-k bằng cosine similarity từ ChromaDB, k=5.
2. **V2 (khi MVP chạy ổn)**: thêm BM25 (dùng thư viện `rank_bm25`) chạy song song, merge kết quả (reciprocal rank fusion — công thức đơn giản, cộng điểm nghịch đảo rank từ 2 nguồn).
3. **V3**: thêm Cross-Encoder reranker (model nhỏ như `cross-encoder/ms-marco-MiniLM-L-6-v2`, hoặc multilingual nếu cần) để rerank top-20 → top-5.

**Checklist:**
- [ ] MVP retrieval hoạt động, trả kết quả hợp lý
- [ ] (V2) Hybrid search implement xong, so sánh kết quả trước/sau để thấy rõ cải thiện
- [ ] (V3) Reranker implement, đo thử bằng vài câu hỏi test set tự tạo

---

## GIAI ĐOẠN 5 — LLM Integration & Citation (câu trả lời kèm trích dẫn)

**Mục tiêu:** Ghép retrieval + LLM thành câu trả lời tự nhiên, LUÔN kèm nguồn (trang/dòng).

**Khái niệm:**
- **Prompt engineering cho RAG**: system prompt phải chỉ rõ LLM CHỈ được trả lời dựa trên context được cung cấp, PHẢI trích dẫn `[Nguồn: file X, trang Y]` sau mỗi claim, và phải nói "tôi không tìm thấy thông tin này trong tài liệu" nếu context không đủ — tránh hallucination, đây là điểm khác biệt giữa RAG "xịn" và RAG "hù dọa".
- **Cách format context đưa vào prompt**: mỗi chunk kèm theo id/số trang ngay trong text đưa vào prompt (ví dụ `[Chunk 1 - trang 12]: nội dung...`), để LLM có thể "point" chính xác vào nguồn khi trả lời.

**Các bước:**
1. Thiết kế system prompt cẩn thận — đây là phần bạn nên tự viết và test nhiều lần (thử với câu hỏi mà tài liệu KHÔNG có câu trả lời, xem LLM có "bịa" không).
2. Viết `rag/generator.py`: nhận `(query, retrieved_chunks) → format prompt → gọi LLM API → parse response`.
3. Thiết kế response format có cấu trúc (JSON) để frontend dễ hiển thị: `{answer: str, citations: [{source_file, page, chunk_text_snippet}]}`. Yêu cầu LLM trả JSON structured output (bạn đã có kinh nghiệm structured output với Claude API rồi).
4. **Conversation memory**: RAG chat cần nhớ vài lượt hỏi-đáp trước để hiểu câu hỏi follow-up ("còn phần kia thì sao?"). Lưu lịch sử hội thoại, đưa N lượt gần nhất vào prompt (đừng đưa toàn bộ lịch sử — tốn token và loãng context).

**Checklist:**
- [ ] LLM trả lời kèm citation đúng format
- [ ] Test case "câu hỏi ngoài phạm vi tài liệu" → LLM từ chối trả lời đúng cách, không bịa
- [ ] Conversation memory hoạt động cho câu hỏi follow-up

---

## GIAI ĐOẠN 6 — Backend API hoàn chỉnh (FastAPI)

**Mục tiêu:** Có bộ API đầy đủ để frontend gọi.

**Endpoints cần có (thiết kế REST rõ ràng):**
```
POST   /documents/upload         → upload + trigger ingestion pipeline
GET    /documents                → list tài liệu đã upload
DELETE /documents/{id}           → xóa tài liệu (và chunks trong ChromaDB)
POST   /chat/{document_id}       → gửi câu hỏi, nhận câu trả lời + citations
GET    /chat/{document_id}/history → lấy lịch sử chat
```
- Upload nên xử lý **async/background task** (FastAPI `BackgroundTasks`) vì ingestion (parse+embed) có thể mất vài giây-vài phút với file lớn — đừng block request, trả về ngay `{status: "processing"}` rồi frontend poll hoặc dùng WebSocket để biết khi nào xong.
- Validate file type/size trước khi xử lý.

**Checklist:**
- [ ] Tất cả endpoint trên hoạt động, test bằng Postman/Swagger UI (`/docs` tự sinh của FastAPI)
- [ ] Upload lớn không block server
- [ ] Error handling rõ ràng (file sai định dạng, LLM API lỗi, v.v.)

---

## GIAI ĐOẠN 7 — Frontend (React Chat UI)

**Mục tiêu:** Giao diện chat thực dụng, có thể demo được.

**Các màn hình cần có:**
1. Upload tài liệu (drag-drop, progress indicator)
2. Danh sách tài liệu đã upload, chọn 1 tài liệu để chat
3. Chat interface: hiển thị câu hỏi/trả lời, **citation phải click được** (mở popup/sidebar hiện đoạn text gốc + số trang) — đây là tính năng "wow" khi demo, đừng bỏ qua.
4. Streaming response (nếu dùng LLM API hỗ trợ streaming) để UX mượt hơn thay vì đợi cả câu trả lời xong mới hiện.

**Gợi ý kỹ thuật**: bạn đã có kinh nghiệm React + TS + Tailwind + Framer Motion từ Neural Maze portfolio — tái sử dụng design system đó cho quen tay, tập trung effort vào logic chứ không phải học lại UI framework.

**Checklist:**
- [ ] Upload UI hoạt động, có loading state
- [ ] Chat UI hiển thị đúng, citation click được
- [ ] (nếu làm streaming) response hiện dần thay vì đợi hết

---

## GIAI ĐOẠN 8 — Tính năng nâng cao: Sinh đề ôn tập (Quiz Generation)

**Mục tiêu:** Từ tài liệu đã ingest, sinh MCQ/tự luận/flashcard.

**Cách tiếp cận:**
- Lấy toàn bộ chunks của 1 document (hoặc 1 chương nếu bạn detect được cấu trúc chương), đưa vào LLM với prompt yêu cầu sinh N câu hỏi dạng structured JSON (`{question, options: [], correct_answer, explanation}` cho MCQ).
- **Quan trọng**: đừng đưa cả tài liệu vào 1 lần nếu quá dài (vượt context window) — chia theo section, sinh quiz từng phần rồi gộp lại.
- Flashcard: format đơn giản hơn `{front, back}`, có thể sinh cùng lúc với MCQ trong 1 lần gọi LLM để tiết kiệm API call.

**Checklist:**
- [ ] Sinh MCQ có đáp án đúng + giải thích
- [ ] Sinh flashcard
- [ ] UI hiển thị quiz, cho user làm và chấm điểm ngay

---

## GIAI ĐOẠN 9 — Giải thích code (Notebook Explainer)

**Mục tiêu:** Đọc `.ipynb`, giải thích từng cell.

**Cách tiếp cận:**
- Tái sử dụng `notebook_parser.py` từ Giai đoạn 2.
- Với mỗi code cell, gửi cell đó + N cell context xung quanh (để LLM hiểu biến/hàm được định nghĩa ở đâu) vào LLM, yêu cầu giải thích ngắn gọn.
- Hiển thị side-by-side: code gốc bên trái, giải thích bên phải (giống Jupyter nhưng có thêm annotation).

**Checklist:**
- [ ] Parse + giải thích từng cell chính xác
- [ ] Context giữa các cell được giữ (không giải thích cell độc lập, mất liên kết)

---

## GIAI ĐOẠN 10 — Theo dõi tiến độ học (Progress Tracking)

**Mục tiêu:** Biết user yếu phần nào dựa trên kết quả quiz + câu hỏi họ hay hỏi.

**Thiết kế database (PostgreSQL)** — đây là lúc dùng SQL, đúng sở trường của bạn:
```
users (id, name, email, ...)
documents (id, user_id, filename, uploaded_at, ...)
chat_history (id, user_id, document_id, question, answer, created_at)
quiz_attempts (id, user_id, quiz_id, question_id, is_correct, created_at)
topics (id, document_id, topic_name)   -- nếu bạn detect được chủ đề/chương
```
- Logic đơn giản cho MVP: tính % đúng theo từng `document_id` hoặc từng `topic` (nếu có gắn topic cho câu hỏi quiz) → hiển thị dashboard "bạn yếu phần X, nên ôn lại".
- Nâng cao hơn (nếu còn thời gian): dùng LLM để phân loại câu hỏi user hay hỏi vào topic nào, phát hiện pattern "hỏi đi hỏi lại 1 chủ đề" = dấu hiệu chưa hiểu.

**Checklist:**
- [ ] Schema PostgreSQL thiết kế xong, có foreign key đúng
- [ ] Dashboard hiển thị % đúng theo document/topic
- [ ] (nâng cao) Phát hiện pattern từ chat history

---

## GIAI ĐOẠN 11 — Voice Mode (làm sau cùng)

**Mục tiêu:** Hỏi bằng giọng nói tiếng Việt.

**Cách tiếp cận** (bạn đã có kinh nghiệm với FPT.AI/ElevenLabs TTS và faster-whisper từ project Remotion rồi — áp dụng lại):
- **Speech-to-Text**: faster-whisper (bạn đã dùng) hoặc API cloud (Google Speech-to-Text hỗ trợ tiếng Việt tốt).
- **Text-to-Speech** cho câu trả lời: FPT.AI (giọng Việt tự nhiên, bạn đã có kinh nghiệm) hoặc ElevenLabs.
- Luồng: ghi âm ở frontend (Web Audio API / MediaRecorder) → gửi audio blob lên backend → STT → chạy qua RAG pipeline như text bình thường → TTS câu trả lời → trả audio về frontend để play.

**Checklist:**
- [ ] STT tiếng Việt hoạt động chính xác
- [ ] TTS trả lời tự nhiên
- [ ] Latency chấp nhận được (đây thường là điểm nghẽn — cân nhắc streaming nếu quá chậm)

---

## GIAI ĐOẠN 12 — Deployment

**Mục tiêu:** Deploy để demo được qua link, không phải chạy localhost khi thuyết trình.

**Gợi ý đơn giản cho sinh viên:**
- Backend: Railway/Render (free tier đủ cho demo) hoặc VPS nếu bạn quen Windows Server/Linux admin.
- Frontend: Vercel (bạn đã quen, dùng lại pattern từ Neural Maze portfolio).
- PostgreSQL: Supabase hoặc Railway Postgres (free tier).
- ChromaDB: chạy kèm backend (persistent volume) hoặc dùng Chroma Cloud nếu cần.
- **Đừng quên**: giới hạn rate limit / API key quota, vì free tier LLM API rất dễ hết quota giữa buổi demo.

**Checklist:**
- [ ] Backend deploy thành công, có domain/URL public
- [ ] Frontend deploy, trỏ đúng API URL (không hardcode localhost)
- [ ] Test full flow trên bản deploy trước ngày thuyết trình, không để nước đến chân mới nhảy

---

## Gợi ý thứ tự thực hiện thực tế (timeline sinh viên)

Nếu bạn làm song song với đồ án khác, đề xuất chia theo tuần:
- **Tuần 1**: Giai đoạn 0-3 (setup + ingestion + embedding chạy được end-to-end với 1 file test)
- **Tuần 2**: Giai đoạn 4-6 (retrieval nâng cao + LLM answer + backend API đầy đủ)
- **Tuần 3**: Giai đoạn 7 (frontend hoàn chỉnh) — đây là lúc MVP demo được
- **Tuần 4+**: Giai đoạn 8-11 theo độ ưu tiên, dừng lại bất cứ lúc nào nếu cần deadline
- **Cuối cùng**: Giai đoạn 12 (deploy) — làm sớm hơn 1 chút nếu có thể, đừng để sát ngày

---

**Bước tiếp theo**: bạn muốn mình đi sâu vào giai đoạn nào trước? Mình có thể giải thích chi tiết hơn nữa (kèm cả những đoạn code mẫu nếu bạn muốn tham khảo cách viết, dù bạn nói không cần copy-paste sẵn) cho từng module cụ thể — ví dụ bắt đầu từ Giai đoạn 1-2 (setup + ingestion) để bạn có cái để chạy thử ngay tuần này.
