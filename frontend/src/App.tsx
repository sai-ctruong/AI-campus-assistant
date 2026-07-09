import { useRef, useState } from "react";
import type { View } from "./components/layout/AppSidebar";
import { Shell } from "./components/layout/Shell";
import { LibraryPage } from "./pages/LibraryPage";
import { ChatPage } from "./pages/ChatPage";
import { QuizPage } from "./pages/QuizPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NotebookPage } from "./pages/NotebookPage";
import { api } from "./api";

const TITLES: Record<Exclude<View, "chat">, string> = {
  library: "Library",
  quiz: "Quiz",
  dashboard: "Dashboard",
  notebook: "Notebook",
};

const ACCEPT = ".pdf,.docx,.ipynb";

export default function App() {
  const [view, setView] = useState<View>("library");
  const [doc, setDoc] = useState<{ id: string; name: string } | null>(null);
  // Tăng mỗi khi upload xong để LibraryPage tự làm mới danh sách.
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function openDoc(id: string, name: string) {
    setDoc({ id, name });
    setView("chat");
  }

  // Nút Upload trên TopBar: mở hộp chọn file ở bất kỳ trang nào.
  function triggerUpload() {
    setUploadError(null);
    inputRef.current?.click();
  }

  async function handleFile(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!/\.(pdf|ipynb|docx)$/i.test(file.name)) {
      setUploadError("Chỉ nhận file .pdf, .docx hoặc .ipynb");
      setView("library");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      await api.uploadDocument(file);
      setRefreshSignal((n) => n + 1);
      setView("library"); // đưa người dùng về Library để theo dõi xử lý
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload thất bại");
      setView("library");
    } finally {
      setUploading(false);
    }
  }

  // Input dùng chung cho nút Upload toàn cục.
  const uploadInput = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      className="hidden"
      onChange={(e) => handleFile(e.target.files?.[0])}
    />
  );

  // Chat có layout riêng (rail + panel nguồn), không dùng Shell.
  if (view === "chat")
    return (
      <>
        {uploadInput}
        <ChatPage documentId={doc?.id ?? null} documentName={doc?.name ?? null} onNavigate={setView} />
      </>
    );

  const content =
    view === "library" ? (
      <LibraryPage onOpenDoc={openDoc} refreshSignal={refreshSignal} externalError={uploadError} />
    ) : view === "quiz" ? (
      <QuizPage />
    ) : view === "notebook" ? (
      <NotebookPage />
    ) : (
      <DashboardPage />
    );

  return (
    <>
      {uploadInput}
      <Shell
        active={view}
        title={TITLES[view]}
        onNavigate={setView}
        onOpenDoc={openDoc}
        padded={view !== "notebook"}
        onUpload={triggerUpload}
        uploading={uploading}
      >
        {content}
      </Shell>
    </>
  );
}
