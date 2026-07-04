import { useState } from "react";
import type { ChatMessage, Citation } from "../types/chat";
import type { View } from "../components/layout/AppSidebar";
import { NavRail } from "../components/NavRail";
import { AIResponseCard } from "../components/AIResponseCard";
import { SourcePanel } from "../components/SourcePanel";
import { Icon } from "../components/Icon";

interface Props {
  onNavigate: (v: View) => void;
}

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    content: "Giải thích khái niệm 'Backpropagation' dựa trên chương 3 của tài liệu này.",
  },
  {
    id: "m2",
    role: "assistant",
    content:
      "Theo tài liệu Deep Learning Textbook, lan truyền ngược (Backpropagation) là một thuật toán được dùng để tính gradient của hàm mất mát đối với các trọng số trong mạng nơ-ron [1].\n\nQuá trình diễn ra qua hai giai đoạn chính:\n• Lan truyền tiến: tính giá trị đầu ra của các lớp [2].\n• Lan truyền ngược: áp dụng quy tắc chuỗi (chain rule) để tính đóng góp lỗi của từng nơ-ron, từ lớp đầu ra quay lại lớp đầu vào.\n\nTrong chương 3, tác giả nhấn mạnh việc tối ưu hiệu quả phụ thuộc vào tính gradient chính xác để cập nhật trọng số qua Gradient Descent.",
    citations: [
      {
        index: 1,
        sourceFile: "Deep Learning Textbook",
        page: 124,
        snippet: "The algorithm used to compute the gradient is known as backpropagation.",
        highlightedQuote:
          "The algorithm used to compute the gradient is known as backpropagation, which computes the chain rule with a specific order of operations that is highly efficient.",
      },
      {
        index: 2,
        sourceFile: "Deep Learning Textbook",
        page: 126,
        snippet: "Forward propagation computes and stores intermediate variables layer by layer.",
        highlightedQuote:
          "Forward propagation refers to the calculation and storage of intermediate variables for a neural network in order from the input layer to the output layer.",
      },
    ],
  },
];

export function ChatPage({ onNavigate }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [input, setInput] = useState("");

  function handleSubmit() {
    const content = input.trim();
    if (!content) return;
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content }]);
    setInput("");
  }

  return (
    <div className="flex h-full">
      <NavRail active="chat" onNavigate={onNavigate} />

      <section className="relative flex h-full flex-1 flex-col bg-background">
        <header className="flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-on-surface">Chat Nghiên cứu</h1>
            <span className="rounded-md bg-surface-container px-3 py-1 text-xs text-on-surface-variant">
              Phiên: Deep Learning Basics
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container">
              <Icon name="history" size={20} />
              Lịch sử
            </button>
            <button className="rounded-lg bg-navy px-5 py-2 text-sm font-semibold text-on-navy transition-colors hover:bg-navy-soft">
              Chia sẻ
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto flex w-full max-w-[800px] flex-col gap-8">
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-navy px-5 py-3.5 text-body-md text-on-navy shadow-sm">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <AIResponseCard
                  key={msg.id}
                  content={msg.content}
                  citations={msg.citations ?? []}
                  onCitationClick={setActiveCitation}
                />
              ),
            )}
          </div>
        </div>

        <div className="bg-gradient-to-t from-background to-transparent p-8">
          <div className="mx-auto max-w-[800px]">
            <div className="flex items-end rounded-2xl border border-outline-variant bg-surface p-2 shadow-lg transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
              <button
                type="button"
                aria-label="Đính kèm"
                className="p-3 text-on-surface-variant transition-colors hover:text-primary"
              >
                <Icon name="attach_file" size={20} />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={1}
                placeholder="Hỏi bất kỳ điều gì về tài liệu này..."
                className="max-h-48 flex-1 resize-none border-none bg-transparent px-2 py-3 text-body-md text-on-surface outline-none placeholder:text-outline"
              />
              <div className="flex items-center gap-2 p-1">
                <button
                  type="button"
                  aria-label="Ghi âm"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  <Icon name="mic" size={20} />
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  aria-label="Gửi"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-on-navy transition-all hover:bg-navy-soft active:scale-95"
                >
                  <Icon name="send" size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SourcePanel citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  );
}
