# Phase 11 — Voice Mode (làm sau cùng)

## 1. Lý thuyết

### 1.1 Luồng xử lý
```
[Frontend ghi âm] → gửi audio blob → [Backend STT] → text
      → [chạy qua RAG pipeline như câu hỏi text bình thường] → answer text
      → [Backend TTS] → audio → [Frontend play]
```

### 1.2 Lựa chọn công nghệ
| Bước | Lựa chọn | Ghi chú |
|---|---|---|
| Ghi âm frontend | `MediaRecorder` Web API | Chuẩn browser, không cần thư viện ngoài |
| STT | `faster-whisper` (local) hoặc Google Speech-to-Text (cloud) | faster-whisper free, chạy local, hỗ trợ tiếng Việt khá tốt với model `medium`/`large-v3` |
| TTS | FPT.AI TTS (giọng Việt tự nhiên) hoặc ElevenLabs | FPT.AI có giọng miền Bắc/Nam lựa chọn, giá rẻ hơn cho tiếng Việt |

### 1.3 Latency — điểm nghẽn cần lưu ý
STT + RAG pipeline + TTS cộng dồn có thể mất 5-10s. Nếu quá chậm để demo mượt, cân nhắc: dùng model Whisper nhỏ hơn (`small`) đánh đổi độ chính xác, hoặc stream TTS theo câu thay vì đợi cả câu trả lời xong.

---

## 2. Code

### 2.1 STT: `backend/app/voice/stt.py`
```python
from faster_whisper import WhisperModel

_model = WhisperModel("medium", device="cpu", compute_type="int8")
# Nếu có GPU: WhisperModel("medium", device="cuda", compute_type="float16")

def transcribe_audio(file_path: str) -> str:
    segments, _info = _model.transcribe(file_path, language="vi", beam_size=5)
    return " ".join(seg.text.strip() for seg in segments)
```

Thêm vào `requirements.txt`: `faster-whisper==1.0.3`.

### 2.2 TTS: `backend/app/voice/tts.py`
```python
import requests
from app.config import settings

FPT_TTS_URL = "https://api.fpt.ai/hmi/tts/v5"

def synthesize_speech(text: str, voice: str = "banmai") -> bytes:
    """Gọi FPT.AI TTS API, trả về bytes audio (mp3) sau khi tải file kết quả."""
    headers = {
        "api-key": settings.fpt_tts_api_key,
        "speed": "0",
        "voice": voice,
    }
    resp = requests.post(FPT_TTS_URL, data=text.encode("utf-8"), headers=headers)
    resp.raise_for_status()
    audio_url = resp.json()["async"]

    # FPT trả link async, cần chờ vài giây rồi tải file
    import time
    time.sleep(2)
    audio_resp = requests.get(audio_url)
    audio_resp.raise_for_status()
    return audio_resp.content
```

Thêm `fpt_tts_api_key: str` vào `Settings` trong `config.py`, và `FPT_TTS_API_KEY=...` vào `.env`.

### 2.3 Router: `backend/app/routers/voice.py`
```python
import os
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Document
from app.voice.stt import transcribe_audio
from app.voice.tts import synthesize_speech
from app.rag.generator import generate_answer
from app.config import settings

router = APIRouter(prefix="/voice", tags=["voice"])

@router.post("/{document_id}/ask")
async def voice_ask(document_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or doc.status != "ready":
        raise HTTPException(409, "Document chưa sẵn sàng")

    os.makedirs(settings.upload_dir, exist_ok=True)
    temp_audio_path = os.path.join(settings.upload_dir, f"voice_{document_id}.webm")
    with open(temp_audio_path, "wb") as f:
        f.write(await file.read())

    try:
        question_text = transcribe_audio(temp_audio_path)
        if not question_text.strip():
            raise HTTPException(400, "Không nhận diện được giọng nói, vui lòng thử lại")

        result = generate_answer(question_text, document_id)
        audio_bytes = synthesize_speech(result.answer)

        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"X-Question-Text": question_text, "X-Answer-Text": result.answer[:500]},
        )
    finally:
        os.remove(temp_audio_path)
```

Gắn vào `main.py`: `app.include_router(voice.router)`.

> Lưu ý: header HTTP không hỗ trợ tốt tiếng Việt có dấu (non-ASCII) — trong thực tế nên trả response dạng JSON với `answer_text` + `audio_base64` thay vì nhét text vào header, để tránh lỗi encoding.

### 2.4 Frontend — ghi âm bằng MediaRecorder: `frontend/src/components/VoiceInput.tsx`
```tsx
import { useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function VoiceInput({ documentId }: { documentId: string }) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = handleStop;
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleStop = async () => {
    setLoading(true);
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const form = new FormData();
    form.append("file", blob, "recording.webm");

    try {
      const res = await fetch(`${API_URL}/voice/${documentId}/ask`, { method: "POST", body: form });
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      new Audio(audioUrl).play();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={recording ? stopRecording : startRecording}
      disabled={loading}
      className={`rounded-full w-14 h-14 flex items-center justify-center ${
        recording ? "bg-red-600 animate-pulse" : "bg-emerald-600"
      }`}
    >
      {loading ? "..." : recording ? "■" : "🎤"}
    </button>
  );
}
```

---

## 3. Checklist hoàn thành Phase 11
- [ ] STT tiếng Việt nhận diện đúng câu hỏi đơn giản (test với vài câu ghi âm thật)
- [ ] TTS trả lời tự nhiên, nghe rõ, không bị cắt tiếng
- [ ] Luồng end-to-end: ghi âm → nhận câu trả lời bằng giọng nói hoạt động không lỗi
- [ ] Latency đo thử được (ghi log thời gian từng bước STT/RAG/TTS), nếu quá chậm cân nhắc tối ưu model nhỏ hơn
- [ ] Xử lý case không nhận diện được giọng nói (audio trống/nhiễu) → thông báo lỗi rõ ràng, không crash

→ Xong Phase 11, chuyển sang **Phase 12: Deployment**.
