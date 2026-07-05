"""API giải thích notebook (Phase 9)."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import document_store
from app.rag.notebook_explainer import (
    explain_notebook,
    get_notebook_cells,
    CellExplanation,
    NotebookCellOut,
)

router = APIRouter(prefix="/explain", tags=["explain"])

class ExplainResponse(BaseModel):
    document_id: str
    filename: str
    summary: str
    cells: list[NotebookCellOut]        # code + markdown gốc, theo thứ tự
    explanations: list[CellExplanation]  # giải thích cho các code cell

@router.post("/{document_id}", response_model=ExplainResponse)
def explain(document_id: str):
    doc = document_store.get(document_id)
    if doc is None:
        raise HTTPException(404, "Không tìm thấy tài liệu")
    if doc["source_type"] != "notebook":
        raise HTTPException(400, "Chỉ hỗ trợ giải thích file notebook (.ipynb)")
    if doc["status"] != "ready":
        raise HTTPException(409, f"Tài liệu chưa sẵn sàng (status={doc['status']})")

    try:
        result = explain_notebook(document_id)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"Lỗi khi giải thích notebook: {e}")
    if result is None:
        raise HTTPException(422, "Notebook không có cell nào để giải thích")

    return ExplainResponse(
        document_id=document_id,
        filename=doc["filename"],
        summary=result.summary,
        cells=get_notebook_cells(document_id),
        explanations=result.cells,
    )
