# backend/class_bc_checker.py
# IS 2190:2024 Table 2 — Class B/C Fire Extinguisher Requirements
#
# Table 2 values:
#   Low hazard:      55B rating,  max 300 m²/extinguisher
#   Moderate hazard: 144B rating, max 150 m²/extinguisher
#   High hazard:     233B rating, max 100 m²/extinguisher
#
# Additional rules:
#   - Min 2 per floor (exception: <100m² → 1) per cl 7.3.4
#   - ADDITIONAL to Class A complement (cl 7.1.6)

import math
from models import HazardType, ExtinguisherRequirement

CLASS_B_TABLE: dict[str, dict] = {
    "low": {"rating": "55B", "max_area_m2": 300},
    "moderate": {"rating": "144B", "max_area_m2": 150},
    "high": {"rating": "233B", "max_area_m2": 100},
}


def check_class_bc(
    floor_areas: list[float], hazard_type: HazardType
) -> list[ExtinguisherRequirement]:
    entry = CLASS_B_TABLE[hazard_type]
    rating = entry["rating"]
    max_area = entry["max_area_m2"]

    results: list[ExtinguisherRequirement] = []
    for idx, area in enumerate(floor_areas):
        floor_label = "Ground Floor" if idx == 0 else f"Floor {idx}"
        calculated = math.ceil(area / max_area)
        minimum = 1 if area < 100 else 2

        results.append(
            ExtinguisherRequirement(
                fire_class="B",
                minimum_rating=rating,
                count_required=max(calculated, minimum),
                per_floor=True,
                clause_ref=f"IS 2190:2024, Table 2 ({hazard_type} hazard), cl 7.3.1–7.3.4",
                note=f"Additional to Class A complement. {floor_label}: area {area}m²",
            )
        )

    return results
