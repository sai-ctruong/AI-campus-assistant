# Phase 12 — Deployment

## 1. Lý thuyết

### 1.1 Mục tiêu
Demo được qua link công khai, không phụ thuộc localhost khi thuyết trình — tránh rủi ro mất mạng/máy tính hỏng ngay lúc báo cáo.

### 1.2 Lựa chọn hạ tầng cho sinh viên (free tier đủ dùng)
| Thành phần | Dịch vụ | Ghi chú |
|---|---|---|
| Backend (FastAPI) | Railway hoặc Render | Free tier đủ cho demo, hỗ trợ Docker |
| Frontend (React) | Vercel | Build tự động từ Git, domain miễn phí |
| PostgreSQL | Supabase hoặc Railway Postgres | Free tier vài trăm MB |
| ChromaDB | Chạy kèm backend với persistent volume | Hoặc Chroma Cloud nếu cần persist ngoài container |

### 1.3 Rủi ro cần lường trước
- Free tier LLM API (Gemini) có rate limit/quota — dễ hết giữa buổi demo nếu nhiều người test cùng lúc. Nên có key dự phòng hoặc giới hạn số request/phút ở backend.
- Free tier hosting thường "sleep" sau vài phút không hoạt động (cold start) — nhớ "đánh thức" server (gọi thử `/health`) vài phút trước khi demo.
- ChromaDB persistent volume trên free tier có thể bị xóa khi container restart nếu không cấu hình đúng volume — kiểm tra kỹ trước ngày thuyết trình.

---

## 2. Code / Cấu hình

### 2.1 Dockerfile backend: `backend/Dockerfile`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Volume để ChromaDB + upload không mất khi container restart
VOLUME ["/app/data"]

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2.2 `.dockerignore`
```
venv/
__pycache__/
*.pyc
.env
```

### 2.3 Rate limiting đơn giản để bảo vệ quota LLM: `backend/app/middleware/rate_limit.py`
```python
import time
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 20, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        self._hits[client_ip] = [t for t in self._hits[client_ip] if now - t < self.window_seconds]

        if len(self._hits[client_ip]) >= self.max_requests:
            raise HTTPException(429, "Quá nhiều request, vui lòng thử lại sau ít phút")

        self._hits[client_ip].append(now)
        return await call_next(request)
```

Gắn vào `main.py`:
```python
from app.middleware.rate_limit import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware, max_requests=20, window_seconds=60)
```

### 2.4 Deploy backend lên Railway
```bash
# Cài Railway CLI (1 lần)
npm install -g @railway/cli

railway login
railway init
railway up
# Sau khi deploy, set biến môi trường qua dashboard hoặc CLI:
railway variables set GEMINI_API_KEY=your_key
railway variables set DATABASE_URL=your_supabase_or_railway_postgres_url
```
Railway tự cấp domain dạng `xxx.up.railway.app` — dùng domain này làm `VITE_API_URL` cho frontend.

### 2.5 Deploy frontend lên Vercel
```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```
Trong Vercel dashboard → Settings → Environment Variables, thêm:
```
VITE_API_URL=https://xxx.up.railway.app
```
Rồi redeploy để build lại với đúng biến môi trường (Vite bake env vào lúc build, không phải runtime).

### 2.6 CORS cho domain thật — sửa `backend/.env` trên Railway
```
CORS_ORIGINS=["https://your-frontend.vercel.app"]
```
Đảm bảo `config.py` (Phase 01) đọc list này từ env đúng cách — pydantic-settings tự parse JSON list từ string env var.

### 2.7 Setup Supabase PostgreSQL nhanh
1. Tạo project mới trên supabase.com (free tier).
2. Lấy connection string ở Settings → Database → Connection string (chọn "Session pooler" cho backend serverless-friendly).
3. Set vào `DATABASE_URL` trên Railway.
4. Chạy `init_db()` (đã có sẵn trong `on_startup` từ Phase 06) — bảng tự tạo khi backend khởi động lần đầu.

---

## 3. Checklist hoàn thành Phase 12 (= hoàn thành toàn bộ dự án)
- [ ] Backend deploy thành công trên Railway/Render, có domain public, `/health` trả 200
- [ ] Frontend deploy trên Vercel, trỏ đúng `VITE_API_URL` (không hardcode `localhost`)
- [ ] CORS đã cấu hình đúng domain frontend thật, không còn `localhost` trong `CORS_ORIGINS` khi production
- [ ] PostgreSQL (Supabase/Railway) kết nối thành công, bảng được tạo tự động
- [ ] ChromaDB persistent volume không mất dữ liệu sau khi container restart
- [ ] Rate limiting đã bật, tránh hết quota Gemini giữa buổi demo
- [ ] Test full flow trên bản deploy thật: upload → chat → citation → quiz → progress, TRƯỚC ngày thuyết trình ít nhất 1-2 ngày
- [ ] Có key Gemini dự phòng hoặc kế hoạch B nếu hết quota giữa demo

---

## Tổng kết dự án
Sau khi hoàn thành cả 12 phase (tương ứng Giai đoạn 0→12 trong roadmap gốc), bạn có:
- MVP hoàn chỉnh: chat với tài liệu PDF/notebook kèm trích dẫn nguồn chính xác
- Retrieval nâng cao: hybrid search (vector + BM25) + Cross-Encoder reranking
- 3 tính năng mở rộng: sinh đề ôn tập, giải thích code notebook, theo dõi tiến độ học
- Voice mode tiếng Việt (STT + TTS)
- Deploy production, demo được qua link công khai

Xem lại `AI_Campus_Assistant_Roadmap.md` ở thư mục gốc để đối chiếu ý tưởng ban đầu; các file trong `docs/phases/` là bản triển khai chi tiết kèm code đầy đủ cho từng giai đoạn.
