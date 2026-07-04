import type { Citation } from "../types/chat";
import { CitationChip } from "./CitationChip";
import { Icon } from "./Icon";

interface Props {
  content: string;
  citations: Citation[];
  onCitationClick: (citation: Citation) => void;
}

/**
 * Cách chèn chip vào giữa text (phần khó nhất):
 * Mình KHÔNG dùng markdown parser mà tách content thành các "segment" bằng regex
 * /(\[\d+\])/. Lý do:
 *  - Phần tử động duy nhất trong câu trả lời là marker trích dẫn [n]; markdown
 *    parser là quá mức cần thiết và còn phải viết custom renderer để nhét được
 *    React component (chip bấm được) vào giữa 1 paragraph.
 *  - Tách segment giữ được chip là React component thật (onClick), thay vì phải
 *    dùng dangerouslySetInnerHTML.
 *  - Nếu sau này cần markdown thật (heading, list, bold), sẽ đổi sang react-markdown
 *    và khai báo renderer riêng cho [n]. Hiện tại giữ đơn giản, đúng nhu cầu.
 * whitespace-pre-wrap giữ nguyên xuống dòng trong content mock.
 */
function renderContent(content: string, citations: Citation[], onClick: (c: Citation) => void) {
  return content.split(/(\[\d+\])/g).map((segment, i) => {
    const match = segment.match(/^\[(\d+)\]$/);
    if (!match) return <span key={i}>{segment}</span>;
    const index = Number(match[1]);
    const citation = citations.find((c) => c.index === index);
    if (!citation) return <span key={i}>{segment}</span>;
    return <CitationChip key={i} index={index} onClick={() => onClick(citation)} />;
  });
}

export function AIResponseCard({ content, citations, onCitationClick }: Props) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface p-lg shadow-[0_1px_3px_rgba(30,42,74,0.08)]">
      <div className="mb-md flex items-center gap-sm">
        <Icon name="auto_awesome" size={22} fill className="text-secondary" />
        <span className="text-label-md font-semibold uppercase tracking-wider text-secondary">
          AI Assistant
        </span>
      </div>

      <p className="whitespace-pre-wrap text-body-md leading-relaxed text-on-surface">
        {renderContent(content, citations, onCitationClick)}
      </p>

      <div className="mt-lg flex items-center justify-between border-t border-outline-variant pt-md">
        <div className="flex items-center gap-md">
          <button
            type="button"
            className="flex items-center gap-xs text-on-surface-variant transition-colors hover:text-secondary"
          >
            <Icon name="content_copy" size={18} />
            <span className="text-label-md">Sao chép</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-xs text-on-surface-variant transition-colors hover:text-secondary"
          >
            <Icon name="refresh" size={18} />
            <span className="text-label-md">Thử lại</span>
          </button>
        </div>
        <div className="flex items-center gap-sm">
          <button
            type="button"
            aria-label="Hữu ích"
            className="text-on-surface-variant transition-colors hover:text-secondary"
          >
            <Icon name="thumb_up" size={20} />
          </button>
          <button
            type="button"
            aria-label="Chưa tốt"
            className="text-on-surface-variant transition-colors hover:text-error"
          >
            <Icon name="thumb_down" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
