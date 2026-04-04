# backend/file_converter.py
# Stage 1: File Conversion — PDF → PNG via PyMuPDF
#
# Images (JPG/PNG) pass through without conversion.
# PDFs are rendered to PNG using PyMuPDF (fitz).
# DWG/DXF are currently unsupported.

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Optional

import fitz  # PyMuPDF

PASSTHROUGH_MIMES = {"image/png", "image/jpeg", "image/jpg"}

CONVERTIBLE_MIMES: dict[str, str] = {
    "application/pdf": "pdf",
    "image/vnd.dwg": "dwg",
    "application/acad": "dwg",
    "application/x-dwg": "dwg",
    "application/dxf": "dxf",
    "application/x-dxf": "dxf",
}

EXTENSION_MAP: dict[str, str] = {
    ".dwg": "dwg",
    ".dxf": "dxf",
    ".pdf": "pdf",
    ".png": "png",
    ".jpg": "jpg",
    ".jpeg": "jpg",
}


@dataclass
class ConversionResult:
    image_buffers: list[bytes] = field(default_factory=list)
    original_format: str = ""
    was_converted: bool = False
    error: Optional[str] = None


def _get_format_from_extension(file_name: str) -> Optional[str]:
    _, ext = os.path.splitext(file_name.lower())
    return EXTENSION_MAP.get(ext)


def convert_to_png(
    file_buffer: bytes, mime_type: str, file_name: str
) -> ConversionResult:
    """Convert file to PNG image(s). Images pass through; PDFs rendered via PyMuPDF."""

    # If already an image, pass through
    if mime_type in PASSTHROUGH_MIMES:
        return ConversionResult(
            image_buffers=[file_buffer],
            original_format=mime_type,
            was_converted=False,
        )

    # Check MIME type first, then fallback to extension
    source_format = CONVERTIBLE_MIMES.get(mime_type)
    if not source_format:
        source_format = _get_format_from_extension(file_name) or ""

    if not source_format or source_format in ("png", "jpg", "jpeg"):
        if source_format in ("png", "jpg", "jpeg"):
            return ConversionResult(
                image_buffers=[file_buffer],
                original_format=source_format or mime_type,
                was_converted=False,
            )
        return ConversionResult(
            original_format=mime_type,
            was_converted=False,
            error=f"Unsupported file type: {mime_type} ({file_name}). Accepted: PDF, JPG, PNG.",
        )

    # ── Local PDF Conversion via PyMuPDF ──
    if source_format == "pdf":
        try:
            doc = fitz.open(stream=file_buffer, filetype="pdf")
            image_buffers: list[bytes] = []
            num_pages = min(doc.page_count, 3)  # Max 3 pages

            for page_num in range(num_pages):
                page = doc.load_page(page_num)
                # Prevent OOM by scaling dynamically. Max dimension ~1536px.
                rect = page.rect
                zoom = min(1536.0 / max(rect.width, 1.0), 1536.0 / max(rect.height, 1.0), 2.0)
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat, alpha=False, colorspace=fitz.csRGB)
                png_bytes = pix.tobytes("png")
                image_buffers.append(png_bytes)

            doc.close()

            if image_buffers:
                return ConversionResult(
                    image_buffers=image_buffers,
                    original_format=source_format,
                    was_converted=True,
                )
            else:
                raise RuntimeError("Local PDF conversion produced no output.")

        except Exception as e:
            return ConversionResult(
                original_format=source_format,
                was_converted=False,
                error=f"Local PDF conversion failed: {e}",
            )

    # ── DWG/DXF — unsupported ──
    return ConversionResult(
        original_format=source_format,
        was_converted=False,
        error=f"CAD file format ({source_format.upper()}) is not supported in the current backend. Please convert to PDF or PNG first.",
    )
