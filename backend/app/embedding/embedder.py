import time
from typing import Optional
from google import genai
from google.genai.errors import ClientError
from app.config import settings

_client = genai.Client(api_key=settings.gemini_api_key)
_MODEL = "gemini-embedding-001"
_BATCH_SIZE = 20  # free tier tính quota theo số text/request, giữ nhỏ để tránh 429
_DELAY_BETWEEN_BATCHES = 12.0  # ~ dưới 100 text/phút (free tier RPM limit)
_MAX_RETRIES = 5

def _embed_with_retry(batch: list[str]):
    for attempt in range(_MAX_RETRIES):
        try:
            return _client.models.embed_content(model=_MODEL, contents=batch)
        except ClientError as e:
            if e.code != 429 or attempt == _MAX_RETRIES - 1:
                raise
            retry_delay = _extract_retry_delay(e) or 20
            time.sleep(retry_delay)

def _extract_retry_delay(e: ClientError) -> Optional[float]:
    details = (e.details or {}).get("error", {}).get("details", [])
    for d in details:
        if d.get("@type", "").endswith("RetryInfo"):
            delay_str = d.get("retryDelay", "")  # ví dụ "20s"
            if delay_str.endswith("s"):
                return float(delay_str[:-1])
    return None

def embed_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    embeddings: list[list[float]] = []
    for start in range(0, len(texts), _BATCH_SIZE):
        if start > 0:
            time.sleep(_DELAY_BETWEEN_BATCHES)
        batch = texts[start:start + _BATCH_SIZE]
        response = _embed_with_retry(batch)
        embeddings.extend(e.values for e in response.embeddings)
    return embeddings

def embed_query(text: str) -> list[float]:
    return embed_batch([text])[0]
