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
        <motion.aside
          key="source-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 420, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="flex h-full shrink-0 flex-col overflow-hidden border-l border-outline-variant bg-surface"
        >
          <div className="flex h-16 w-[420px] items-center justify-between border-b border-outline-variant px-6">
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

          <div className="w-[420px] flex-1 overflow-y-auto bg-surface-container-low p-6">
            <div className="rounded-lg border border-outline-variant bg-surface p-6 shadow-[0_4px_16px_rgba(24,35,56,0.08)]">
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

          <footer className="flex w-[420px] items-center justify-around border-t border-outline-variant bg-surface p-2">
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
      )}
    </AnimatePresence>
  );
}
