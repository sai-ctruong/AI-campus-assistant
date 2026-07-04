import { useRef, useState } from "react";
import { UploadSimple, CircleNotch, Check } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";

interface Props {
  onUpload: (file: File) => Promise<void>;
}

export function UploadZone({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(pdf|ipynb)$/i.test(file.name)) {
      setError("Chỉ nhận file .pdf hoặc .ipynb");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onUpload(file);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload thất bại");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const state = busy ? "busy" : done ? "done" : "idle";

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        disabled={busy}
        className={`w-full rounded-lg border border-dashed px-4 py-5 text-center transition-colors ${
          dragging || done ? "border-accent bg-accent-soft" : "border-line hover:border-accent/60"
        } ${busy ? "cursor-wait" : "cursor-pointer"}`}
      >
        <div className="flex items-center justify-center gap-2.5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={state}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {busy ? (
                <CircleNotch size={18} className="animate-spin text-accent" weight="bold" />
              ) : done ? (
                <Check size={18} className="text-accent" weight="bold" />
              ) : (
                <UploadSimple size={18} className={dragging ? "text-accent" : "text-faint"} weight="bold" />
              )}
            </motion.span>
          </AnimatePresence>
          <span className="text-sm font-medium text-ink">
            {busy ? "Đang tải lên…" : done ? "Đã tải lên" : "Tải tài liệu lên"}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-faint">Kéo thả · PDF hoặc notebook</p>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.ipynb"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 text-xs text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
