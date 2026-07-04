import type { ReactNode } from "react";
import { Icon } from "../components/Icon";

const KEYWORDS = new Set([
  "import", "from", "def", "return", "if", "else", "as", "print", "for", "in", "None", "True", "False",
]);

const CODE = `# Khởi tạo mô hình phân tích dữ liệu nghiên cứu
import pandas as pd
from sklearn.preprocessing import StandardScaler

def process_academic_data(filepath):
    df = pd.read_csv(filepath)
    # Xử lý các giá trị còn thiếu
    df = df.fillna(df.mean())

    scaler = StandardScaler()
    features = ['citations', 'impact_factor', 'h_index']

    # Chuẩn hóa các biến đặc trưng
    df[features] = scaler.fit_transform(df[features])
    return df

if __name__ == "__main__":
    results = process_academic_data("research_data_2024.csv")
    print("Xử lý hoàn tất.")`;

function highlight(line: string): ReactNode {
  if (line.trimStart().startsWith("#")) {
    return <span className="italic text-slate-500">{line}</span>;
  }
  // tách chuỗi, từ, ký hiệu để tô màu tối giản
  const parts = line.split(/(\s+|'[^']*'|"[^"]*"|\b\w+\b)/g).filter((p) => p !== "");
  return parts.map((p, i) => {
    if (/^['"].*['"]$/.test(p)) return <span key={i} className="text-amber-300">{p}</span>;
    if (KEYWORDS.has(p)) return <span key={i} className="text-indigo-300">{p}</span>;
    if (/^\d+$/.test(p)) return <span key={i} className="text-teal-300">{p}</span>;
    return <span key={i} className="text-slate-200">{p}</span>;
  });
}

const STEPS = [
  {
    title: "Nhập thư viện và đọc dữ liệu",
    body: (
      <>
        Sử dụng thư viện <code>pandas</code> để thao tác với bảng dữ liệu. Tệp CSV được tải vào một
        DataFrame, đây là cấu trúc dữ liệu cơ bản cho các phân tích sau này.
      </>
    ),
  },
  {
    title: "Xử lý giá trị trống",
    body: (
      <>
        Các dòng dữ liệu bị thiếu sẽ được tự động điền bằng giá trị trung bình (<code>mean</code>) của
        cột đó. Điều này đảm bảo tính toàn vẹn của mô hình toán học mà không làm mất quá nhiều thông
        tin nghiên cứu.
      </>
    ),
  },
  {
    title: "Chuẩn hóa đặc trưng (Standardization)",
    body: (
      <>
        Các chỉ số như số lượt trích dẫn và chỉ số H có thang đo khác nhau. <code>StandardScaler</code>{" "}
        giúp đưa chúng về cùng một phân phối chuẩn (trung bình = 0, độ lệch chuẩn = 1), giúp việc so
        sánh giữa các nghiên cứu trở nên công bằng hơn.
      </>
    ),
  },
];

export function NotebookPage() {
  return (
    <div className="flex h-full">
      {/* Code viewer */}
      <div className="flex w-[55%] flex-col bg-navy">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2 text-on-navy">
            <Icon name="terminal" size={18} />
            <span className="text-xs font-semibold uppercase tracking-wide">analysis_model.py</span>
          </div>
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400/80" />
            <span className="h-3 w-3 rounded-full bg-amber-400/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 font-mono text-[13px] leading-6">
          <pre className="flex flex-col">
            {CODE.split("\n").map((line, i) => (
              <div key={i} className="flex">
                <span className="mr-5 w-6 shrink-0 select-none text-right text-slate-600">{i + 1}</span>
                <code className="whitespace-pre">{highlight(line) as ReactNode}</code>
              </div>
            ))}
          </pre>
        </div>

        <div className="flex items-center gap-4 border-t border-white/10 px-5 py-3 text-xs text-on-navy/80">
          <button className="flex items-center gap-1.5 transition-colors hover:text-on-navy">
            <Icon name="content_copy" size={16} /> Sao chép mã
          </button>
          <button className="flex items-center gap-1.5 transition-colors hover:text-on-navy">
            <Icon name="download" size={16} /> Tải xuống Jupyter
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-on-navy/60 lg:inline">Hỏi thêm về đoạn mã này?</span>
            <div className="flex items-center rounded-lg bg-white/10 px-3 py-1.5">
              <input
                placeholder="Nhập câu hỏi của bạn..."
                className="w-40 bg-transparent text-xs text-on-navy outline-none placeholder:text-on-navy/50"
              />
              <button className="text-primary">
                <Icon name="send" size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Annotation */}
      <div className="flex-1 overflow-y-auto bg-surface p-8">
        <span className="inline-block rounded-full bg-primary-container px-3 py-1 text-xs font-semibold uppercase tracking-wide text-on-primary-container">
          Chú giải AI
        </span>
        <h1 className="font-serif mt-4 text-3xl font-bold leading-tight text-on-surface">
          Giải thích quy trình xử lý dữ liệu học thuật
        </h1>
        <p className="mt-3 text-body-md leading-relaxed text-on-surface-variant">
          Đoạn mã này thực hiện việc làm sạch và chuẩn hóa dữ liệu từ các tệp nghiên cứu khoa học.
        </p>

        <div className="mt-6 flex flex-col gap-6 border-t border-outline-variant pt-6">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                {i + 1}
              </span>
              <div>
                <h3 className="font-serif text-lg font-bold text-on-surface">{step.title}</h3>
                <p className="mt-1 text-body-md leading-relaxed text-on-surface-variant [&_code]:rounded [&_code]:bg-surface-container [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-on-surface">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-primary-container/50 p-5">
          <div className="flex items-center gap-2 text-on-primary-container">
            <Icon name="lightbulb" size={18} fill className="text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide">Gợi ý từ AI Campus</span>
          </div>
          <p className="mt-2 text-body-md italic leading-relaxed text-on-surface-variant">
            "Việc chuẩn hóa dữ liệu là bước quan trọng nhất trước khi đưa vào bất kỳ mô hình học máy
            nào trong khoa học dữ liệu."
          </p>
        </div>
      </div>
    </div>
  );
}
