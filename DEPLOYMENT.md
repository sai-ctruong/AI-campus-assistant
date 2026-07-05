# Hướng dẫn Deploy — AI Campus Assistant

Kiến trúc deploy: **Backend** (FastAPI + ChromaDB) trên Render/Railway, **Frontend** (Vite) trên Vercel.

> ⚠️ Bản deploy dùng `requirements-deploy.txt` (không có `torch`) → tính năng **rerank tự tắt** cho nhẹ. Hybrid retrieval (vector + BM25) vẫn hoạt động, chất lượng vẫn tốt. Muốn có rerank thì phải deploy lên máy đủ RAM/disk và cài `requirements.txt` đầy đủ.

---

## 1. Backend — Render (Docker)

1. Đẩy code lên GitHub (đã có `backend/Dockerfile`).
2. Render → **New → Web Service** → chọn repo, **Root Directory = `backend`**, Runtime = **Docker**.
3. **Environment variables**:
   | Key | Value |
   |---|---|
   | `GEMINI_API_KEY` | API key thật (Google AI Studio) |
   | `CORS_ORIGINS` | URL frontend, ví dụ `https://ai-campus.vercel.app` (thêm sau khi có domain Vercel) |
   | `DATA_DIR` | `/data` |
   | `CHROMA_PERSIST_DIR` | `/data/chroma` |
   | `UPLOAD_DIR` | `/data/uploads` |
4. **Disk** (bắt buộc để giữ tài liệu + vector qua các lần restart): thêm Disk, Mount Path = `/data`, size ≥ 1GB. *(Free tier Render không có disk bền — cần gói có phí hoặc dùng Railway.)*
5. Deploy. Lấy URL, ví dụ `https://ai-campus-api.onrender.com`. Kiểm tra `‹URL›/health` trả `{"status":"ok"}` và `‹URL›/docs` mở được.

**Railway** (thay thế, có volume ở free tier): New Project → Deploy from repo → set Root = `backend`, thêm Volume mount `/data`, đặt env như trên. Railway tự nhận Dockerfile.

---

## 2. Frontend — Vercel

1. Vercel → **New Project** → chọn repo, **Root Directory = `frontend`** (Vercel tự nhận Vite).
2. **Environment variable**: `VITE_API_URL` = URL backend ở bước 1 (ví dụ `https://ai-campus-api.onrender.com`).
3. Deploy. Lấy domain, ví dụ `https://ai-campus.vercel.app`.
4. **Quay lại Render/Railway**, cập nhật `CORS_ORIGINS` = domain Vercel vừa có, rồi redeploy backend (để trình duyệt không bị chặn CORS).

---

## 3. Kiểm tra sau deploy

- Mở domain Vercel → **Library** → upload 1 PDF text-based → chờ "ready".
- Mở **Chat** → hỏi → phải có câu trả lời + trích dẫn.
- **Quiz / Dashboard / Notebook / Voice** hoạt động.

## Lưu ý

- **Quota Gemini free tier**: 100 embed request/phút. Ingest tài liệu lớn có thể chậm; demo nên dùng tài liệu nhỏ.
- **Voice mode**: dùng Web Speech API của trình duyệt → chỉ chạy trên **Chrome/Edge**, cần **HTTPS** (Vercel có sẵn) + quyền micro.
- **PDF scan** (ảnh, không có text) chưa hỗ trợ (chưa OCR) → sẽ báo "failed" khi upload.
- Dữ liệu (documents/chat/quiz) hiện lưu **JSON + ChromaDB trên disk**, không phải PostgreSQL. Cần disk bền, nếu không sẽ mất khi restart.
