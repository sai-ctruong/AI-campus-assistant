import { useEffect, useState } from "react";
import { api } from "../api";
import type { ProgressResponse } from "../types";
import { Icon } from "../components/Icon";

/** Vòng tiến độ tròn (SVG). */
function Ring({ value, color }: { value: number; color: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--outline-variant)" strokeWidth="4" />
        <circle
          cx="22" cy="22" r={r} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-on-surface">
        {value}%
      </span>
    </div>
  );
}

function ringColor(accuracy: number): string {
  if (accuracy >= 0.7) return "var(--primary)";
  if (accuracy >= 0.5) return "var(--warning)";
  return "var(--error)";
}

function statusOf(accuracy: number): { label: string; cls: string } {
  if (accuracy >= 0.7) return { label: "Nắm vững", cls: "bg-primary-container text-on-primary-container" };
  if (accuracy >= 0.5) return { label: "Cần ôn tập", cls: "bg-warning-container text-on-warning-container" };
  return { label: "Cần chú trọng", cls: "bg-error/10 text-error" };
}

export function DashboardPage() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProgress().then(setProgress).catch(() => setError("Không kết nối được backend."));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          <Icon name="error" size={18} /> {error}
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="mx-auto flex max-w-5xl justify-center py-20">
        <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  const hasData = progress.total_attempts > 0;
  const weakest = hasData ? progress.documents[0] : null; // đã sort accuracy tăng dần
  const overallPct = Math.round(progress.overall_accuracy * 100);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7">
      {/* Top row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Tổng quan */}
        <div className="rounded-2xl border border-outline-variant bg-surface p-6 lg:col-span-2">
          <h3 className="font-serif text-xl font-bold text-on-surface">Hiệu suất làm Quiz</h3>
          {!hasData ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Icon name="quiz" size={36} className="text-outline" />
              <p className="mt-3 text-sm text-on-surface-variant">
                Chưa có dữ liệu. Làm một bài quiz ở mục Quiz để bắt đầu theo dõi tiến độ.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-surface-container-low p-4 text-center">
                <p className="font-serif text-3xl font-bold text-on-surface">{progress.total_attempts}</p>
                <p className="mt-1 text-xs text-on-surface-variant">Câu đã làm</p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4 text-center">
                <p className="font-serif text-3xl font-bold text-primary">{progress.total_correct}</p>
                <p className="mt-1 text-xs text-on-surface-variant">Câu đúng</p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4 text-center">
                <p className={`font-serif text-3xl font-bold ${overallPct >= 60 ? "text-primary" : "text-warning"}`}>
                  {overallPct}%
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">Độ chính xác</p>
              </div>
            </div>
          )}
        </div>

        {/* Vùng cần chú trọng */}
        <div className="rounded-2xl border border-warning/40 bg-surface p-6">
          <div className="flex items-center gap-2">
            <Icon name="priority_high" size={20} className="text-warning" />
            <h3 className="font-serif text-lg font-bold text-on-surface">Vùng kiến thức cần chú trọng</h3>
          </div>
          {weakest ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                Bạn đang yếu nhất ở <strong className="text-on-surface">"{weakest.filename}"</strong>. Tỉ lệ
                trả lời đúng đạt {Math.round(weakest.accuracy * 100)}% ({weakest.correct}/{weakest.attempts} câu).
              </p>
              <div className="mt-4 rounded-lg bg-warning-container/60 p-3">
                <div className="mb-1.5 flex items-center justify-between text-xs text-on-warning-container">
                  <span>Độ chính xác</span>
                  <span>{Math.round(weakest.accuracy * 100)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                  <div className="h-full rounded-full bg-warning" style={{ width: `${weakest.accuracy * 100}%` }} />
                </div>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-on-surface-variant">
              Chưa đủ dữ liệu — làm quiz để hệ thống tìm điểm yếu giúp bạn.
            </p>
          )}
        </div>
      </div>

      {/* Per-document */}
      <div>
        <h3 className="font-serif mb-4 text-2xl font-bold text-on-surface">Tiến độ theo tài liệu</h3>
        {!hasData ? (
          <div className="rounded-2xl border border-dashed border-outline-variant py-12 text-center text-sm text-on-surface-variant">
            Kết quả quiz theo từng tài liệu sẽ hiện ở đây.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {progress.documents.map((d) => {
              const pct = Math.round(d.accuracy * 100);
              const st = statusOf(d.accuracy);
              return (
                <article key={d.document_id} className="flex flex-col rounded-2xl border border-outline-variant bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-serif min-w-0 flex-1 truncate text-lg font-bold text-on-surface" title={d.filename}>
                      {d.filename}
                    </h4>
                    <Ring value={pct} color={ringColor(d.accuracy)} />
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {d.correct}/{d.attempts} câu đúng
                  </p>
                  <div className="mt-3">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
