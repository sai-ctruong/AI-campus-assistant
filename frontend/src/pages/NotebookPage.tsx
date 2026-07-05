import { useEffect, useState, type ReactNode } from "react";
import { api } from "../api";
import type { DocumentInfo, ExplainResponse } from "../types";
import { Icon } from "../components/Icon";

const KEYWORDS = new Set([
  "import", "from", "def", "return", "if", "else", "elif", "as", "print", "for", "in",
  "None", "True", "False", "class", "with", "try", "except", "lambda", "while", "not", "and", "or",
]);

function highlight(line: string): ReactNode {
  if (line.trimStart().startsWith("#")) return <span className="italic text-slate-500">{line}</span>;
  const parts = line.split(/(\s+|'[^']*'|"[^"]*"|\b\w+\b)/g).filter((p) => p !== "");
  return parts.map((p, i) => {
    if (/^['"].*['"]$/.test(p)) return <span key={i} className="text-amber-300">{p}</span>;
    if (KEYWORDS.has(p)) return <span key={i} className="text-indigo-300">{p}</span>;
    if (/^\d+$/.test(p)) return <span key={i} className="text-teal-300">{p}</span>;
    return <span key={i} className="text-slate-200">{p}</span>;
  });
}

export function NotebookPage() {
  const [notebooks, setNotebooks] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplainResponse | null>(null);

  useEffect(() => {
    api
      .listDocuments()
      .then((docs) => setNotebooks(docs.filter((d) => d.source_type === "notebook" && d.status === "ready")))
      .catch(() => setError("Không kết nối được backend."));
  }, []);

  async function explain(doc: DocumentInfo) {
    setLoading(true);
    setError(null);
    try {
      setResult(await api.explainNotebook(doc.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không giải thích được notebook");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Chưa chọn / đang xử lý ----------
  if (!result) {
    return (
      <div className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-6 px-8 py-7">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-bold text-on-surface">Giải thích notebook</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Chọn một file .ipynb đã tải lên — AI sẽ giải thích từng code cell theo ngữ cảnh toàn bài.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
            <Icon name="error" size={18} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center rounded-2xl border border-outline-variant bg-surface py-14">
            <Icon name="progress_activity" size={34} className="animate-spin text-primary" />
            <p className="mt-4 text-sm text-on-surface-variant">Đang phân tích notebook…</p>
          </div>
        ) : notebooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant py-12 text-center text-sm text-on-surface-variant">
            Chưa có notebook nào. Tải file .ipynb lên ở mục Library trước.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notebooks.map((d) => (
              <button
                key={d.id}
                onClick={() => explain(d)}
                className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface px-5 py-4 text-left transition-all hover:border-primary hover:shadow-sm"
              >
                <Icon name="code" size={26} className="shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-on-surface">{d.filename}</p>
                  <p className="text-xs text-on-surface-variant">{d.chunk_count} cell</p>
                </div>
                <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                  Giải thích <Icon name="arrow_forward" size={16} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- Kết quả: code trái + chú giải phải ----------
  const explMap = new Map(result.explanations.map((e) => [e.cell_index, e]));

  return (
    <div className="flex h-full">
      {/* Code viewer */}
      <div className="flex w-[55%] flex-col bg-navy">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2 text-on-navy">
            <Icon name="terminal" size={18} />
            <span className="max-w-xs truncate text-xs font-semibold uppercase tracking-wide">
              {result.filename}
            </span>
          </div>
          <button
            onClick={() => setResult(null)}
            className="flex items-center gap-1 text-xs text-on-navy/70 transition-colors hover:text-on-navy"
          >
            <Icon name="arrow_back" size={14} /> Chọn notebook khác
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 font-mono text-[13px] leading-6">
          {result.cells.map((cell) => (
            <div key={cell.cell_index} className="mb-6">
              <p className="mb-1 select-none text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                cell {cell.cell_index} · {cell.cell_type}
              </p>
              {cell.cell_type === "markdown" ? (
                <p className="whitespace-pre-wrap font-sans text-[13px] italic leading-relaxed text-slate-400">
                  {cell.source}
                </p>
              ) : (
                <pre className="flex flex-col rounded-lg bg-white/5 p-3">
                  {cell.source.split("\n").map((line, i) => (
                    <div key={i} className="flex">
                      <span className="mr-4 w-6 shrink-0 select-none text-right text-slate-600">{i + 1}</span>
                      <code className="whitespace-pre-wrap">{highlight(line)}</code>
                    </div>
                  ))}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Annotation */}
      <div className="flex-1 overflow-y-auto bg-surface p-8">
        <span className="inline-block rounded-full bg-primary-container px-3 py-1 text-xs font-semibold uppercase tracking-wide text-on-primary-container">
          Chú giải AI
        </span>
        <h1 className="font-serif mt-4 text-2xl font-bold leading-tight text-on-surface">
          {result.filename}
        </h1>
        <p className="mt-3 text-body-md leading-relaxed text-on-surface-variant">{result.summary}</p>

        <div className="mt-6 flex flex-col gap-6 border-t border-outline-variant pt-6">
          {result.explanations.map((step, i) => (
            <div key={step.cell_index} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                {i + 1}
              </span>
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-serif text-lg font-bold text-on-surface">{step.title}</h3>
                  <span className="text-[10px] font-semibold uppercase text-outline">
                    cell {step.cell_index}
                  </span>
                </div>
                <p className="mt-1 text-body-md leading-relaxed text-on-surface-variant">
                  {step.explanation}
                </p>
              </div>
            </div>
          ))}
          {result.explanations.length === 0 && (
            <p className="text-sm text-on-surface-variant">Notebook này không có code cell nào.</p>
          )}
        </div>

        {explMap.size > 0 && (
          <div className="mt-8 rounded-xl bg-primary-container/50 p-5">
            <div className="flex items-center gap-2 text-on-primary-container">
              <Icon name="lightbulb" size={18} fill className="text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide">Mẹo</span>
            </div>
            <p className="mt-2 text-body-md leading-relaxed text-on-surface-variant">
              Đối chiếu số "cell" ở cột trái với chú giải bên phải để theo dõi luồng dữ liệu qua từng bước.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
