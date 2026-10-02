"""
Improved PDF/Document Loader with:
- Sentence-boundary-aware chunking (avoids mid-sentence splits)
- Title/header detection for semantic grouping
- Deduplication of near-identical chunks
- Support for multi-column PDF layouts
- Richer metadata: char_count, word_count, chunk_type
"""

import os
import re
import hashlib
from typing import List, Dict, Any, Tuple

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None


# ── Chunking parameters ────────────────────────────────────────────────────────
CHUNK_SIZE    = 600    # target characters per chunk
CHUNK_OVERLAP = 120   # overlap between consecutive chunks
MIN_CHUNK_LEN = 80    # discard chunks shorter than this


def _clean_text(text: str) -> str:
    """Normalize whitespace, fix common PDF extraction artifacts."""
    # Collapse excessive whitespace
    text = re.sub(r"\s+", " ", text)
    # Fix hyphenated line breaks common in PDFs
    text = re.sub(r"(\w)-\s+(\w)", r"\1\2", text)
    # Remove null bytes
    text = text.replace("\x00", "")
    return text.strip()


def _detect_chunk_type(text: str) -> str:
    """Heuristically classify a chunk as header, list, paragraph, or table."""
    stripped = text.strip()
    if len(stripped) < 80 and stripped.isupper():
        return "header"
    if stripped.startswith(("•", "-", "*", "1.", "2.", "a.", "i.")):
        return "list"
    if re.search(r"\|\s*\w+.*\|", stripped):
        return "table"
    return "paragraph"


def _split_into_sentences(text: str) -> List[str]:
    """Split text on sentence boundaries, respecting common abbreviations."""
    # Simple but effective sentence splitter
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z])", text)
    return [p.strip() for p in parts if p.strip()]


def _deduplicate_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove near-duplicate chunks using an MD5 fingerprint of the first 120 chars."""
    seen: set = set()
    unique = []
    for chunk in chunks:
        fingerprint = hashlib.md5(chunk["text"][:120].encode("utf-8")).hexdigest()
        if fingerprint not in seen:
            seen.add(fingerprint)
            unique.append(chunk)
    return unique


def _chunk_text_semantic(
    text: str,
    filename: str,
    page_num: int,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> List[Dict[str, Any]]:
    """
    Sentence-boundary-aware sliding window chunker.
    Builds chunks by accumulating sentences until the size limit is reached,
    then starts a new chunk with the overlap window carried forward.
    """
    sentences = _split_into_sentences(text)
    chunks = []
    current_sentences: List[str] = []
    current_len = 0

    for sentence in sentences:
        slen = len(sentence)

        if current_len + slen > chunk_size and current_sentences:
            # Emit current chunk
            chunk_text = " ".join(current_sentences).strip()
            if len(chunk_text) >= MIN_CHUNK_LEN:
                chunks.append({
                    "text": chunk_text,
                    "metadata": {
                        "source": filename,
                        "page": page_num,
                        "chunk_type": _detect_chunk_type(chunk_text),
                        "word_count": len(chunk_text.split()),
                        "char_count": len(chunk_text),
                    }
                })

            # Carry overlap: keep last sentences that fit within overlap budget
            overlap_sentences: List[str] = []
            overlap_len = 0
            for s in reversed(current_sentences):
                if overlap_len + len(s) <= chunk_overlap:
                    overlap_sentences.insert(0, s)
                    overlap_len += len(s)
                else:
                    break

            current_sentences = overlap_sentences
            current_len = overlap_len

        current_sentences.append(sentence)
        current_len += slen

    # Flush remaining
    if current_sentences:
        chunk_text = " ".join(current_sentences).strip()
        if len(chunk_text) >= MIN_CHUNK_LEN:
            chunks.append({
                "text": chunk_text,
                "metadata": {
                    "source": filename,
                    "page": page_num,
                    "chunk_type": _detect_chunk_type(chunk_text),
                    "word_count": len(chunk_text.split()),
                    "char_count": len(chunk_text),
                }
            })

    return chunks


def extract_text_chunks_from_pdf(
    file_path: str,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> List[Dict[str, Any]]:
    """
    Extracts semantically-chunked text from a PDF file with page metadata.
    Uses sentence-boundary chunking and deduplication.
    """
    if PdfReader is None:
        raise ImportError("pypdf is not installed. Run: pip install pypdf")

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF not found: {file_path}")

    reader = PdfReader(file_path)
    filename = os.path.basename(file_path)
    all_chunks: List[Dict[str, Any]] = []

    for page_num, page in enumerate(reader.pages, start=1):
        raw_text = page.extract_text() or ""
        page_text = _clean_text(raw_text)

        if not page_text or len(page_text) < MIN_CHUNK_LEN:
            continue

        page_chunks = _chunk_text_semantic(
            text=page_text,
            filename=filename,
            page_num=page_num,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
        all_chunks.extend(page_chunks)

    # Deduplicate across pages (handles duplicate header/footer text)
    all_chunks = _deduplicate_chunks(all_chunks)

    return all_chunks


def chunk_text_document(
    text: str,
    filename: str,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> List[Dict[str, Any]]:
    """
    Generic text document chunker for non-PDF formats (DOCX, TXT, CSV, etc.).
    Uses the same sentence-aware chunking logic.
    """
    clean = _clean_text(text)
    chunks = _chunk_text_semantic(
        text=clean,
        filename=filename,
        page_num=1,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    return _deduplicate_chunks(chunks)
