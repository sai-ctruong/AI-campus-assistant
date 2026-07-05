import type {
  ChatResponse,
  ChatTurn,
  DocumentInfo,
  ExplainResponse,
  ProgressResponse,
  QuizResponse,
  UploadResponse,
} from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* body không phải JSON */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listDocuments: () => fetch(`${BASE}/documents`).then((r) => unwrap<DocumentInfo[]>(r)),

  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/documents/upload`, { method: "POST", body: form }).then((r) =>
      unwrap<UploadResponse>(r),
    );
  },

  deleteDocument: (id: string) =>
    fetch(`${BASE}/documents/${id}`, { method: "DELETE" }).then((r) => unwrap<{ status: string }>(r)),

  chat: (id: string, question: string, useRerank: boolean) =>
    fetch(`${BASE}/chat/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, use_rerank: useRerank }),
    }).then((r) => unwrap<ChatResponse>(r)),

  getHistory: (id: string) =>
    fetch(`${BASE}/chat/${id}/history`).then((r) => unwrap<ChatTurn[]>(r)),

  generateQuiz: (id: string, nQuestions = 5) =>
    fetch(`${BASE}/quiz/${id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n_questions: nQuestions, n_flashcards: 5 }),
    }).then((r) => unwrap<QuizResponse>(r)),

  recordAttempt: (documentId: string, question: string, isCorrect: boolean) =>
    fetch(`${BASE}/quiz/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: documentId, question, is_correct: isCorrect }),
    }).then((r) => unwrap<{ status: string }>(r)),

  getProgress: () => fetch(`${BASE}/progress`).then((r) => unwrap<ProgressResponse>(r)),

  explainNotebook: (id: string) =>
    fetch(`${BASE}/explain/${id}`, { method: "POST" }).then((r) => unwrap<ExplainResponse>(r)),
};
