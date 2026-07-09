import { useState, type ReactNode } from "react";
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
  uploading?: boolean;
}

/** Khung chung: Sidebar (drawer trên mobile) + TopBar + vùng nội dung. */
export function Shell({ active, title, onNavigate, onOpenDoc, children, padded = true, onUpload, uploading }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-full">
      <AppSidebar
        active={active}
        open={open}
        onNavigate={(v) => {
          onNavigate(v);
          setOpen(false);
        }}
        onOpenDoc={(id, name) => {
          onOpenDoc(id, name);
          setOpen(false);
        }}
      />

      {/* Backdrop khi mở drawer trên mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title={title} onUpload={onUpload} uploading={uploading} onMenuClick={() => setOpen(true)} />
        <main className={`flex-1 overflow-y-auto bg-background ${padded ? "px-4 py-5 md:px-8 md:py-7" : ""}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
