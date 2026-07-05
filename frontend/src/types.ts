export type DocStatus = "processing" | "ready" | "failed";

export interface DocumentInfo {
  id: string;
  filename: string;
  source_type: string;
  status: DocStatus;
  chunk_count: number;
  error: string | null;
  uploaded_at: string;
}

export interface Citation {
  ref: number;
  source_file: string;
  location: string;
  snippet: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  found_answer: boolean;
}

export interface ChatTurn {
  question: string;
  answer: string;
  citations: Citation[];
  found_answer: boolean;
  created_at: string;
}

export interface UploadResponse {
  document_id: string;
  filename: string;
  status: string;
}

// ---------- Quiz (Phase 8) ----------

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  source_hint: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizResponse {
  document_id: string;
  questions: QuizQuestion[];
  flashcards: Flashcard[];
}

// ---------- Progress (Phase 10) ----------

export interface DocumentProgress {
  document_id: string;
  filename: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface ProgressResponse {
  total_attempts: number;
  total_correct: number;
  overall_accuracy: number;
  documents: DocumentProgress[];
}

// ---------- Notebook explainer (Phase 9) ----------

export interface NotebookCell {
  cell_index: number;
  cell_type: string;
  source: string;
}

export interface CellExplanation {
  cell_index: number;
  title: string;
  explanation: string;
}

export interface ExplainResponse {
  document_id: string;
  filename: string;
  summary: string;
  cells: NotebookCell[];
  explanations: CellExplanation[];
}

/** Tin nhắn hiển thị trong khung chat (client-side). */
export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  foundAnswer?: boolean;
  pending?: boolean;
  error?: boolean;
  animate?: boolean; // true = message mới → chạy hiệu ứng gõ chữ
}
