import { Icon } from "../components/Icon";

const DOCS = [
  { title: "Introduction to Neural Networks", date: "12 thg 10, 2023", badge: "picture_as_pdf", seed: "neural-net-paper" },
  { title: "Lecture_Notes_Week_3.pdf", date: "08 thg 10, 2023", badge: "code", seed: "lecture-code" },
  { title: "Transformer_Architecture_De...", date: "05 thg 10, 2023", badge: "description", seed: "transformer-diagram" },
];

export function LibraryPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {/* Upload dropzone */}
      <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-outline-variant bg-surface px-6 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-container">
          <Icon name="cloud_upload" size={36} className="text-primary" />
        </div>
        <h3 className="font-serif mt-5 text-2xl font-bold text-on-surface">
          Tải lên tài liệu nghiên cứu
        </h3>
        <p className="mt-2 text-base text-on-surface-variant">
          Kéo thả tài liệu vào đây hoặc{" "}
          <button className="font-semibold text-primary underline underline-offset-2">
            chọn file
          </button>
        </p>
        <p className="mt-1 text-sm text-outline">Hỗ trợ PDF, .ipynb, .docx (Tối đa 50MB)</p>
        <div className="mt-6 flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container">
            <Icon name="link" size={18} className="text-on-surface-variant" />
            Dán URL
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container">
            <Icon name="add_to_drive" size={18} className="text-on-surface-variant" />
            Google Drive
          </button>
        </div>
      </div>

      {/* Recent docs */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-2xl font-bold text-on-surface">Tài liệu gần đây</h3>
          <button className="text-sm font-semibold text-primary hover:underline">Xem tất cả</button>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DOCS.map((doc) => (
            <article
              key={doc.title}
              className="group overflow-hidden rounded-xl border border-outline-variant bg-surface transition-shadow hover:shadow-[0_6px_20px_rgba(24,35,56,0.08)]"
            >
              <div className="relative h-40 overflow-hidden bg-surface-container">
                <img
                  src={`https://picsum.photos/seed/${doc.seed}/480/320`}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-primary shadow-sm">
                  <Icon name={doc.badge} size={18} />
                </span>
              </div>
              <div className="p-4">
                <h4 className="truncate font-semibold text-on-surface">{doc.title}</h4>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">{doc.date}</span>
                  <div className="flex items-center gap-1 text-on-surface-variant">
                    <button className="rounded p-1 transition-colors hover:text-warning">
                      <Icon name="star" size={18} />
                    </button>
                    <button className="rounded p-1 transition-colors hover:text-on-surface">
                      <Icon name="more_vert" size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Promo banner */}
      <div className="flex items-center gap-5 rounded-2xl bg-navy px-6 py-5 text-on-navy">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-soft text-primary">
          <Icon name="auto_awesome" size={24} fill />
        </span>
        <div className="flex-1">
          <h4 className="font-semibold">Mới: Phân tích tài liệu bằng AI</h4>
          <p className="mt-0.5 text-sm text-on-navy/70">
            Giờ đây bạn có thể đặt câu hỏi trực tiếp cho bộ tài liệu của mình. Tải tài liệu lên và bắt
            đầu trò chuyện ngay!
          </p>
        </div>
        <button className="shrink-0 rounded-lg bg-navy-soft px-4 py-2.5 text-sm font-semibold text-on-navy transition-opacity hover:opacity-90">
          Tìm hiểu thêm
        </button>
      </div>
    </div>
  );
}
