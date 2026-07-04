interface IconProps {
  /** Tên icon Material Symbols, ví dụ "send", "auto_awesome". */
  name: string;
  size?: number;
  fill?: boolean;
  className?: string;
}

/** Bọc Material Symbols outlined thành 1 component thống nhất (size, fill). */
export function Icon({ name, size = 20, fill = false, className = "" }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${fill ? "fill" : ""} ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
