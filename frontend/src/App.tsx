import { useState } from "react";
import type { View } from "./components/layout/AppSidebar";
import { Shell } from "./components/layout/Shell";
import { LibraryPage } from "./pages/LibraryPage";
import { ChatPage } from "./pages/ChatPage";
import { QuizPage } from "./pages/QuizPage";
import { DashboardPage } from "./pages/DashboardPage";

const TITLES: Record<Exclude<View, "chat">, string> = {
  library: "Library",
  quiz: "Quiz",
  dashboard: "Dashboard",
};

export default function App() {
  const [view, setView] = useState<View>("library");

  // Chat có layout riêng (rail 72px + panel nguồn), không dùng Shell.
  if (view === "chat") return <ChatPage onNavigate={setView} />;

  const content =
    view === "library" ? <LibraryPage /> : view === "quiz" ? <QuizPage /> : <DashboardPage />;

  return (
    <Shell active={view} title={TITLES[view]} onNavigate={setView}>
      {content}
    </Shell>
  );
}
