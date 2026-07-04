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
