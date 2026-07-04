import { GraduationCap, Sun, Moon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import type { DocumentInfo } from "../types";
import { UploadZone } from "./UploadZone";
import { DocumentList } from "./DocumentList";

interface Props {
  documents: DocumentInfo[];
  selectedId: string | null;
  dark: boolean;
  onToggleTheme: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpload: (file: File) => Promise<void>;
}

export function Sidebar({
  documents,
  selectedId,
  dark,
  onToggleTheme,
  onSelect,
  onDelete,
  onUpload,
}: Props) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-accent text-accent-ink">
            <GraduationCap size={17} weight="fill" />
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            Campus<span className="text-accent">.</span>
          </span>
        </div>
        <motion.button
          type="button"
          onClick={onToggleTheme}
          aria-label="Đổi giao diện sáng/tối"
          whileTap={{ scale: 0.85 }}
          className="relative h-8 w-8 overflow-hidden rounded text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={dark ? "sun" : "moon"}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {dark ? <Sun size={17} weight="fill" /> : <Moon size={17} weight="fill" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      <div className="px-4">
        <UploadZone onUpload={onUpload} />
      </div>

      <div className="mt-5 flex items-center gap-2 px-5 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
          Tài liệu
        </span>
        <span className="h-px flex-1 bg-line" />
        {documents.length > 0 && (
          <span className="text-[10px] font-medium text-faint">{documents.length}</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <DocumentList
          documents={documents}
          selectedId={selectedId}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      </div>
    </aside>
  );
}
