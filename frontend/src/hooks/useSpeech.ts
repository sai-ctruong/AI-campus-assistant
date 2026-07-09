import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech API chưa có typing sẵn trong TS DOM lib.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

const SR: any =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

function errorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Trình duyệt chưa được cấp quyền micro. Bấm biểu tượng ổ khóa trên thanh địa chỉ để cho phép.";
    case "no-speech":
      return "Không nghe thấy giọng nói. Thử lại và nói rõ hơn.";
    case "audio-capture":
      return "Không tìm thấy micro.";
    case "network":
      return "Trình duyệt này không dùng được nhận dạng giọng nói. Hãy mở bằng Google Chrome chính hãng (Edge/Brave/Cốc Cốc thường bị chặn).";
    default:
      return "";
  }
}

// Voice mode tiếng Việt qua Web Speech API (Chrome/Edge, cần https/localhost + mic).
export function useSpeech() {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);

  const sttSupported = !!SR;
  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (!SR || recRef.current) return; // đang nghe rồi thì bỏ qua
    setError(null);
    const rec = new SR();
    rec.lang = "vi-VN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    // Chỉ xử lý sự kiện nếu đúng instance hiện tại (tránh race với instance cũ).
    const isCurrent = () => recRef.current === rec;

    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript ?? "";
      if (text) onResult(text);
    };
    rec.onerror = (e: any) => {
      if (!isCurrent()) return;
      if (e.error !== "aborted") setError(errorMessage(e.error) || `Lỗi: ${e.error}`);
    };
    rec.onend = () => {
      if (!isCurrent()) return;
      recRef.current = null;
      setListening(false);
    };

    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    recRef.current?.stop?.();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "vi-VN";
      u.rate = 1;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [ttsSupported],
  );

  const stopSpeaking = useCallback(() => {
    if (ttsSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [ttsSupported]);

  useEffect(
    () => () => {
      recRef.current?.abort?.();
      if (ttsSupported) window.speechSynthesis.cancel();
    },
    [ttsSupported],
  );

  return {
    listening,
    speaking,
    error,
    clearError: () => setError(null),
    sttSupported,
    ttsSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}

/** Bỏ marker trích dẫn [1], [1, 2] khỏi text trước khi đọc. */
export function stripCitations(text: string): string {
  return text.replace(/\[[\d,\s]+\]/g, "").replace(/\s{2,}/g, " ").trim();
}
