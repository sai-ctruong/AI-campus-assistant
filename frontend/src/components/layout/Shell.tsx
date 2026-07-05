import type { ReactNode } from "react";
import { AppSidebar, type View } from "./AppSidebar";
import { TopBar } from "./TopBar";

interface Props {
  active: View;
  title: string;
  onNavigate: (v: View) => void;
  onOpenDoc: (id: string, name: string) => void;
  children: ReactNode;
  padded?: boolean;
  onUpload?: () => void;
}

/** Khung chung: Sidebar sáng trái + TopBar + vùng nội dung. */
export function Shell({ active, title, onNavigate, onOpenDoc, children, padded = true, onUpload }: Props) {
  return (
    <div className="flex h-full">
      <AppSidebar active={active} onNavigate={onNavigate} onOpenDoc={onOpenDoc} />
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <TopBar title={title} onUpload={onUpload} />
        <main className={`flex-1 overflow-y-auto bg-background ${padded ? "px-8 py-7" : ""}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
