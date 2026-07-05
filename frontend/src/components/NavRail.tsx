import { Icon } from "./Icon";
import type { View } from "./layout/AppSidebar";

interface Props {
  active: View;
  onNavigate: (v: View) => void;
}

const ITEMS: { key: View; icon: string }[] = [
  { key: "library", icon: "collections_bookmark" },
  { key: "chat", icon: "chat_bubble" },
  { key: "quiz", icon: "quiz" },
  { key: "notebook", icon: "terminal" },
  { key: "dashboard", icon: "dashboard" },
];

/** Rail điều hướng dọc 72px (dùng ở trang Chat để nhường chỗ cho panel nguồn). */
export function NavRail({ active, onNavigate }: Props) {
  return (
    <nav className="flex h-full w-[72px] shrink-0 flex-col items-center border-r border-outline-variant bg-surface py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-on-navy">
        <Icon name="school" size={22} fill />
      </div>

      <div className="mt-6 flex flex-1 flex-col items-center gap-1">
        {ITEMS.map((item) => {
          const on = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                on
                  ? "bg-surface-container text-primary"
                  : "text-on-surface-variant hover:bg-surface-container/60"
              }`}
            >
              <Icon name={item.icon} size={22} fill={on} />
            </button>
          );
        })}
      </div>

      <button className="flex h-12 w-12 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface-container/60">
        <Icon name="settings" size={22} />
      </button>
    </nav>
  );
}
