# backend/electrical_checker.py
# IS 2190:2024 cl 7.5 + 6.3.7 — Electrical Hazard Requirements

from models import ExtinguisherRequirement


def check_electrical() -> ExtinguisherRequirement:
    return ExtinguisherRequirement(
        fire_class="C",
        minimum_rating="CO2-2kg",
        count_required=1,
        per_floor=False,
        clause_ref="IS 2190:2024, cl 7.5, cl 6.3.7",
        note="CO2, clean agent, or water-mist required near energized electrical equipment. Water/foam types prohibited.",
    )
