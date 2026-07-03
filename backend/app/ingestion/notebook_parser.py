from dataclasses import dataclass
import nbformat

@dataclass
class NotebookCell:
    cell_index: int
    cell_type: str  # "code" | "markdown"
    source: str

def parse_notebook(file_path: str) -> list[NotebookCell]:
    nb = nbformat.read(file_path, as_version=4)
    cells: list[NotebookCell] = []
    for i, cell in enumerate(nb.cells):
        source = cell.get("source", "").strip()
        if not source:
            continue
        cells.append(NotebookCell(
            cell_index=i,
            cell_type=cell.get("cell_type", "code"),
            source=source,
        ))
    return cells