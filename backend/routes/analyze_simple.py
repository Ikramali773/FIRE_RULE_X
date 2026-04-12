# backend/routes/analyze_simple.py
# POST /api/analyze-simple — Simplified manual input endpoint
# GET  /api/building-types  — List available building types
#
# Accepts 5 fields: building_type, building_height, number_of_floors,
#                    max_floor_area, basement_area
# Auto-derives occupancy group, subdivision, and all BuildingInput fields.

from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from models import BuildingInput, AnalyzeResponse, AnalyzeMeta, ExtractionConfidence
from rule_engine import run_rule_engine
from building_type_mapper import get_mapping, get_all_building_types

router = APIRouter()


class SimpleManualInput(BaseModel):
    """Simplified 5-field manual input for fire safety analysis."""
    building_type: str = Field(description="Human-readable building type from dropdown")
    building_height: float = Field(gt=0, description="Building height in metres")
    number_of_floors: int = Field(ge=1, description="Number of floors/storeys")
    max_floor_area: float = Field(gt=0, description="Area of the largest floor in m²")
    basement_area: float = Field(ge=0, default=0, description="Basement area in m² (0 = no basement)")


@router.get("/api/building-types")
async def list_building_types():
    """Return all available building type labels for the dropdown."""
    return {"building_types": get_all_building_types()}


@router.post("/api/analyze-simple")
async def analyze_simple(body: SimpleManualInput):
    """Simplified analysis — accepts 5 fields, derives everything else."""
    try:
        # 1. Resolve building type → occupancy group + subdivision
        mapping = get_mapping(body.building_type)
        if not mapping:
            return JSONResponse(
                content={"error": f"Unknown building type: '{body.building_type}'. Use GET /api/building-types for valid options."},
                status_code=400,
            )

        group = mapping["group"]
        subdivision = mapping.get("subdivision")

        # 2. Derive floor areas and total area
        floor_areas = [body.max_floor_area] * body.number_of_floors
        total_floor_area = body.max_floor_area * body.number_of_floors + body.basement_area

        # 3. Build full BuildingInput with sensible defaults
        building_input = BuildingInput(
            building_name=f"{body.building_type} Analysis",
            building_type=body.building_type,
            total_floor_area=total_floor_area,
            number_of_floors=body.number_of_floors,
            floor_areas=floor_areas,
            building_height=body.building_height,
            occupant_count=0,  # Will be calculated by NBC occupant load
            has_kitchen=False,
            has_flammable_liquids=False,
            has_flammable_gases=False,
            has_combustible_metals=False,
            has_electrical_hazards=False,
            occupancy_group=group,
            occupancy_subdivision=subdivision,
            construction_type="type12",  # Default to fire-resistive (safer)
            has_sprinklers=False,
        )

        # 4. Run rule engine
        analysis = run_rule_engine(building_input)
        analysis.analysis_method = "manual_override"

        # 5. Build response
        response = AnalyzeResponse(
            extraction=building_input,
            analysis=analysis,
            confidence=ExtractionConfidence(overall="high", score=100, flags=[]),
            needs_confirmation=False,
            meta=AnalyzeMeta(
                file_name="manual_simple_input",
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
        print(f"Simple analysis error: {err}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            content={"error": f"Analysis failed: {str(err)}"},
            status_code=400,
        )
