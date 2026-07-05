# Backend AI Campus Assistant — image nhẹ cho deploy (rerank/torch bị loại).
FROM python:3.11-slim

# build-essential cho vài native dep của chromadb.
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements-deploy.txt .
RUN pip install --no-cache-dir -r requirements-deploy.txt

COPY app ./app

# Dữ liệu (uploads + chroma) nên trỏ vào volume bền qua env khi deploy:
#   DATA_DIR=/data  CHROMA_PERSIST_DIR=/data/chroma  UPLOAD_DIR=/data/uploads
ENV DATA_DIR=/data \
    CHROMA_PERSIST_DIR=/data/chroma \
    UPLOAD_DIR=/data/uploads

EXPOSE 8000

# $PORT do Render/Railway inject; mặc định 8000.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
