import { AnimatePresence, motion } from "motion/react";
import type { Citation } from "../types/chat";
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
          <div className="flex h-16 w-[420px] items-center justify-between border-b border-outline-variant px-lg">
            <div className="flex items-center gap-sm">
              <Icon name="description" size={20} className="text-secondary" />
              <h2 className="text-label-md font-medium uppercase tracking-wide text-on-surface-variant">
                Nguồn trích dẫn [{citation.index}]
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

          <div className="w-[420px] flex-1 overflow-y-auto bg-surface-container-low p-lg">
            <div className="flex min-h-[500px] flex-col gap-lg rounded border border-outline-variant bg-surface p-xl shadow-[0_8px_24px_rgba(30,42,74,0.12)]">
              <span className="text-[10px] font-medium uppercase tracking-wide text-outline">
                {citation.sourceFile} · trang {citation.page}
              </span>
              <div className="space-y-md text-on-surface/90">
                <h3 className="font-display text-[20px] font-semibold">
                  3.4 Gradient-Based Optimization
                </h3>
                <p className="text-[13px] leading-relaxed">
                  Most deep learning algorithms involve optimization of some sort. Optimization
                  refers to the task of either minimizing or maximizing some function f(x) by
                  altering x. {citation.snippet}
                </p>
                <div className="highlight-source my-md px-md py-base text-[14px] italic">
                  "{citation.highlightedQuote}"
                </div>
                <p className="text-[13px] leading-relaxed text-on-surface-variant">
                  The gradient of a function gives the direction of steepest ascent; following its
                  negative gives steepest descent, the basis of gradient descent.
                </p>
              </div>
            </div>
          </div>

          <footer className="flex w-[420px] items-center justify-around border-t border-outline-variant bg-surface p-sm">
            {TOOLS.map((t) => (
              <button
                key={t.icon}
                type="button"
                className="flex flex-col items-center gap-xs px-sm py-xs text-on-surface-variant transition-colors hover:text-primary"
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
