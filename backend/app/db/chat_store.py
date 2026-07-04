"""Lịch sử chat — lưu JSON nhẹ (data/chat_history.json). Phase 10 sẽ thay bằng PostgreSQL."""
import json
import os
import threading
from datetime import datetime, timezone
from app.config import settings

_PATH = os.path.join(settings.data_dir, "chat_history.json")
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

def append(document_id: str, question: str, answer: str, citations: list[dict], found_answer: bool) -> dict:
    turn = {
        "document_id": document_id,
        "question": question,
        "answer": answer,
        "citations": citations,
        "found_answer": found_answer,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    with _lock:
        records = _load()
        records.append(turn)
        _save(records)
    return turn

def get_history(document_id: str) -> list[dict]:
    with _lock:
        return [r for r in _load() if r["document_id"] == document_id]

def delete_for_document(document_id: str) -> None:
    with _lock:
        records = [r for r in _load() if r["document_id"] != document_id]
        _save(records)
