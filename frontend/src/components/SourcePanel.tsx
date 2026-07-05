import { AnimatePresence, motion } from "motion/react";
import type { Citation } from "../types";
import { Icon } from "./Icon";

interface Props {
  citation: Citation | null;
  onClose: () => void;
}

const TOOLS = [
  { icon: "zoom_in", label: "Phóng to" },
  { icon: "border_color", label: "Đánh dấu" },
  { icon: "translate", label: "Dịch" },
  { icon: "share", label: "Gửi đi" },
];

export function SourcePanel({ citation, onClose }: Props) {
  return (
    <AnimatePresence>
      {citation && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink/40"
          />
          <motion.aside
            key="source-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-outline-variant bg-surface shadow-2xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-outline-variant px-5 md:px-6">
              <div className="flex items-center gap-2">
                <Icon name="description" size={20} className="text-secondary" />
                <h2 className="text-label-md font-medium uppercase tracking-wide text-on-surface-variant">
                  Nguồn trích dẫn [{citation.ref}]
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="text-on-surface-variant transition-colors hover:text-primary"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-surface-container-low p-5 md:p-6">
              <div className="rounded-lg border border-outline-variant bg-surface p-5 shadow-[0_4px_16px_rgba(24,35,56,0.08)] md:p-6">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-outline">
                  {citation.source_file} · {citation.location}
                </span>
                <div className="highlight-source mt-4 px-4 py-3 text-[14px] italic leading-relaxed text-on-surface">
                  "{citation.snippet}
                  {citation.snippet.length >= 200 ? "…" : ""}"
                </div>
                <p className="mt-4 text-[12px] leading-relaxed text-on-surface-variant">
                  Đoạn trích được trích xuất trực tiếp từ tài liệu bạn tải lên, dùng làm căn cứ cho câu
                  trả lời phía trên.
                </p>
              </div>
            </div>

            <footer className="flex items-center justify-around border-t border-outline-variant bg-surface p-2">
              {TOOLS.map((t) => (
                <button
                  key={t.icon}
                  type="button"
                  className="flex flex-col items-center gap-1 px-2 py-1 text-on-surface-variant transition-colors hover:text-primary"
                >
                  <Icon name={t.icon} size={20} />
                  <span className="text-[10px]">{t.label}</span>
                </button>
              ))}
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
