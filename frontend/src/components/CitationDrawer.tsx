import { X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import type { Citation } from "../types";

interface Props {
  citation: Citation | null;
  onClose: () => void;
}

export function CitationDrawer({ citation, onClose }: Props) {
  return (
    <AnimatePresence>
      {citation && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 z-20 bg-ink/15"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-line bg-surface"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-accent text-[11px] font-semibold text-accent-ink">
                  {citation.ref}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                  Nguồn trích dẫn
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="rounded p-1 text-faint transition hover:bg-surface-2 hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <p className="truncate text-sm font-semibold text-ink">{citation.source_file}</p>
              <p className="mt-0.5 text-xs text-muted">{citation.location}</p>

              <div className="mt-4 border-l-2 border-accent pl-4">
                <p className="text-sm leading-relaxed text-muted">
                  {citation.snippet}
                  {citation.snippet.length >= 200 && "…"}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
