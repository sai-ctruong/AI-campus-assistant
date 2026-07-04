import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Tiết lộ dần text theo "token" (từ hoặc [n]) để tạo cảm giác streaming.
 * Giữ nguyên [1][2] thành khối trọn vẹn (không cắt giữa chừng).
 * Tôn trọng prefers-reduced-motion: trả về text đầy đủ ngay.
 */
export function useTypewriter(text: string, enabled: boolean, msPerToken = 28) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(enabled && !reduce ? "" : text);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!enabled || reduce) {
      setShown(text);
      doneRef.current = true;
      return;
    }
    const tokens = text.split(/(\[\d+\]|\s+)/).filter(Boolean);
    let i = 0;
    setShown("");
    const timer = setInterval(() => {
      i += 1;
      setShown(tokens.slice(0, i).join(""));
      if (i >= tokens.length) {
        clearInterval(timer);
        doneRef.current = true;
      }
    }, msPerToken);
    return () => clearInterval(timer);
  }, [text, enabled, reduce, msPerToken]);

  return shown;
}
