import { Icon } from "../Icon";
import type { View } from "./AppSidebar";

interface Props {
  title: string;
  active: View;
  onNavigate: (v: View) => void;
  onUpload?: () => void;
}

export function TopBar({ title, active, onNavigate, onUpload }: Props) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-6 border-b border-outline-variant bg-surface px-8">
      <h2 className="font-serif text-2xl font-bold text-on-surface">{title}</h2>

      <nav className="flex items-center gap-5 text-sm">
        <button
          onClick={() => onNavigate("library")}
          className={
            active === "library"
              ? "border-b-2 border-primary pb-0.5 font-semibold text-primary"
              : "pb-0.5 text-on-surface-variant transition-colors hover:text-on-surface"
          }
        >
          Documents
        </button>
        <button
          onClick={() => onNavigate("notebook")}
          className={
            active === "notebook"
              ? "border-b-2 border-primary pb-0.5 font-semibold text-primary"
              : "pb-0.5 text-on-surface-variant transition-colors hover:text-on-surface"
          }
        >
          History
        </button>
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative w-56 lg:w-72">
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
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
        >
          <Icon name="upload" size={18} />
          Upload
        </button>

        <button className="shrink-0 text-on-surface-variant transition-colors hover:text-on-surface">
          <Icon name="notifications" size={22} />
        </button>
      </div>
    </header>
  );
}
