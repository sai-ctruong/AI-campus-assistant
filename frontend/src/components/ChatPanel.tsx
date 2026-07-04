import { useEffect, useRef, useState } from "react";
import { PaperPlaneRight, CircleNotch, Target } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { api } from "../api";
import type { Citation, ChatMessage, DocumentInfo } from "../types";
import { MessageBubble } from "./MessageBubble";
import { CitationDrawer } from "./CitationDrawer";

interface Props {
  document: DocumentInfo;
}

export function ChatPanel({ document: doc }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [useRerank, setUseRerank] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    setActiveCitation(null);
    setLoadingHistory(true);
    api
      .getHistory(doc.id)
      .then((turns) => {
        const restored: ChatMessage[] = [];
        for (const t of turns) {
          restored.push({ role: "user", text: t.question });
          restored.push({
            role: "assistant",
            text: t.answer,
            citations: t.citations,
            foundAnswer: t.found_answer,
            animate: false,
          });
        }
        setMessages(restored);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false));
  }, [doc.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const question = input.trim();
    if (!question || sending) return;
    setInput("");
    setSending(true);
    setMessages((m) => [
      ...m,
      { role: "user", text: question },
      { role: "assistant", text: "", pending: true },
    ]);

    try {
      const res = await api.chat(doc.id, question, useRerank);
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = {
          role: "assistant",
          text: res.answer,
          citations: res.citations,
          foundAnswer: res.found_answer,
          animate: true,
        };
        return next;
      });
    } catch (e) {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = {
          role: "assistant",
          text: e instanceof Error ? e.message : "Có lỗi xảy ra",
          error: true,
        };
        return next;
      });
    } finally {
      setSending(false);
    }
  }

  const ready = doc.status === "ready";

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-surface">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3.5">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-ink">{doc.filename}</h1>
          <p className="text-xs text-muted">
            {ready ? `${doc.chunk_count} đoạn đã lập chỉ mục` : "Đang xử lý tài liệu…"}
          </p>
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted">
          <Target size={14} weight={useRerank ? "fill" : "regular"} className={useRerank ? "text-accent" : ""} />
          Rerank
          <button
            type="button"
            role="switch"
            aria-checked={useRerank}
            onClick={() => setUseRerank((v) => !v)}
            className={`relative h-4.5 w-8 rounded-full border transition-colors ${
              useRerank ? "border-accent bg-accent" : "border-line bg-surface-2"
            }`}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className={`absolute top-0.5 h-3 w-3 rounded-full ${
                useRerank ? "right-0.5 bg-accent-ink" : "left-0.5 bg-faint"
              }`}
            />
          </button>
        </label>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="dotgrid flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-8">
          {loadingHistory ? (
            <HistorySkeleton />
          ) : messages.length === 0 ? (
            <EmptyChat onPick={(q) => setInput(q)} disabled={!ready} />
          ) : (
            messages.map((m, i) => (
              <MessageBubble key={i} message={m} onCitationClick={setActiveCitation} />
            ))
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-line bg-surface px-6 py-3.5">
        <div className="mx-auto flex max-w-3xl items-end gap-2.5">
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
            disabled={!ready}
            placeholder={ready ? "Hỏi bất cứ điều gì về tài liệu…" : "Chờ tài liệu xử lý xong…"}
            className="max-h-32 flex-1 resize-none rounded-lg border border-line bg-raised px-3.5 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-faint focus:border-accent disabled:opacity-60"
          />
          <button
            type="button"
            onClick={send}
            disabled={!ready || !input.trim() || sending}
            aria-label="Gửi"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-ink transition active:scale-95 disabled:opacity-40 enabled:hover:brightness-110"
          >
            {sending ? (
              <CircleNotch size={18} className="animate-spin" weight="bold" />
            ) : (
              <PaperPlaneRight size={18} weight="fill" />
            )}
          </button>
        </div>
      </div>

      <CitationDrawer citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {[["ml-auto w-40", true], ["w-64", false], ["ml-auto w-52", true], ["w-72", false]].map(
        ([w, user], i) => (
          <div
            key={i}
            className={`relative h-9 overflow-hidden rounded-lg bg-surface-2 shimmer ${w as string} ${
              user ? "rounded-tr-sm" : "rounded-tl-sm border border-line"
            }`}
          />
        ),
      )}
    </div>
  );
}

function EmptyChat({ onPick, disabled }: { onPick: (q: string) => void; disabled: boolean }) {
  const samples = [
    "Tóm tắt nội dung chính của tài liệu này",
    "Giải thích khái niệm quan trọng nhất",
    "Cho tôi vài câu hỏi ôn tập",
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-10 flex flex-col items-center text-center"
    >
      <span className="font-display text-3xl font-semibold text-ink">Hỏi tài liệu</span>
      <p className="mt-2 max-w-xs text-sm text-muted">
        Mọi câu trả lời đều kèm trích dẫn tới đúng trang trong tài liệu của bạn.
      </p>
      {!disabled && (
        <div className="mt-6 flex w-full max-w-md flex-col divide-y divide-line border-y border-line">
          {samples.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className="group flex items-center justify-between gap-3 px-1 py-3 text-left text-sm text-ink transition-colors hover:text-accent"
            >
              {s}
              <span className="text-faint transition-colors group-hover:text-accent">→</span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
