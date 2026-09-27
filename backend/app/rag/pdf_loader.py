import os
from typing import List, Dict, Any
from pypdf import PdfReader

def extract_text_chunks_from_pdf(
    file_path: str,
    chunk_size: int = 500,
    chunk_overlap: int = 100
) -> List[Dict[str, Any]]:
    """
    Extracts text from a PDF file and splits into overlapping semantic chunks with page metadata.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    reader = PdfReader(file_path)
    filename = os.path.basename(file_path)
    chunks: List[Dict[str, Any]] = []

    for page_num, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""
        cleaned_text = " ".join(page_text.split())
        
        if not cleaned_text:
            continue

        # Semantic recursive sliding window chunking
        start = 0
        text_len = len(cleaned_text)
        
        while start < text_len:
            end = min(start + chunk_size, text_len)
            
            # Snap to closest period or whitespace if possible
            if end < text_len:
                period_pos = cleaned_text.rfind(". ", start, end)
                if period_pos != -1 and period_pos > start + (chunk_size // 2):
                    end = period_pos + 1
                else:
                    space_pos = cleaned_text.rfind(" ", start, end)
                    if space_pos != -1 and space_pos > start + (chunk_size // 2):
                        end = space_pos

            chunk_text = cleaned_text[start:end].strip()
            if chunk_text:
                chunks.append({
                    "text": chunk_text,
                    "metadata": {
                        "source": filename,
                        "page": page_num,
                        "char_start": start,
                        "char_end": end
                    }
                })

            start = end - chunk_overlap if end < text_len else text_len

    return chunks
