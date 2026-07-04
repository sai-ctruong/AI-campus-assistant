import { useState } from "react";
import { Icon } from "../components/Icon";

const OPTIONS = [
  "Lớp Tích chập (Convolutional Layer)",
  "Lớp Pooling (Pooling Layer)",
  "Lớp Kết nối đầy đủ (Fully Connected Layer)",
  "Lớp Chuẩn hóa Batch (Batch Normalization)",
];
const CORRECT = 1;
const TAGS = ["#CNN", "#DeepLearning", "#Downsampling"];

export function QuizPage() {
  const [selected, setSelected] = useState<number | null>(1);
  const answered = selected !== null;
  const isCorrect = selected === CORRECT;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Progress */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Tiến trình học tập
          </span>
          <span className="text-sm font-semibold text-primary">Câu hỏi 3 trên 10</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
          <div className="h-full rounded-full bg-primary" style={{ width: "30%" }} />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-outline-variant bg-surface p-8">
        <span className="inline-block rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant">
          Đa lựa chọn
        </span>
        <h2 className="font-serif mt-4 text-2xl font-bold leading-snug text-on-surface">
          Trong kiến trúc Mạng nơ-ron tích chập (CNN), lớp nào chịu trách nhiệm chính cho việc giảm
          kích thước không gian của các bản đồ đặc trưng (feature maps)?
        </h2>

        <div className="mt-6 flex flex-col gap-3">
          {OPTIONS.map((opt, i) => {
            const on = selected === i;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setSelected(i)}
                className={`flex items-center gap-3 rounded-xl border px-5 py-4 text-left text-base transition-colors ${
                  on
                    ? "border-primary bg-primary-container/40 text-on-surface"
                    : "border-outline-variant text-on-surface hover:border-outline"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    on ? "border-primary" : "border-outline"
                  }`}
                >
                  {on && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {answered && isCorrect && (
          <div className="mt-6 rounded-xl bg-primary-container/50 p-5">
            <div className="flex items-start gap-3">
              <Icon name="check_circle" size={22} fill className="mt-0.5 text-primary" />
              <div>
                <p className="font-semibold text-on-primary-container">Chính xác!</p>
                <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                  Lớp Pooling (thường là Max Pooling hoặc Average Pooling) được dùng để giảm độ phân
                  giải không gian của các đặc trưng, giúp giảm số lượng tham số tính toán và tránh
                  hiện tượng overfitting trong mô hình.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TAGS.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-primary-container px-2 py-1 text-xs font-medium text-on-primary-container"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-outline-variant pt-5">
          <button className="flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-error">
            <Icon name="flag" size={18} />
            Báo lỗi câu hỏi
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-on-navy transition-colors hover:bg-navy-soft">
            Câu tiếp theo
            <Icon name="arrow_forward" size={18} />
          </button>
        </div>
      </div>

      {/* Hints */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface p-4">
          <Icon name="menu_book" size={20} className="mt-0.5 text-on-surface-variant" />
          <div>
            <p className="text-sm font-semibold text-on-surface">Tham chiếu từ tài liệu</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Trang 112, Mục 4.2: "Techniques for Spatial Dimensionality Reduction"
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface p-4">
          <Icon name="lightbulb" size={20} className="mt-0.5 text-warning" />
          <div>
            <p className="text-sm font-semibold text-on-surface">Gợi ý AI</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Hãy nhớ rằng Pooling không thay đổi số lượng kênh (depth) của tensor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
