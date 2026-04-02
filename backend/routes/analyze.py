# backend/routes/analyze.py
# POST /api/analyze — Full AI analysis pipeline
#
# Pipeline: file upload → convert (if DWG/PDF) → AI vision → confidence → rule engine → response

import base64
import math
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from file_converter import convert_to_png
from image_resizer import resize_for_ai
from ai import get_ai_provider
from confidence_scorer import score_confidence
from rule_engine import run_rule_engine
from rate_limiter import check_rate_limit
from models import AnalyzeResponse, AnalyzeMeta

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/api/analyze")
async def analyze(file: list[UploadFile] = File(...)):
    """Full AI analysis pipeline — accepts multipart file upload."""
    try:
        if not file or len(file) == 0:
            return JSONResponse(
                content={"error": 'No files provided. Send file(s) with the key "file".'},
                status_code=400,
            )

        total_size = 0
        file_contents: list[tuple[UploadFile, bytes]] = []

        for f in file:
            content = await f.read()
            size = len(content)
            total_size += size

            if size > MAX_FILE_SIZE:
                return JSONResponse(
                    content={
                        "error": f"File {f.filename} too large ({size / 1024 / 1024:.1f}MB). Maximum per file is 10MB.",
                    },
                    status_code=400,
                )
            file_contents.append((f, content))

        # ─── Rate limit check ───
        rate_check = check_rate_limit()
        if not rate_check["allowed"]:
            retry_sec = math.ceil((rate_check.get("retry_after_ms", 30000)) / 1000)
            return JSONResponse(
                content={
                    "error": f"Too many requests. Please wait {retry_sec} seconds and try again.",
                    "step": "rate_limit",
                    "retryAfterSeconds": retry_sec,
                },
                status_code=429,
            )

        # ─── Stage 1 & 1.5: Convert to PNG (if needed) & Resize ───
        all_base64_docs: list[dict] = []
        was_converted = False
        original_format = "mixed"

        for f, content in file_contents:
            mime_type = f.content_type or ""

            # Gemini natively supports PDFs, bypass conversion
            if mime_type == "application/pdf":
                all_base64_docs.append({
                    "data": base64.b64encode(content).decode("utf-8"),
                    "mime_type": "application/pdf",
                })
                original_format = "pdf"
                continue

            conversion = convert_to_png(content, mime_type, f.filename or "unknown")

            if conversion.error:
                print(f"[API Analyze] File conversion failed: {conversion.error}")
                return JSONResponse(
                    content={"error": conversion.error, "step": "conversion"},
                    status_code=422,
                )

            if conversion.was_converted:
                was_converted = True
            original_format = conversion.original_format

            for img_buffer in conversion.image_buffers:
                resized_buffer = resize_for_ai(img_buffer)
                all_base64_docs.append({
                    "data": base64.b64encode(resized_buffer).decode("utf-8"),
                    "mime_type": "image/png",
                })

        # ─── Stage 2: AI extraction ───
        try:
            ai_provider = get_ai_provider()
        except Exception as err:
            return JSONResponse(
                content={
                    "error": str(err),
                    "step": "ai_init",
                },
                status_code=500,
            )

        extraction = await ai_provider.analyze_floor_plan(all_base64_docs)

        if not extraction["success"] or not extraction.get("data"):
            error_msg = extraction.get("error", "AI extraction failed. Please try a clearer image.")
            print(f"[API Analyze] AI extraction failed: {error_msg}")
            return JSONResponse(
                content={
                    "error": error_msg,
                    "step": "ai_extraction",
                },
                status_code=422,
            )

        extracted_data = extraction["data"]

        # ─── Stage 3: Confidence scoring ───
        confidence = score_confidence(extracted_data)
        needs_confirmation = confidence.score < 70

        # ─── Stage 4: Rule engine ───
        analysis = run_rule_engine(extracted_data)
        # Override analysis method to reflect AI source
        analysis.analysis_method = "ai_vision"

        response = AnalyzeResponse(
            extraction=extracted_data,
            analysis=analysis,
            confidence=confidence,
            needs_confirmation=needs_confirmation,
            meta=AnalyzeMeta(
                file_name=file[0].filename if len(file) == 1 else f"{len(file)} files processed",
                file_size=total_size,
                file_type=file[0].content_type if len(file) == 1 else "mixed",
                original_format=original_format,
                was_converted=was_converted,
                ai_provider=ai_provider.name,
                analyzed_at=datetime.now(timezone.utc).isoformat(),
            ),
        )

        return JSONResponse(
            content=response.model_dump(by_alias=True),
        )

    except Exception as err:
        print(f"Analysis error: {err}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            content={"error": "Internal server error during analysis."},
            status_code=500,
        )
