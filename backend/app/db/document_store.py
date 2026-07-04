"""Registry tài liệu — lưu JSON nhẹ (data/documents.json). Phase 10 sẽ thay bằng PostgreSQL."""
import json
import os
import threading
from datetime import datetime, timezone
from typing import Optional
from app.config import settings

_PATH = os.path.join(settings.data_dir, "documents.json")
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

def add(document_id: str, filename: str, source_type: str) -> dict:
    record = {
        "id": document_id,
        "filename": filename,
        "source_type": source_type,
        "status": "processing",
        "chunk_count": 0,
        "error": None,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    with _lock:
        records = _load()
        records.append(record)
        _save(records)
    return record

def update(document_id: str, **fields) -> None:
    with _lock:
        records = _load()
        for r in records:
            if r["id"] == document_id:
                r.update(fields)
                break
        _save(records)

def list_all() -> list[dict]:
    with _lock:
        return _load()

def get(document_id: str) -> Optional[dict]:
    with _lock:
        for r in _load():
            if r["id"] == document_id:
                return r
    return None

def delete(document_id: str) -> None:
    with _lock:
        records = [r for r in _load() if r["id"] != document_id]
        _save(records)
