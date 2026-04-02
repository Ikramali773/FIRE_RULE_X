# backend/routes/analyze_manual.py
# POST /api/analyze-manual — Manual fallback endpoint
#
# Accepts: JSON body conforming to BuildingInput
# Skips AI vision entirely — for user-corrected input
# Returns: Same AnalyzeResponse shape as /api/analyze

from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from models import BuildingInput, AnalyzeResponse, AnalyzeMeta, ExtractionConfidence
from rule_engine import run_rule_engine

router = APIRouter()


@router.post("/api/analyze-manual")
async def analyze_manual(body: BuildingInput):
    """Manual analysis endpoint — accepts JSON body, runs rule engine only."""
    try:
        # Basic validation
        if not body.total_floor_area or not body.floor_areas or len(body.floor_areas) == 0:
            return JSONResponse(
                content={"error": "Missing required fields: totalFloorArea, floorAreas."},
                status_code=400,
            )

        if not body.number_of_floors or body.number_of_floors <= 0:
            body.number_of_floors = len(body.floor_areas)

        if not body.building_type:
            body.building_type = "Unknown"

        if not body.building_name:
            body.building_name = "Unnamed Building"

        # Run rule engine
        analysis = run_rule_engine(body)
        analysis.analysis_method = "manual_override"

        response = AnalyzeResponse(
            extraction=body,
            analysis=analysis,
            confidence=ExtractionConfidence(overall="high", score=100, flags=[]),
            needs_confirmation=False,
            meta=AnalyzeMeta(
                file_name="manual_input",
                file_size=0,
                file_type="application/json",
                original_format="json",
                was_converted=False,
                ai_provider="none",
                analyzed_at=datetime.now(timezone.utc).isoformat(),
            ),
        )

        return JSONResponse(
            content=response.model_dump(by_alias=True),
        )

    except Exception as err:
        print(f"Manual analysis error: {err}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            content={"error": "Invalid input. Ensure all required BuildingInput fields are provided."},
            status_code=400,
        )
