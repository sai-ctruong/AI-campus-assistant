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
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-on-surface">
        {value}%
      </span>
    </div>
  );
}

const COURSES = [
  { cat: "Kinh tế học", catColor: "text-primary", title: "Vi mô: Cân bằng thị trường", desc: "Phân tích các yếu tố ảnh hưởng đến đường cung và cầu trong thị trường...", ring: 90, ringColor: "var(--primary)", status: "Đã hoàn thành", statusCls: "bg-primary-container text-on-primary-container", meta: "12 trang", updated: "2 giờ trước" },
  { cat: "Xác suất thống kê", catColor: "text-warning", title: "Phân phối chuẩn & Kỳ vọng", desc: "Nắm vững cách tính toán các giá trị trung bình và phương sai trong các...", ring: 45, ringColor: "var(--warning)", status: "Cần ôn tập", statusCls: "bg-warning-container text-on-warning-container", meta: "45 phút học", updated: "Hôm qua" },
  { cat: "Luật học", catColor: "text-navy dark:text-on-navy", title: "Dân sự: Quyền sở hữu", desc: "Tìm hiểu về các hình thức sở hữu tài sản và cơ chế bảo vệ quyền lợi hợp...", ring: 65, ringColor: "var(--navy)", status: "Đang tiến triển", statusCls: "bg-surface-container text-on-surface-variant", meta: "PDF", updated: "3 ngày trước" },
  { cat: "Khoa học máy tính", catColor: "text-on-surface-variant", title: "Cấu trúc dữ liệu: Cây", desc: "Phân tích cây nhị phân, cây AVL và các thuật toán duyệt cây phổ biến.", ring: 10, ringColor: "var(--outline)", status: "Mới tải lên", statusCls: "bg-surface-container text-on-surface-variant", meta: "8 trang", updated: "5 giờ trước" },
];

export function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7">
      {/* Top row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Chart */}
        <div className="rounded-2xl border border-outline-variant bg-surface p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-on-surface">Hiệu suất làm Quiz</h3>
            <div className="flex items-center gap-4 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-navy" /> Trung bình
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Gần đây
              </span>
            </div>
          </div>
          <svg viewBox="0 0 500 200" className="h-52 w-full">
            {[40, 90, 140, 190].map((y) => (
              <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="var(--outline-variant)" strokeWidth="1" />
            ))}
            <path d="M10,150 C70,90 110,80 160,110 S250,150 310,70 S420,60 490,120" fill="none" stroke="var(--navy)" strokeWidth="2.5" />
            <path d="M10,165 C70,150 120,120 170,130 S260,110 320,120 S430,140 490,95" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeDasharray="5 5" />
            <circle cx="310" cy="70" r="4" fill="var(--navy)" />
            <text x="300" y="55" fontSize="11" fill="var(--on-surface)" fontWeight="600">92%</text>
          </svg>
          <div className="mt-2 flex justify-between px-2 text-xs text-on-surface-variant">
            {["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Tuần 5"].map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
        </div>

        {/* Focus card */}
        <div className="rounded-2xl border border-warning/40 bg-surface p-6">
          <div className="flex items-center gap-2">
            <Icon name="priority_high" size={20} className="text-warning" />
            <h3 className="font-serif text-lg font-bold text-on-surface">Vùng kiến thức cần chú trọng</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            Bạn đang gặp khó khăn ở chương <strong className="text-on-surface">"Lý thuyết Trò chơi nâng cao"</strong>. Tỉ lệ trả lời đúng chỉ đạt 35%.
          </p>
          <div className="mt-4 rounded-lg bg-warning-container/60 p-3">
            <div className="mb-1.5 flex items-center justify-between text-xs text-on-warning-container">
              <span>Độ khó: Cao</span>
              <span>Mức độ ưu tiên</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
              <div className="h-full rounded-full bg-warning" style={{ width: "80%" }} />
            </div>
          </div>
          <button className="mt-4 w-full rounded-lg bg-navy py-2.5 text-sm font-semibold text-on-navy transition-colors hover:bg-navy-soft">
            Học ngay
          </button>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-2xl font-bold text-on-surface">Tiến độ học tập</h3>
          <div className="flex items-center gap-2">
            {["Lọc", "Sắp xếp"].map((b) => (
              <button key={b} className="flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container">
                <Icon name={b === "Lọc" ? "filter_list" : "swap_vert"} size={16} />
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {COURSES.map((c) => (
            <article key={c.title} className="flex flex-col rounded-2xl border border-outline-variant bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${c.catColor}`}>{c.cat}</p>
                  <h4 className="font-serif mt-1 text-lg font-bold leading-snug text-on-surface">{c.title}</h4>
                </div>
                <Ring value={c.ring} color={c.ringColor} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{c.desc}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${c.statusCls}`}>{c.status}</span>
                <span className="rounded bg-surface-container px-2 py-0.5 text-[11px] font-medium uppercase text-on-surface-variant">{c.meta}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-3">
                <span className="text-xs italic text-on-surface-variant">Cập nhật: {c.updated}</span>
                <Icon name="arrow_forward" size={18} className="text-on-surface-variant" />
              </div>
            </article>
          ))}

          <button className="flex min-h-[190px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary">
            <Icon name="add_circle" size={32} />
            <span className="max-w-[10rem] text-center text-sm">Thêm tài liệu mới để bắt đầu nghiên cứu</span>
          </button>
        </div>
      </div>

      {/* Bottom banners */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl bg-navy px-6 py-5 text-on-navy">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-soft text-primary">
            <Icon name="auto_awesome" size={22} fill />
          </span>
          <div>
            <h4 className="font-serif text-lg font-bold">Gợi ý từ AI</h4>
            <p className="mt-0.5 text-sm text-on-navy/70">
              Bạn nên dành 15 phút ôn lại phần "Hàm số bậc hai" trước khi bắt đầu bài kiểm tra tiếp theo.
            </p>
          </div>
        </div>
        <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-primary px-6 py-5 text-on-primary">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Icon name="emoji_events" size={22} fill />
          </span>
          <div>
            <h4 className="font-serif text-lg font-bold">Chuỗi học tập</h4>
            <p className="mt-0.5 text-sm text-on-primary/80">
              Đã duy trì học tập trong <strong>12 ngày</strong> liên tiếp. Cố lên!
            </p>
          </div>
          <span className="font-serif ml-auto text-5xl font-bold text-white/20">12</span>
        </div>
      </div>
    </div>
  );
}
