"""Lưu kết quả làm quiz (JSON) — phục vụ progress tracking Phase 10."""
import json
import os
import threading
from datetime import datetime, timezone
from app.config import settings

_PATH = os.path.join(settings.data_dir, "quiz_attempts.json")
_lock = threading.Lock()

def _load() -> list[dict]:
    if not os.path.exists(_PATH):
        return []
    with open(_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def _save(records: list[dict]) -> None:
    os.makedirs(os.path.dirname(_PATH), exist_ok=True)
    tmp = _PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    os.replace(tmp, _PATH)

def add_attempt(document_id: str, question: str, is_correct: bool) -> dict:
    record = {
        "document_id": document_id,
        "question": question,
        "is_correct": is_correct,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    with _lock:
        records = _load()
        records.append(record)
        _save(records)
    return record

def list_attempts() -> list[dict]:
    with _lock:
        return _load()

def delete_for_document(document_id: str) -> None:
    with _lock:
        records = [r for r in _load() if r["document_id"] != document_id]
        _save(records)
