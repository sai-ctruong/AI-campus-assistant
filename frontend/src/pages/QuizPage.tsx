import { useEffect, useState } from "react";
import { api } from "../api";
import type { DocumentInfo, QuizResponse } from "../types";
import { Icon } from "../components/Icon";

type Stage = "pick" | "generating" | "quiz" | "done";

export function QuizPage() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [stage, setStage] = useState<Stage>("pick");
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [docName, setDocName] = useState("");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showCards, setShowCards] = useState(false);
  const [flipped, setFlipped] = useState<number | null>(null);

  useEffect(() => {
    api.listDocuments().then(setDocuments).catch(() => setError("Không kết nối được backend."));
  }, []);

  const ready = documents.filter((d) => d.status === "ready");

  async function start(doc: DocumentInfo) {
    setStage("generating");
    setError(null);
    setDocName(doc.filename);
    try {
      const q = await api.generateQuiz(doc.id, 5);
      setQuiz(q);
      setCurrent(0);
      setSelected(null);
      setAnswered(false);
      setScore(0);
      setShowCards(false);
      setStage("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không sinh được quiz");
      setStage("pick");
    }
  }

  function submitAnswer(i: number) {
    if (answered || !quiz) return;
    setSelected(i);
    setAnswered(true);
    const q = quiz.questions[current];
    const correct = i === q.correct_index;
    if (correct) setScore((s) => s + 1);
    api.recordAttempt(quiz.document_id, q.question, correct).catch(() => {});
  }

  function next() {
    if (!quiz) return;
    if (current + 1 >= quiz.questions.length) {
      setStage("done");
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  // ---------- Chọn tài liệu ----------
  if (stage === "pick" || stage === "generating") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-on-surface">Tạo đề ôn tập</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Chọn một tài liệu đã xử lý xong — AI sẽ sinh câu hỏi trắc nghiệm từ nội dung của nó.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
            <Icon name="error" size={18} />
            {error}
          </div>
        )}

        {stage === "generating" ? (
          <div className="flex flex-col items-center rounded-2xl border border-outline-variant bg-surface py-16">
            <Icon name="progress_activity" size={36} className="animate-spin text-primary" />
            <p className="mt-4 font-medium text-on-surface">Đang sinh câu hỏi từ "{docName}"…</p>
            <p className="mt-1 text-sm text-on-surface-variant">Mất khoảng 10-20 giây.</p>
          </div>
        ) : ready.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant py-12 text-center text-sm text-on-surface-variant">
            Chưa có tài liệu sẵn sàng. Hãy tải tài liệu lên ở mục Library trước.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {ready.map((d) => (
              <button
                key={d.id}
                onClick={() => start(d)}
                className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface px-5 py-4 text-left transition-all hover:border-primary hover:shadow-sm"
              >
                <Icon
                  name={d.source_type === "notebook" ? "code" : "picture_as_pdf"}
                  size={26}
                  className="shrink-0 text-primary"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-on-surface">{d.filename}</p>
                  <p className="text-xs text-on-surface-variant">{d.chunk_count} đoạn</p>
                </div>
                <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                  Tạo quiz <Icon name="arrow_forward" size={16} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!quiz) return null;

  // ---------- Tổng kết ----------
  if (stage === "done") {
    const total = quiz.questions.length;
    const pct = Math.round((score / total) * 100);
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col items-center rounded-2xl border border-outline-variant bg-surface px-6 py-10 text-center">
          <span className={`flex h-16 w-16 items-center justify-center rounded-full ${pct >= 60 ? "bg-primary-container text-primary" : "bg-warning-container text-warning"}`}>
            <Icon name={pct >= 60 ? "emoji_events" : "sentiment_neutral"} size={32} fill />
          </span>
          <h2 className="font-serif mt-4 text-3xl font-bold text-on-surface">
            {score}/{total} câu đúng
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Tài liệu: {docName} · Kết quả đã được lưu vào Dashboard.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStage("pick")}
              className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
            >
              Chọn tài liệu khác
            </button>
            <button
              onClick={() => setShowCards((v) => !v)}
              className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-on-navy transition-colors hover:bg-navy-soft"
            >
              {showCards ? "Ẩn flashcard" : `Ôn ${quiz.flashcards.length} flashcard`}
            </button>
          </div>
        </div>

        {showCards && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {quiz.flashcards.map((f, i) => (
              <button
                key={i}
                onClick={() => setFlipped(flipped === i ? null : i)}
                className={`min-h-32 rounded-xl border p-5 text-left transition-colors ${
                  flipped === i
                    ? "border-primary bg-primary-container/30"
                    : "border-outline-variant bg-surface hover:border-primary"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">
                  {flipped === i ? "Mặt sau" : "Mặt trước · bấm để lật"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface">
                  {flipped === i ? f.back : f.front}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- Làm quiz ----------
  const q = quiz.questions[current];
  const total = quiz.questions.length;
  const isCorrect = answered && selected === q.correct_index;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="max-w-[60%] truncate text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            {docName}
          </span>
          <span className="text-sm font-semibold text-primary">
            Câu hỏi {current + 1} trên {total}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((current + (answered ? 1 : 0)) / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface p-8">
        <span className="inline-block rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant">
          Đa lựa chọn
        </span>
        <h2 className="font-serif mt-4 text-2xl font-bold leading-snug text-on-surface">{q.question}</h2>

        <div className="mt-6 flex flex-col gap-3">
          {q.options.map((opt, i) => {
            const isSel = selected === i;
            const showCorrect = answered && i === q.correct_index;
            const showWrong = answered && isSel && i !== q.correct_index;
            return (
              <button
                key={i}
                onClick={() => submitAnswer(i)}
                disabled={answered}
                className={`flex items-center gap-3 rounded-xl border px-5 py-4 text-left text-base transition-colors ${
                  showCorrect
                    ? "border-primary bg-primary-container/40"
                    : showWrong
                      ? "border-error bg-error/5"
                      : isSel
                        ? "border-primary bg-primary-container/40"
                        : "border-outline-variant hover:border-outline"
                } ${answered ? "cursor-default" : ""}`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    showCorrect ? "border-primary" : showWrong ? "border-error" : isSel ? "border-primary" : "border-outline"
                  }`}
                >
                  {showCorrect && <Icon name="check" size={13} className="text-primary" />}
                  {showWrong && <Icon name="close" size={13} className="text-error" />}
                </span>
                <span className="text-on-surface">{opt}</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div className={`mt-6 rounded-xl p-5 ${isCorrect ? "bg-primary-container/50" : "bg-error/5"}`}>
            <div className="flex items-start gap-3">
              <Icon
                name={isCorrect ? "check_circle" : "cancel"}
                size={22}
                fill
                className={`mt-0.5 ${isCorrect ? "text-primary" : "text-error"}`}
              />
              <div>
                <p className={`font-semibold ${isCorrect ? "text-on-primary-container" : "text-error"}`}>
                  {isCorrect ? "Chính xác!" : "Chưa đúng"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{q.explanation}</p>
                {q.source_hint && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-on-surface-variant">
                    <Icon name="menu_book" size={14} />
                    Nguồn: {q.source_hint}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-outline-variant pt-5">
          <button
            onClick={() => setStage("pick")}
            className="flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <Icon name="close" size={18} />
            Thoát
          </button>
          <button
            onClick={next}
            disabled={!answered}
            className="flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-on-navy transition-colors hover:bg-navy-soft disabled:opacity-40"
          >
            {current + 1 >= total ? "Xem kết quả" : "Câu tiếp theo"}
            <Icon name="arrow_forward" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
