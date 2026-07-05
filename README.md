<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f7a5f,100:182338&height=210&section=header&text=AI%20Campus%20Assistant&fontSize=48&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=RAG%20study%20assistant%20cho%20sinh%20vien&descAlignY=60&descSize=18" width="100%" alt="AI Campus Assistant" />

<img src="https://readme-typing-svg.demolab.com?font=Plus+Jakarta+Sans&size=22&pause=1200&color=0F7A5F&center=true&vCenter=true&width=720&lines=Chat+voi+tai+lieu%2C+kem+trich+dan+nguon;Sinh+quiz+%26+flashcard+tu+dong;Giai+thich+code+notebook;Voice+mode+tieng+Viet" alt="typing" />

<br/><br/>

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B6B?style=flat-square)](https://trychroma.com)
[![License](https://img.shields.io/badge/License-MIT-0f7a5f?style=flat-square)](LICENSE)

**Biến slide, giáo trình PDF, Word và notebook thành một trợ lý học tập biết trả lời kèm trích dẫn tới từng trang.**

[Tính năng](#-tính-năng) · [Demo](#-demo) · [Kiến trúc](#️-kiến-trúc) · [Cài đặt](#-cài-đặt) · [API](#-api) · [Deploy](DEPLOYMENT.md)

</div>

---

## 📖 Giới thiệu

**AI Campus Assistant** là một trợ lý học tập dựa trên **RAG (Retrieval-Augmented Generation)**. Tải tài liệu lên, hỏi bất cứ điều gì và nhận câu trả lời **bám sát nội dung của bạn, luôn kèm trích dẫn nguồn** — thay vì để mô hình "bịa".

Được xây dựng với pipeline RAG chỉn chu: **hybrid retrieval** (vector + BM25) + **cross-encoder reranking**, chống hallucination bằng structured output, và một giao diện học thuật sạch sẽ.

---

## ✨ Tính năng

| | Tính năng | Mô tả |
|:--:|---|---|
| 💬 | **Chat kèm trích dẫn** | Trả lời có gắn `[1] [2]` bấm được → mở panel xem đúng đoạn nguồn + số trang/phần/cell |
| 🔍 | **Hybrid retrieval + rerank** | Vector (ngữ nghĩa) + BM25 (từ khóa) gộp bằng RRF, rồi cross-encoder chấm lại |
| 🚫 | **Chống bịa** | Chỉ trả lời từ tài liệu; không đủ dữ kiện thì nói thẳng "không tìm thấy" |
| 📝 | **Quiz & flashcard** | Tự sinh câu trắc nghiệm (kèm giải thích + nguồn) và flashcard từ tài liệu |
| 📊 | **Theo dõi tiến độ** | Dashboard thống kê độ chính xác quiz, chỉ ra vùng kiến thức yếu nhất |
| 🧑‍💻 | **Giải thích notebook** | Đọc `.ipynb`, chú giải từng code cell theo ngữ cảnh cả bài |
| 🎙️ | **Voice mode tiếng Việt** | Nói câu hỏi và nghe đọc câu trả lời (Web Speech API) |
| 📄 | **Đa định dạng** | PDF · Word (.docx) · Jupyter notebook |

---

## 🎬 Demo

> Thêm ảnh chụp vào `docs/screenshots/` (xem hướng dẫn trong thư mục đó) để phần này hiển thị.

<div align="center">

| Library | Chat + trích dẫn |
|:--:|:--:|
| <img src="docs/screenshots/library.png" width="420" alt="Library"/> | <img src="docs/screenshots/chat.png" width="420" alt="Chat"/> |
| **Quiz** | **Dashboard** |
| <img src="docs/screenshots/quiz.png" width="420" alt="Quiz"/> | <img src="docs/screenshots/dashboard.png" width="420" alt="Dashboard"/> |

<img src="docs/screenshots/notebook.png" width="840" alt="Notebook explainer"/>

</div>

---

## 🏗️ Kiến trúc

```mermaid
flowchart TD
    U["👨‍🎓 Sinh viên"] --> FE["⚛️ React Frontend<br/>Library · Chat · Quiz · Dashboard · Notebook"]
    FE -->|REST| BE["⚡ FastAPI Backend"]
    BE --> ING["📥 Ingestion<br/>parse · chunk"]
    BE --> RAG["🧠 RAG Pipeline<br/>hybrid retrieve → rerank → LLM"]
    BE --> ST[("🗃️ JSON store<br/>documents · chat · quiz")]
    ING --> VDB[("🔮 ChromaDB<br/>vector store")]
    RAG --> VDB
    ING -->|embed| GEM["✦ Google Gemini API"]
    RAG -->|generate| GEM
```

**Luồng RAG:** `tài liệu → parse → chunk → embed → ChromaDB` khi nạp, và `câu hỏi → embed → hybrid retrieve → rerank → prompt kèm citation → LLM → câu trả lời có nguồn` khi chat.

---

## 🛠️ Tech Stack

<div align="center">

| Backend | Frontend | AI / Data |
|---|---|---|
| FastAPI · Uvicorn | React 19 · TypeScript | Google Gemini (embedding + LLM) |
| Pydantic | Vite · Tailwind CSS v4 | ChromaDB (vector store) |
| pypdf · python-docx · nbformat | Motion (animation) | rank-bm25 · cross-encoder |

</div>

---

## 📂 Cấu trúc

```
AI-campus-assistant/
├── backend/
│   └── app/
│       ├── ingestion/   # parse PDF/Word/notebook + chunk
│       ├── embedding/   # Gemini embedder
│       ├── db/          # ChromaDB client + JSON stores
│       ├── rag/         # retriever · reranker · generator · quiz · explainer
│       └── routers/     # documents · chat · quiz · explain
├── frontend/
│   └── src/
│       ├── pages/       # Library · Chat · Quiz · Dashboard · Notebook
│       ├── components/  # UI + layout
│       └── hooks/       # useSpeech (voice)
└── DEPLOYMENT.md        # hướng dẫn deploy Render + Vercel
```

---

## 🚀 Cài đặt

**Yêu cầu:** Python 3.9+ · Node 18+ · [Gemini API key](https://aistudio.google.com/apikey) (miễn phí)

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows  ·  source venv/bin/activate (macOS/Linux)
pip install -r requirements.txt

echo "GEMINI_API_KEY=your_key_here" > .env
uvicorn app.main:app --reload
```

→ API tại **http://localhost:8000** · docs tự sinh tại **/docs**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

→ Web tại **http://localhost:5173**

---

## 🔌 API

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/documents/upload` | Upload tài liệu (async ingest) |
| `GET` | `/documents` | Danh sách tài liệu |
| `DELETE` | `/documents/{id}` | Xóa tài liệu + vector |
| `POST` | `/chat/{id}` | Hỏi → câu trả lời + trích dẫn |
| `GET` | `/chat/{id}/history` | Lịch sử chat |
| `POST` | `/quiz/{id}/generate` | Sinh quiz + flashcard |
| `POST` | `/quiz/attempts` | Ghi kết quả làm quiz |
| `GET` | `/progress` | Dữ liệu dashboard tiến độ |
| `POST` | `/explain/{id}` | Giải thích notebook |

---

## 🗺️ Roadmap

- [x] **P0–1** Kiến trúc & scaffolding full-stack
- [x] **P2** Ingestion (PDF · Word · notebook)
- [x] **P3** Embedding + ChromaDB
- [x] **P4** Hybrid retrieval + rerank
- [x] **P5** LLM + citation + chống hallucination
- [x] **P6** Backend API
- [x] **P7** Frontend (5 màn hình)
- [x] **P8** Quiz & flashcard
- [x] **P9** Notebook explainer
- [x] **P10** Progress tracking
- [x] **P11** Voice mode tiếng Việt
- [x] **P12** Deployment-ready

---

## 📄 License

Phát hành theo giấy phép **MIT** — xem [LICENSE](LICENSE).

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:182338,100:0f7a5f&height=120&section=footer" width="100%" alt="footer" />

Made with 💚 for students who want to study smarter.

</div>
