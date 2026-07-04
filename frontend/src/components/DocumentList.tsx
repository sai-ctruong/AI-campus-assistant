import { FilePdf, FileCode, Trash, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import type { DocumentInfo } from "../types";

interface Props {
  documents: DocumentInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function StatusHint({ doc }: { doc: DocumentInfo }) {
  if (doc.status === "processing")
    return (
      <span className="flex items-center gap-1 text-accent">
        <CircleNotch size={11} className="animate-spin" weight="bold" />
        Đang xử lý
      </span>
    );
  if (doc.status === "failed")
    return (
      <span className="flex items-center gap-1 text-red-500">
        <WarningCircle size={11} weight="fill" />
        Lỗi
      </span>
    );
  return <span className="text-faint">{doc.chunk_count} đoạn</span>;
}

export function DocumentList({ documents, selectedId, onSelect, onDelete }: Props) {
  if (documents.length === 0) {
    return (
      <p className="px-2 py-8 text-center text-xs leading-relaxed text-faint">
        Chưa có tài liệu.
        <br />
        Tải lên PDF hoặc notebook để bắt đầu.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      <AnimatePresence initial={false}>
        {documents.map((doc) => {
          const active = doc.id === selectedId;
          const Icon = doc.source_type === "notebook" ? FileCode : FilePdf;
          const processing = doc.status === "processing";
          return (
            <motion.li
              key={doc.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10, height: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            >
              <div
                className={`group relative flex items-center gap-2.5 overflow-hidden rounded-md px-2.5 py-2 transition-colors ${
                  active ? "bg-surface-2" : "hover:bg-surface-2/60"
                } ${processing ? "shimmer" : ""}`}
              >
                {active && (
                  <motion.span
                    layoutId="doc-active-bar"
                    className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent"
                  />
                )}
                <button
                  type="button"
                  onClick={() => onSelect(doc.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <Icon size={17} weight={active ? "fill" : "regular"} className={active ? "text-accent" : "text-faint"} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${active ? "text-ink" : "text-ink/90"}`}>
                      {doc.filename}
                    </span>
                    <span className="mt-0.5 block text-[11px]">
                      <StatusHint doc={doc} />
                    </span>
                  </span>
                </button>
                <motion.button
                  type="button"
                  onClick={() => onDelete(doc.id)}
                  aria-label="Xóa tài liệu"
                  whileTap={{ scale: 0.85 }}
                  className="shrink-0 rounded p-1 text-faint opacity-0 transition hover:bg-red-500/10 hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash size={15} />
                </motion.button>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
