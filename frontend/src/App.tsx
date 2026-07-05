import { useState } from "react";
import type { View } from "./components/layout/AppSidebar";
import { Shell } from "./components/layout/Shell";
import { LibraryPage } from "./pages/LibraryPage";
import { ChatPage } from "./pages/ChatPage";
import { QuizPage } from "./pages/QuizPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NotebookPage } from "./pages/NotebookPage";

const TITLES: Record<Exclude<View, "chat">, string> = {
  library: "Library",
  quiz: "Quiz",
  dashboard: "Dashboard",
  notebook: "Notebook",
};

export default function App() {
  const [view, setView] = useState<View>("library");
  const [doc, setDoc] = useState<{ id: string; name: string } | null>(null);

  function openDoc(id: string, name: string) {
    setDoc({ id, name });
    setView("chat");
  }

  // Chat có layout riêng (rail + panel nguồn), không dùng Shell.
  if (view === "chat")
    return <ChatPage documentId={doc?.id ?? null} documentName={doc?.name ?? null} onNavigate={setView} />;

  const content =
    view === "library" ? (
      <LibraryPage onOpenDoc={openDoc} />
    ) : view === "quiz" ? (
      <QuizPage />
    ) : view === "notebook" ? (
      <NotebookPage />
    ) : (
      <DashboardPage />
    );

  return (
    <Shell
      active={view}
      title={TITLES[view]}
      onNavigate={setView}
      onOpenDoc={openDoc}
      padded={view !== "notebook"}
      onUpload={() => setView("library")}
    >
      {content}
    </Shell>
  );
}
