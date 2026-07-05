import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { DocumentInfo } from "../types";
import { Icon } from "../components/Icon";

interface Props {
  onOpenDoc: (id: string, name: string) => void;
}

function statusBadge(doc: DocumentInfo) {
  if (doc.status === "processing")
    return <span className="flex items-center gap-1 text-xs text-primary"><Icon name="progress_activity" size={13} className="animate-spin" />Đang xử lý</span>;
  if (doc.status === "failed")
    return (
      <span className="flex items-center gap-1 text-xs text-error" title={doc.error ?? "Lỗi xử lý"}>
        <Icon name="error" size={13} />
        {doc.error ? "Không đọc được" : "Lỗi"}
      </span>
    );
  return <span className="text-xs text-on-surface-variant">{doc.chunk_count} đoạn</span>;
}

export function LibraryPage({ onOpenDoc }: Props) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDocuments(await api.listDocuments());
      setError(null);
    } catch {
      setError("Không kết nối được backend (localhost:8000).");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const processing = documents.some((d) => d.status === "processing");
    if (processing && pollRef.current == null) pollRef.current = window.setInterval(refresh, 2500);
    else if (!processing && pollRef.current != null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current != null) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [documents, refresh]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(pdf|ipynb|docx)$/i.test(file.name)) {
      setError("Chỉ nhận file .pdf, .docx hoặc .ipynb");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await api.uploadDocument(file);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload thất bại");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging ? "border-primary bg-primary-container/20" : "border-outline-variant bg-surface"
        }`}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-container">
          <Icon name={uploading ? "progress_activity" : "cloud_upload"} size={36} className={`text-primary ${uploading ? "animate-spin" : ""}`} />
        </div>
        <h3 className="font-serif mt-5 text-2xl font-bold text-on-surface">
          {uploading ? "Đang tải lên…" : "Tải lên tài liệu nghiên cứu"}
        </h3>
        <p className="mt-2 text-base text-on-surface-variant">
          Kéo thả tài liệu vào đây hoặc{" "}
          <button onClick={() => inputRef.current?.click()} className="font-semibold text-primary underline underline-offset-2">
            chọn file
          </button>
        </p>
        <p className="mt-1 text-sm text-outline">Hỗ trợ PDF, Word (.docx), Jupyter (.ipynb) — tối đa 50MB</p>
        <input ref={inputRef} type="file" accept=".pdf,.docx,.ipynb" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
      </div>

      {/* Recent docs */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-2xl font-bold text-on-surface">Tài liệu của tôi</h3>
          {documents.length > 0 && <span className="text-sm text-on-surface-variant">{documents.length} tài liệu</span>}
        </div>

        {documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant py-12 text-center text-sm text-on-surface-variant">
            Chưa có tài liệu. Tải lên để bắt đầu hỏi đáp.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => {
              const ready = doc.status === "ready";
              return (
                <article key={doc.id} className="overflow-hidden rounded-xl border border-outline-variant bg-surface transition-shadow hover:shadow-[0_6px_20px_rgba(24,35,56,0.08)]">
                  <button
                    disabled={!ready}
                    onClick={() => onOpenDoc(doc.id, doc.filename)}
                    className="flex h-28 w-full items-center justify-center bg-surface-container disabled:cursor-not-allowed"
                  >
                    <Icon name={doc.source_type === "notebook" ? "code" : doc.source_type === "docx" ? "article" : "picture_as_pdf"} size={40} className="text-primary" />
                  </button>
                  <div className="p-4">
                    <h4 className="truncate font-semibold text-on-surface">{doc.filename}</h4>
                    <div className="mt-2 flex items-center justify-between">
                      {statusBadge(doc)}
                      <div className="flex items-center gap-1 text-on-surface-variant">
                        {ready && (
                          <button onClick={() => onOpenDoc(doc.id, doc.filename)} className="rounded p-1 transition-colors hover:text-primary" title="Mở chat">
                            <Icon name="chat_bubble" size={17} />
                          </button>
                        )}
                        <button
                          onClick={async () => { await api.deleteDocument(doc.id); refresh(); }}
                          className="rounded p-1 transition-colors hover:text-error"
                          title="Xóa"
                        >
                          <Icon name="delete" size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Promo banner */}
      <div className="flex items-center gap-5 rounded-2xl bg-navy px-6 py-5 text-on-navy">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-soft text-primary">
          <Icon name="find_in_page" size={24} />
        </span>
        <div className="flex-1">
          <h4 className="font-semibold">Phân tích tài liệu bằng AI</h4>
          <p className="mt-0.5 text-sm text-on-navy/70">
            Tải tài liệu lên, chờ xử lý xong, rồi mở chat để đặt câu hỏi kèm trích dẫn nguồn.
          </p>
        </div>
      </div>
    </div>
  );
}
