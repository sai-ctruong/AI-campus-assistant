import { WarningCircle, Info } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import type { ChatMessage, Citation } from "../types";
import { useTypewriter } from "../hooks/useTypewriter";
import { TypingIndicator } from "./TypingIndicator";

interface Props {
  message: ChatMessage;
  onCitationClick: (c: Citation) => void;
}

/** Tách text câu trả lời, biến [1][2] thành chip bấm được → mở nguồn. */
function renderWithCitations(text: string, citations: Citation[], onClick: (c: Citation) => void) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (!m) return <span key={i}>{part}</span>;
    const ref = Number(m[1]);
    const citation = citations.find((c) => c.ref === ref);
    if (!citation) return <span key={i}>{part}</span>;
    return (
      <button
        key={i}
        type="button"
        onClick={() => onClick(citation)}
        className="mx-0.5 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded bg-accent-soft px-1 align-super text-[10px] font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-ink"
      >
        {ref}
      </button>
    );
  });
}

export function MessageBubble({ message, onCitationClick }: Props) {
  const reduce = useReducedMotion();
  const isUser = message.role === "user";
  const typing = !!message.animate && !message.error;
  const shownText = useTypewriter(message.text, typing);
  const stillTyping = typing && !reduce && shownText.length < message.text.length;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
    >
      <span className="mb-1 px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-faint">
        {isUser ? "Bạn" : "Trợ lý"}
      </span>
      <div
        className={`max-w-[80%] px-4 py-2.5 text-[15px] leading-relaxed ${
          isUser
            ? "rounded-lg rounded-tr-sm bg-accent text-accent-ink"
            : "rounded-lg rounded-tl-sm border border-line bg-raised text-ink"
        }`}
      >
        {message.pending ? (
          <TypingIndicator />
        ) : message.error ? (
          <span className="flex items-center gap-2 text-red-500">
            <WarningCircle size={16} weight="fill" />
            {message.text}
          </span>
        ) : (
          <span className="whitespace-pre-wrap">
            {message.citations
              ? renderWithCitations(shownText, message.citations, onCitationClick)
              : shownText}
            {stillTyping && (
              <span className="ml-0.5 inline-block h-4 w-[2px] -translate-y-0.5 animate-pulse bg-accent align-middle" />
            )}
          </span>
        )}

        {!isUser && !stillTyping && message.foundAnswer === false && (
          <span className="mt-1.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
            <Info size={13} weight="fill" />
            Ngoài phạm vi tài liệu
          </span>
        )}
      </div>
    </motion.div>
  );
}
