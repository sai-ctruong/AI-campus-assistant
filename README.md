<div align="center">

# 🎓 AI Campus Assistant

**A RAG-powered study companion for university students — chat with your slides, PDFs & notebooks, generate quizzes, explain code, track your learning, and ask questions by voice in Vietnamese.**

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-0.5-FF6B6B?style=flat)](https://www.trychroma.com/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-API-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📖 Overview

**AI Campus Assistant** turns your course materials into an interactive study partner. Upload a lecture slide, a textbook PDF, or a Jupyter notebook, and the assistant lets you **ask questions and get answers grounded in your own documents — always with a citation back to the exact page or cell**.

Built on a production-grade **Retrieval-Augmented Generation (RAG)** pipeline with hybrid search and cross-encoder reranking, it goes far beyond a naive "retrieve-then-answer" chatbot: it minimizes hallucination, cites its sources, and refuses to answer when the material doesn't contain the answer.

> Designed and built as an end-to-end learning project — from document parsing to a deployed full-stack app.

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 💬 | **Chat with documents + citations** | Ask anything about your uploaded material and get answers with clickable `[source, page N]` references. |
| 🔍 | **Hybrid retrieval + reranking** | Combines semantic (vector) search + BM25 keyword search, then reranks with a cross-encoder for high-precision context. |
| 📝 | **Quiz & flashcard generation** | Auto-generate multiple-choice questions, short-answer, and flashcards from any document, complete with answers & explanations. |
| 🧑‍💻 | **Notebook code explainer** | Reads `.ipynb` files and explains each code cell in context, side-by-side with the original code. |
| 📊 | **Learning progress tracking** | Tracks quiz results and frequently-asked topics to surface your weak spots and suggest what to review. |
| 🎙️ | **Vietnamese voice mode** | Ask questions by voice and hear spoken answers — speech-to-text + TTS tuned for Vietnamese. |
| 🚫 | **Anti-hallucination guardrails** | The model is constrained to answer *only* from retrieved context, and explicitly says when it can't find the answer. |

---

## 🏗️ Architecture

```
                        ┌──────────────────┐
                        │   React Frontend │  (Vite + TS + Tailwind)
                        │   Chat UI · Upload · Quiz · Voice
                        └────────┬─────────┘
                                 │ REST / streaming
                        ┌────────▼─────────┐
                        │  FastAPI Backend │
                        └────────┬─────────┘
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
     ┌─────────────────┐ ┌──────────────┐  ┌────────────────┐
     │    Ingestion    │ │ RAG Pipeline │  │   PostgreSQL   │
     │  parse · chunk  │ │  retrieve +  │  │  users · chat  │
     │                 │ │  rerank+LLM  │  │  history       │
     └────────┬────────┘ └──────┬───────┘  │  quiz · topics │
              │                 │          └────────────────┘
              ▼                 │
     ┌─────────────────┐        │
     │    ChromaDB     │◄───────┘
     │  vector store   │
     └─────────────────┘
```

**RAG flow:** `document → parse (PDF/notebook) → chunk (+ metadata) → embed (Gemini) → store (ChromaDB)` for ingestion, and `query → embed → hybrid retrieve → rerank → prompt with citations → LLM → grounded answer` for chat.

---

## 🛠️ Tech Stack

**Backend**
- **FastAPI** + Uvicorn — async REST API
- **Google Gemini** — `gemini-embedding-001` (3072-dim embeddings) + generative model for answers
- **ChromaDB** — persistent vector store with metadata filtering
- **rank-bm25** — lexical search for hybrid retrieval
- **pypdf** / **nbformat** — PDF & Jupyter notebook parsing
- **SQLAlchemy** + **PostgreSQL** — users, chat history, quiz attempts, progress

**Frontend**
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** — styling
- Streaming chat UI with clickable citations

---

## 📂 Project Structure

```
AI-campus-assistant/
├── backend/
│   ├── app/
│   │   ├── config.py              # Settings (env vars)
│   │   ├── main.py                # FastAPI app + CORS
│   │   ├── ingestion/             # PDF/notebook parsing, chunking, pipeline
│   │   │   ├── pdf_parser.py
│   │   │   ├── notebook_parser.py
│   │   │   ├── chunker.py
│   │   │   └── pipeline.py
│   │   ├── embedding/             # Gemini embedder
│   │   │   └── embedder.py
│   │   ├── db/                    # ChromaDB vector store client
│   │   │   └── chroma_client.py
│   │   ├── rag/                   # Retrieval + generation (hybrid, rerank, LLM)
│   │   └── routers/               # API endpoints
│   └── requirements.txt
├── frontend/                      # React + Vite + TS + Tailwind
├── data/
│   ├── uploads/                   # uploaded documents
│   └── chroma/                    # persisted vector DB
└── AI_Campus_Assistant_Roadmap.md # detailed build roadmap
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.9+**
- **Node.js 18+**
- **PostgreSQL** (for progress tracking)
- A **Google Gemini API key** — free tier available at [Google AI Studio](https://aistudio.google.com/apikey)

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/campus_assistant
```

Run the API:

```bash
uvicorn app.main:app --reload
```

The API is now live at **http://127.0.0.1:8000** — interactive docs at **/docs**.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173** and talks to the backend via `VITE_API_URL` (see `frontend/.env`).

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/documents/upload` | Upload a document + trigger ingestion (async) |
| `GET` | `/documents` | List uploaded documents |
| `DELETE` | `/documents/{id}` | Delete a document and its vectors |
| `POST` | `/chat/{document_id}` | Ask a question → grounded answer + citations |
| `GET` | `/chat/{document_id}/history` | Retrieve chat history |
| `POST` | `/quiz/{document_id}` | Generate quiz / flashcards from a document |
| `POST` | `/explain/notebook` | Explain a notebook's code cells |
| `GET` | `/progress` | Learning progress dashboard data |

---

## 🗺️ Roadmap

- [x] **Phase 0–1** — Scope, architecture & full-stack scaffolding
- [x] **Phase 2** — Document ingestion (PDF & notebook parsing, chunking)
- [x] **Phase 3** — Embedding & vector store (Gemini + ChromaDB)
- [ ] **Phase 4** — Advanced RAG retrieval (hybrid search + cross-encoder rerank)
- [ ] **Phase 5** — LLM integration & citations
- [ ] **Phase 6** — Complete FastAPI backend
- [ ] **Phase 7** — React chat UI
- [ ] **Phase 8** — Quiz & flashcard generation
- [ ] **Phase 9** — Notebook code explainer
- [ ] **Phase 10** — Learning progress tracking
- [ ] **Phase 11** — Vietnamese voice mode
- [ ] **Phase 12** — Deployment

See [`AI_Campus_Assistant_Roadmap.md`](AI_Campus_Assistant_Roadmap.md) for the detailed phase-by-phase plan.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

Built with ❤️ for students who want to study smarter.

</div>
