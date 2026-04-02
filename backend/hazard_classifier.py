# backend/hazard_classifier.py
# IS 2190:2024 Annex B (Table 6) — Hazard Type Classification
#
# Determines whether a building is Low, Moderate, or High hazard.
# Rule: Building is classified at the HIGHEST hazard level where
# ANY single criterion places it.

from models import BuildingInput, HazardType


def determine_hazard_type(
    inp: BuildingInput,
) -> dict:
    """Return {"hazard_type": ..., "reasons": [...], "clause_ref": ...}."""
    reasons: list[str] = []
    clause_ref = "IS 2190:2024, Annex B (Table 6)"

    height = inp.building_height
    occupants = inp.occupant_count
    area = inp.total_floor_area
    gases = inp.flammable_gases_litres or 0
    liquids = inp.flammable_liquids_litres or 0

    # HIGH hazard: any single criterion exceeds high threshold
    if height > 15:
        reasons.append(f"Building height {height}m > 15m")
    if occupants > 250:
        reasons.append(f"Occupant count {occupants} > 250")
    if area > 3000:
        reasons.append(f"Total floor area {area}m² > 3000m²")
    if gases > 3000:
        reasons.append(f"Flammable gases {gases}L > 3000L")
    if liquids > 1000:
        reasons.append(f"Flammable liquids {liquids}L > 1000L")

    if reasons:
        return {"hazard_type": "high", "reasons": reasons, "clause_ref": clause_ref}

    # MODERATE hazard
    moderate_reasons: list[str] = []
    if 15 <= occupants <= 250:
        moderate_reasons.append(f"Occupant count {occupants} (15–250)")
    if 300 <= area <= 3000:
        moderate_reasons.append(f"Floor area {area}m² (300–3000m²)")
    if 500 <= gases <= 3000:
        moderate_reasons.append(f"Flammable gases {gases}L (500–3000L)")
    if 250 <= liquids <= 1000:
        moderate_reasons.append(f"Flammable liquids {liquids}L (250–1000L)")

    if moderate_reasons:
        return {"hazard_type": "moderate", "reasons": moderate_reasons, "clause_ref": clause_ref}

    # LOW hazard: default
    return {
        "hazard_type": "low",
        "reasons": ["All criteria within low hazard thresholds"],
        "clause_ref": clause_ref,
    }
