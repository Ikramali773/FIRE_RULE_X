# backend/class_f_checker.py
# IS 2190:2024 Table 3 — Class F Fire Extinguisher Requirements
#
# Table 3 values (cooking area → minimum rating):
#   ≤ 0.03 m² → 5F
#   ≤ 0.05 m² → 15F
#   ≤ 0.08 m² → 25F
#   ≤ 0.25 m² → 75F
#   > 0.25 m² → multiple 75F (ceil(area / 0.25))

import math
from models import ExtinguisherRequirement

CLASS_F_TABLE = [
    {"max_cooking_area_m2": 0.03, "rating": "5F"},
    {"max_cooking_area_m2": 0.05, "rating": "15F"},
    {"max_cooking_area_m2": 0.08, "rating": "25F"},
    {"max_cooking_area_m2": 0.25, "rating": "75F"},
]


def check_class_f(cooking_area_m2: float) -> ExtinguisherRequirement:
    for entry in CLASS_F_TABLE:
        if cooking_area_m2 <= entry["max_cooking_area_m2"]:
            return ExtinguisherRequirement(
                fire_class="F",
                minimum_rating=entry["rating"],
                count_required=1,
                per_floor=False,
                clause_ref="IS 2190:2024, Table 3, cl 7.7",
                note=f"Kitchen cooking area: {cooking_area_m2}m²",
            )

    # Area > 0.25 m²: multiple 75F extinguishers
    count = math.ceil(cooking_area_m2 / 0.25)
    return ExtinguisherRequirement(
        fire_class="F",
        minimum_rating="75F",
        count_required=count,
        per_floor=False,
        clause_ref="IS 2190:2024, Table 3, cl 7.7",
        note=f"Large kitchen: {cooking_area_m2}m² → {count} × 75F extinguishers",
    )
