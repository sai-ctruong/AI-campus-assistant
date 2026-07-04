import type { Citation } from "../types";
import { CitationChip } from "./CitationChip";
import { Icon } from "./Icon";

interface Props {
  content: string;
  citations: Citation[];
  onCitationClick: (citation: Citation) => void;
}

/**
 * Chèn chip vào giữa text: tách content theo regex bắt cả marker đơn "[1]" lẫn
 * gộp "[1, 2, 3]" (LLM đôi khi gộp). Mỗi số → 1 chip bấm được khớp citation.ref.
 * Không dùng markdown parser vì chỉ có 1 loại phần tử động là marker trích dẫn.
 */
function renderContent(content: string, citations: Citation[], onClick: (c: Citation) => void) {
  return content.split(/(\[[\d,\s]+\])/g).map((segment, i) => {
    const match = segment.match(/^\[([\d,\s]+)\]$/);
    if (!match) return <span key={i}>{segment}</span>;
    const refs = match[1].split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
    const chips = refs
      .map((ref) => ({ ref, citation: citations.find((c) => c.ref === ref) }))
      .filter((x) => x.citation);
    if (chips.length === 0) return <span key={i}>{segment}</span>;
    return (
      <span key={i} className="inline-flex gap-0.5">
        {chips.map(({ ref, citation }) => (
          <CitationChip key={ref} index={ref} onClick={() => onClick(citation!)} />
        ))}
      </span>
    );
  });
}

export function AIResponseCard({ content, citations, onCitationClick }: Props) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-[0_1px_3px_rgba(24,35,56,0.08)]">
      <div className="mb-4 flex items-center gap-2">
        <Icon name="auto_awesome" size={22} fill className="text-secondary" />
        <span className="text-label-md font-semibold uppercase tracking-wider text-secondary">
          AI Assistant
        </span>
      </div>

      <p className="whitespace-pre-wrap text-body-md leading-relaxed text-on-surface">
        {renderContent(content, citations, onCitationClick)}
      </p>

      <div className="mt-6 flex items-center justify-between border-t border-outline-variant pt-4">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 text-on-surface-variant transition-colors hover:text-secondary">
            <Icon name="content_copy" size={18} />
            <span className="text-label-md">Sao chép</span>
          </button>
          <button className="flex items-center gap-1.5 text-on-surface-variant transition-colors hover:text-secondary">
            <Icon name="refresh" size={18} />
            <span className="text-label-md">Thử lại</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button aria-label="Hữu ích" className="text-on-surface-variant transition-colors hover:text-secondary">
            <Icon name="thumb_up" size={20} />
          </button>
          <button aria-label="Chưa tốt" className="text-on-surface-variant transition-colors hover:text-error">
            <Icon name="thumb_down" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
