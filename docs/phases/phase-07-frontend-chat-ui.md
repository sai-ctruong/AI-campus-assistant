# Phase 07 — Frontend (React Chat UI)

## 1. Lý thuyết

### 1.1 Vì sao citation click-được là tính năng "wow"?
Đây là điểm khác biệt của RAG "có kiểm chứng được" so với chatbot thường — user thấy ngay câu trả lời lấy từ đâu, tăng độ tin cậy, và khi demo trước hội đồng đây là điểm nhấn dễ gây ấn tượng nhất.

### 1.2 Streaming response
Thay vì đợi cả câu trả lời sinh xong mới hiện (có thể mất 3-5s cảm giác "đứng hình"), stream từng token giúp UX mượt hơn nhiều. MVP có thể bỏ qua streaming nếu thời gian hạn chế — ưu tiên chat cơ bản chạy đúng trước.

---

## 2. Code

### 2.1 API client: `frontend/src/api/client.ts`
```ts
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface Citation {
  source_file: string;
  page: number | null;
  chunk_text_snippet: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  found_in_document: boolean;
}

export interface DocumentItem {
  id: string;
  filename: string;
  status: "processing" | "ready" | "failed";
  uploaded_at: string;
}

export async function uploadDocument(file: File): Promise<{ document_id: string; status: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/documents/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload thất bại: ${res.status}`);
  return res.json();
}

export async function listDocuments(): Promise<DocumentItem[]> {
  const res = await fetch(`${API_URL}/documents`);
  return res.json();
}

export async function getDocument(id: string): Promise<DocumentItem & { error_message?: string }> {
  const res = await fetch(`${API_URL}/documents/${id}`);
  return res.json();
}

export async function sendChatMessage(documentId: string, question: string): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/chat/${documentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`Chat thất bại: ${res.status}`);
  return res.json();
}

export async function getChatHistory(documentId: string) {
  const res = await fetch(`${API_URL}/chat/${documentId}/history`);
  return res.json();
}
```

### 2.2 Upload component với polling: `frontend/src/components/DocumentUpload.tsx`
```tsx
import { useCallback, useState } from "react";
import { uploadDocument, getDocument, DocumentItem } from "../api/client";

export function DocumentUpload({ onReady }: { onReady: (doc: DocumentItem) => void }) {
  const [status, setStatus] = useState<string>("idle");
  const [dragOver, setDragOver] = useState(false);

  const pollUntilReady = useCallback(async (documentId: string) => {
    const poll = async () => {
      const doc = await getDocument(documentId);
      if (doc.status === "ready") {
        setStatus("ready");
        onReady(doc);
        return;
      }
      if (doc.status === "failed") {
        setStatus(`failed: ${doc.error_message}`);
        return;
      }
      setTimeout(poll, 2000); // poll mỗi 2s
    };
    poll();
  }, [onReady]);

  const handleFile = async (file: File) => {
    setStatus("uploading");
    const { document_id } = await uploadDocument(file);
    setStatus("processing");
    pollUntilReady(document_id);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragOver ? "border-emerald-400 bg-emerald-950/20" : "border-slate-600"
      }`}
    >
      <input
        type="file"
        accept=".pdf,.ipynb"
        className="hidden"
        id="file-input"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <label htmlFor="file-input" className="cursor-pointer text-slate-300">
        Kéo thả file PDF/Notebook vào đây, hoặc click để chọn
      </label>
      <p className="mt-2 text-sm text-slate-500">Trạng thái: {status}</p>
    </div>
  );
}
```

### 2.3 Chat UI với citation click-được: `frontend/src/components/ChatPanel.tsx`
```tsx
import { useState } from "react";
import { sendChatMessage, Citation } from "../api/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export function ChatPanel({ documentId }: { documentId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  const handleSend = async () => {
    if (!input.trim()) return;
    const question = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await sendChatMessage(documentId, question);
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer, citations: res.citations }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block max-w-[80%] rounded-lg px-4 py-2 ${
                m.role === "user" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-100"
              }`}
            >
              <p>{m.content}</p>
              {m.citations && m.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.citations.map((c, j) => (
                    <button
                      key={j}
                      onClick={() => setActiveCitation(c)}
                      className="text-xs bg-slate-700 hover:bg-slate-600 rounded px-2 py-0.5"
                    >
                      Nguồn: trang {c.page ?? "?"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="text-slate-400 text-sm">Đang trả lời...</p>}
      </div>

      {/* Sidebar hiển thị citation gốc khi click */}
      {activeCitation && (
        <div className="border-t border-slate-700 p-4 bg-slate-900">
          <div className="flex justify-between">
            <p className="text-sm font-semibold text-emerald-400">
              {activeCitation.source_file} — trang {activeCitation.page}
            </p>
            <button onClick={() => setActiveCitation(null)} className="text-slate-500">✕</button>
          </div>
          <p className="text-sm text-slate-300 mt-1">{activeCitation.chunk_text_snippet}</p>
        </div>
      )}

      <div className="p-4 border-t border-slate-700 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Hỏi về tài liệu..."
          className="flex-1 bg-slate-800 rounded px-3 py-2 text-white outline-none"
        />
        <button onClick={handleSend} disabled={loading} className="bg-emerald-600 rounded px-4 py-2 text-white">
          Gửi
        </button>
      </div>
    </div>
  );
}
```

### 2.4 Ghép lại `App.tsx`
```tsx
import { useState } from "react";
import { DocumentUpload } from "./components/DocumentUpload";
import { ChatPanel } from "./components/ChatPanel";
import type { DocumentItem } from "./api/client";

function App() {
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="p-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold">AI Campus Assistant</h1>
      </header>
      <main className="flex-1 flex flex-col p-4 gap-4 max-w-3xl mx-auto w-full">
        {!activeDoc ? (
          <DocumentUpload onReady={setActiveDoc} />
        ) : (
          <div className="flex-1 flex flex-col h-[70vh] border border-slate-800 rounded-lg">
            <ChatPanel documentId={activeDoc.id} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
```

### 2.5 (Tùy chọn) Streaming — ghi chú cách làm
Nếu muốn streaming thật, cần đổi endpoint `/chat/{document_id}` sang trả `StreamingResponse` (FastAPI) dùng `text/event-stream`, và phía Gemini dùng `generate_content_stream`. Vì structured JSON output khó stream từng phần, cách phổ biến: stream câu trả lời dạng text thô trước, sau đó gọi 1 lần riêng để lấy `citations` structured — phức tạp hơn, để dành làm sau khi MVP ổn định.

---

## 3. Checklist hoàn thành Phase 07
- [ ] Upload UI hoạt động, có loading state + poll đúng đến khi `ready`/`failed`
- [ ] Chat UI hiển thị đúng lịch sử hội thoại, gửi/nhận tin nhắn mượt
- [ ] Citation click được, mở đúng đoạn text gốc + số trang
- [ ] Test thử toàn bộ luồng: upload → chờ ready → hỏi 3-5 câu → kiểm tra citation chính xác
- [ ] (nếu làm streaming) response hiện dần, không bị giật

→ Xong Phase 07 = **MVP hoàn chỉnh, demo được**. Chuyển sang **Phase 08: Quiz Generation**.
