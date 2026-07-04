interface Props {
  index: number;
  onClick: () => void;
}

/**
 * Chip trích dẫn "[n]" chèn giữa câu trả lời.
 * Style bám HTML gốc: nền secondary-container, chữ on-secondary-container,
 * hover đổi sang secondary + on-secondary. Dùng token, không hardcode hex.
 */
export function CitationChip({ index, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-0.5 inline-flex h-[18px] min-w-[18px] cursor-pointer items-center justify-center rounded bg-secondary-container px-1 align-baseline text-[10px] font-bold text-on-secondary-container transition-colors hover:bg-secondary hover:text-on-secondary"
    >
      {index}
    </button>
  );
}
