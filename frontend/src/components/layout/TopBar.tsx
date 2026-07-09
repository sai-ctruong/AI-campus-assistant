import { Icon } from "../Icon";

interface Props {
  title: string;
  onUpload?: () => void;
  uploading?: boolean;
  onMenuClick?: () => void;
}

export function TopBar({ title, onUpload, uploading, onMenuClick }: Props) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-outline-variant bg-surface px-4 md:gap-6 md:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Menu"
        className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container md:hidden"
      >
        <Icon name="menu" size={24} />
      </button>

      <h2 className="font-serif truncate text-xl font-bold text-on-surface md:text-2xl">{title}</h2>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="relative hidden w-56 lg:block lg:w-72">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline">
            <Icon name="search" size={20} />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu..."
            className="w-full rounded-full border border-outline-variant bg-surface-container-low py-2.5 pl-10 pr-4 text-sm text-on-surface outline-none transition placeholder:text-outline focus:border-primary"
          />
        </div>

        <button
          type="button"
          onClick={onUpload}
          disabled={uploading}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 md:px-4"
        >
          <Icon name={uploading ? "progress_activity" : "upload"} size={18} className={uploading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">{uploading ? "Đang tải…" : "Upload"}</span>
        </button>

        <button className="shrink-0 text-on-surface-variant transition-colors hover:text-on-surface">
          <Icon name="notifications" size={22} />
        </button>
      </div>
    </header>
  );
}
