# backend/class_a_checker.py
# IS 2190:2024 Table 1 — Class A Fire Extinguisher Requirements
#
# Table 1 values:
#   Low hazard:      2A rating, max 300 m²/extinguisher
#   Moderate hazard: 3A rating, max 150 m²/extinguisher
#   High hazard:     4A rating, max 100 m²/extinguisher
#
# Additional rules (cl 7.2.2):
#   - Minimum 2 extinguishers per floor
#   - Exception: floor area < 100 m² may have 1 extinguisher

from models import HazardType, ExtinguisherRequirement, Violation

CLASS_A_TABLE: dict[str, dict] = {
    "low": {"rating": "2A", "max_area_m2": 300},
    "moderate": {"rating": "3A", "max_area_m2": 150},
    "high": {"rating": "4A", "max_area_m2": 100},
}


def check_class_a(
    floor_areas: list[float], hazard_type: HazardType
) -> dict:
    """Return {"requirements": [...], "violations": [...]}."""
    entry = CLASS_A_TABLE[hazard_type]
    rating = entry["rating"]
    max_area = entry["max_area_m2"]

    requirements: list[ExtinguisherRequirement] = []
    violations: list[Violation] = []

    for idx, area in enumerate(floor_areas):
        floor_label = "Ground Floor" if idx == 0 else f"Floor {idx}"
        import math
        calculated = math.ceil(area / max_area)
        minimum = 1 if area < 100 else 2  # cl 7.2.2
        count_required = max(calculated, minimum)

        requirements.append(
            ExtinguisherRequirement(
                fire_class="A",
                minimum_rating=rating,
                count_required=count_required,
                per_floor=True,
                clause_ref=f"IS 2190:2024, Table 1 ({hazard_type} hazard), cl 7.2.1–7.2.2",
                note=f"{floor_label}: area {area}m² → {calculated} by area, min {minimum} by rule → {count_required} required",
            )
        )

    return {"requirements": requirements, "violations": violations}
