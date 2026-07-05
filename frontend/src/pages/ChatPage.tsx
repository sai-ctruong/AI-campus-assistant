import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { Citation } from "../types";
import type { View } from "../components/layout/AppSidebar";
import { NavRail } from "../components/NavRail";
import { AIResponseCard } from "../components/AIResponseCard";
import { SourcePanel } from "../components/SourcePanel";
import { Icon } from "../components/Icon";
import { useSpeech, stripCitations } from "../hooks/useSpeech";

interface Props {
  documentId: string | null;
  documentName: string | null;
  onNavigate: (v: View) => void;
}

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  foundAnswer?: boolean;
  pending?: boolean;
  error?: boolean;
}

export function ChatPage({ documentId, documentName, onNavigate }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [useRerank, setUseRerank] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speech = useSpeech();

  useEffect(() => {
    setMessages([]);
    setActiveCitation(null);
    if (!documentId) return;
    api
      .getHistory(documentId)
      .then((turns) => {
        const restored: Msg[] = [];
        for (const t of turns) {
          restored.push({ id: crypto.randomUUID(), role: "user", content: t.question });
          restored.push({
            id: crypto.randomUUID(),
            role: "assistant",
            content: t.answer,
            citations: t.citations,
            foundAnswer: t.found_answer,
          });
        }
        setMessages(restored);
      })
      .catch(() => setMessages([]));
  }, [documentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(textArg?: string) {
    const question = (textArg ?? input).trim();
    if (!question || sending || !documentId) return;
    setInput("");
    setSending(true);
    const pendingId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", content: question },
      { id: pendingId, role: "assistant", content: "", pending: true },
    ]);
    try {
      const res = await api.chat(documentId, question, useRerank);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingId
            ? { ...msg, pending: false, content: res.answer, citations: res.citations, foundAnswer: res.found_answer }
            : msg,
        ),
      );
      if (autoSpeak) speech.speak(stripCitations(res.answer));
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingId
            ? { ...msg, pending: false, error: true, content: e instanceof Error ? e.message : "Có lỗi xảy ra" }
            : msg,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full">
      <NavRail active="chat" onNavigate={onNavigate} />

      <section className="relative flex h-full flex-1 flex-col bg-background">
        <header className="flex h-16 items-center justify-between gap-2 border-b border-outline-variant bg-surface px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="shrink-0 text-lg font-bold text-on-surface md:text-2xl">Chat</h1>
            {documentName && (
              <span className="hidden max-w-[40vw] truncate rounded-md bg-surface-container px-3 py-1 text-xs text-on-surface-variant sm:inline">
                {documentName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-5">
            {speech.ttsSupported && (
              <button
                type="button"
                onClick={() => {
                  if (speech.speaking) speech.stopSpeaking();
                  setAutoSpeak((v) => !v);
                }}
                title="Tự động đọc câu trả lời"
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  autoSpeak ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Icon name={autoSpeak ? "volume_up" : "volume_off"} size={18} fill={autoSpeak} />
                Đọc
              </button>
            )}
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-on-surface-variant">
              <Icon name="tune" size={16} className={useRerank ? "text-primary" : ""} />
              Rerank
              <button
                type="button"
                role="switch"
                aria-checked={useRerank}
                onClick={() => setUseRerank((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors ${useRerank ? "bg-primary" : "bg-surface-container"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-all ${useRerank ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </label>
          </div>
        </header>

        {!documentId ? (
          <EmptyDoc onGoLibrary={() => onNavigate("library")} />
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
              <div className="mx-auto flex w-full max-w-[800px] flex-col gap-8">
                {messages.length === 0 && (
                  <p className="mt-10 text-center text-sm text-on-surface-variant">
                    Bắt đầu bằng một câu hỏi về tài liệu này.
                  </p>
                )}
                {messages.map((msg) =>
                  msg.role === "user" ? (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-navy px-5 py-3.5 text-body-md text-on-navy shadow-sm">
                        {msg.content}
                      </div>
                    </div>
                  ) : msg.pending ? (
                    <div key={msg.id} className="flex items-center gap-2 text-on-surface-variant">
                      <Icon name="progress_activity" size={18} className="animate-spin" />
                      <span className="text-sm">Đang suy nghĩ…</span>
                    </div>
                  ) : msg.error ? (
                    <div key={msg.id} className="flex items-center gap-2 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
                      <Icon name="error" size={18} />
                      {msg.content}
                    </div>
                  ) : (
                    <AIResponseCard
                      key={msg.id}
                      content={msg.content}
                      citations={msg.citations ?? []}
                      onCitationClick={setActiveCitation}
                    />
                  ),
                )}
              </div>
            </div>

            <div className="bg-gradient-to-t from-background to-transparent p-4 md:p-8">
              <div className="mx-auto max-w-[800px]">
                {speech.listening && (
                  <p className="mb-2 flex items-center gap-2 text-sm text-primary">
                    <Icon name="graphic_eq" size={16} /> Đang nghe… hãy nói câu hỏi của bạn.
                  </p>
                )}
                {speech.error && (
                  <p className="mb-2 flex items-center gap-2 text-sm text-error">
                    <Icon name="mic_off" size={16} /> {speech.error}
                  </p>
                )}
                <div className="flex items-end rounded-2xl border border-outline-variant bg-surface p-2 shadow-lg transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                  {speech.sttSupported && (
                    <button
                      type="button"
                      aria-label="Nói câu hỏi"
                      title="Nhấn để nói (tiếng Việt)"
                      onClick={() =>
                        speech.listening
                          ? speech.stopListening()
                          : speech.startListening((t) => send(t))
                      }
                      className={`m-1 flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                        speech.listening
                          ? "animate-pulse bg-error/10 text-error"
                          : "text-on-surface-variant hover:bg-surface-container hover:text-primary"
                      }`}
                    >
                      <Icon name={speech.listening ? "graphic_eq" : "mic"} size={20} />
                    </button>
                  )}
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    placeholder="Hỏi bất kỳ điều gì về tài liệu này..."
                    className="max-h-48 flex-1 resize-none border-none bg-transparent px-2 py-3 text-body-md text-on-surface outline-none placeholder:text-outline"
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || sending}
                    aria-label="Gửi"
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-on-navy transition-all hover:bg-navy-soft active:scale-95 disabled:opacity-40"
                  >
                    <Icon name="send" size={20} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <SourcePanel citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  );
}

function EmptyDoc({ onGoLibrary }: { onGoLibrary: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Icon name="forum" size={40} className="text-outline" />
      <p className="mt-3 text-base font-medium text-on-surface">Chưa chọn tài liệu</p>
      <p className="mt-1 text-sm text-on-surface-variant">Chọn một tài liệu đã xử lý xong để bắt đầu hỏi đáp.</p>
      <button onClick={onGoLibrary} className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover">
        Tới Library
      </button>
    </div>
  );
}
