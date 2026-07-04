import type { ReactNode } from "react";
import { AppSidebar, type View } from "./AppSidebar";
import { TopBar } from "./TopBar";

interface Props {
  active: View;
  title: string;
  onNavigate: (v: View) => void;
  children: ReactNode;
}

/** Khung chung: Sidebar sáng trái + TopBar + vùng nội dung cuộn. */
export function Shell({ active, title, onNavigate, children }: Props) {
  return (
    <div className="flex h-full">
      <AppSidebar active={active} onNavigate={onNavigate} />
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto bg-background px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
