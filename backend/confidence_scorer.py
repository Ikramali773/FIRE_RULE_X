# backend/confidence_scorer.py
# Confidence scoring for AI-extracted building data
#
# Penalty-based: starts at 100, deducts for missing/implausible fields.
# Thresholds: high (≥70), medium (40-69), low (<40)

from models import BuildingInput, ExtractionConfidence


def score_confidence(data: BuildingInput) -> ExtractionConfidence:
    flags: list[str] = []
    score = 100

    # --- Critical field checks ---

    if not data.total_floor_area or data.total_floor_area <= 0:
        flags.append("Total floor area missing or zero")
        score -= 30

    if not data.number_of_floors or data.number_of_floors <= 0:
        flags.append("Number of floors missing or zero")
        score -= 20

    if not data.floor_areas or len(data.floor_areas) == 0:
        flags.append("Floor areas array empty")
        score -= 25

    if (
        data.floor_areas
        and data.number_of_floors
        and len(data.floor_areas) != data.number_of_floors
    ):
        flags.append(
            f"Floor areas count ({len(data.floor_areas)}) doesn't match "
            f"numberOfFloors ({data.number_of_floors})"
        )
        score -= 15

    if not data.occupant_count or data.occupant_count <= 0:
        flags.append("Occupant count missing — using area-based estimate")
        score -= 10

    if not data.building_height or data.building_height <= 0:
        flags.append("Building height missing — using floor-count estimate")
        score -= 10

    # --- Plausibility checks ---

    if data.total_floor_area > 50000:
        flags.append("Total area > 50,000 m² — unusually large, verify")
        score -= 10

    if data.number_of_floors > 20:
        flags.append("More than 20 floors — verify this is correct")
        score -= 5

    if data.occupant_count > 5000:
        flags.append("Occupant count > 5000 — verify")
        score -= 5

    # Floor areas sum vs totalFloorArea (±10% tolerance)
    if data.floor_areas and len(data.floor_areas) > 0 and data.total_floor_area > 0:
        floor_sum = sum(data.floor_areas)
        deviation = abs(data.total_floor_area - floor_sum) / data.total_floor_area
        if deviation > 0.10:
            flags.append(
                f"Floor areas sum ({floor_sum:.0f}m²) differs from "
                f"totalFloorArea ({data.total_floor_area}m²) by {deviation * 100:.0f}%"
            )
            score -= 10

    # Occupant density sanity check
    if data.occupant_count > 0 and data.total_floor_area > 0:
        density = data.total_floor_area / data.occupant_count
        if density < 2:
            flags.append(
                f"Occupant density too high ({density:.1f}m²/person) — verify count"
            )
            score -= 10
        elif density > 50:
            flags.append(
                f"Occupant density very low ({density:.1f}m²/person) — verify count"
            )
            score -= 5

    # Building height vs floor count consistency
    if data.building_height > 0 and data.number_of_floors > 0:
        height_per_floor = data.building_height / data.number_of_floors
        if height_per_floor < 2.5 or height_per_floor > 6:
            flags.append(
                f"Height per floor ({height_per_floor:.1f}m) outside typical 2.5–6m range — verify"
            )
            score -= 5

    score = max(0, score)
    overall = "high" if score >= 70 else ("medium" if score >= 40 else "low")

    return ExtractionConfidence(overall=overall, score=score, flags=flags)
