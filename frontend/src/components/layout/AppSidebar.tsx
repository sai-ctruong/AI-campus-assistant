import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { api } from "../../api";
import type { DocumentInfo } from "../../types";

export type View = "library" | "chat" | "quiz" | "dashboard" | "notebook";

interface Props {
  active: View;
  onNavigate: (v: View) => void;
  onOpenDoc: (id: string, name: string) => void;
}

const NAV: { key: View; icon: string; label: string }[] = [
  { key: "library", icon: "collections_bookmark", label: "Library" },
  { key: "chat", icon: "chat_bubble", label: "Chat" },
  { key: "quiz", icon: "quiz", label: "Quiz" },
  { key: "notebook", icon: "terminal", label: "Notebook" },
  { key: "dashboard", icon: "dashboard", label: "Dashboard" },
];

export function AppSidebar({ active, onNavigate, onOpenDoc }: Props) {
  const [docs, setDocs] = useState<DocumentInfo[]>([]);

  useEffect(() => {
    api.listDocuments().then(setDocs).catch(() => setDocs([]));
  }, [active]); // refetch khi đổi trang (ví dụ vừa upload xong ở Library)

  const recent = docs.filter((d) => d.status === "ready").slice(0, 5);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-outline-variant bg-surface px-4 py-5">
      {/* Brand */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-on-navy">
          <Icon name="school" size={24} fill />
        </div>
        <div>
          <h1 className="font-serif text-xl font-bold leading-none text-on-surface">AI Campus</h1>
          <p className="mt-1 text-xs text-on-surface-variant">Academic Assistant</p>
        </div>
      </div>

      {/* New session */}
      <button
        type="button"
        onClick={() => onNavigate("library")}
        className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-on-navy transition-colors hover:bg-navy-soft"
      >
        <Icon name="add" size={20} />
        New Research Session
      </button>

      {/* Nav */}
      <nav className="mt-6 flex flex-col gap-1">
        {NAV.map((item) => {
          const on = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                on
                  ? "bg-surface-container font-semibold text-on-surface"
                  : "text-on-surface-variant hover:bg-surface-container/60"
              }`}
            >
              {on && <span className="absolute inset-y-2 right-0 w-1 rounded-full bg-primary" />}
              <Icon name={item.icon} size={22} fill={on} className={on ? "text-primary" : ""} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Recent docs (thật) */}
      <div className="mt-7 min-h-0 flex-1 overflow-y-auto px-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-outline">
          Tài liệu của tôi
        </p>
        {recent.length === 0 ? (
          <p className="mt-3 text-xs leading-relaxed text-outline">Chưa có tài liệu.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {recent.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => onOpenDoc(d.id, d.filename)}
                  className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-sm text-on-surface-variant transition-colors hover:bg-surface-container/60 hover:text-on-surface"
                  title={d.filename}
                >
                  <Icon
                    name={d.source_type === "notebook" ? "code" : "description"}
                    size={16}
                    className="shrink-0 text-outline"
                  />
                  <span className="truncate">{d.filename}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bottom */}
      <div className="mt-3 border-t border-outline-variant pt-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container/60">
          <Icon name="settings" size={22} />
          Settings
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container/60">
          <Icon name="help" size={22} />
          Help
        </button>
      </div>
    </aside>
  );
}
