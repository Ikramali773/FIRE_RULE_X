# backend/nbcs_applicability.py
# NBCS 2026 Part F — Applicability Checker
#
# Determines whether NBCS 2026 Part F provisions are applicable to a building
# based on Section 1.2 thresholds (height and floor area per occupancy).
#
# NBCS Reference: Part F, Section 1.2
#   "The provisions of this Part are applicable to those high rise buildings
#    having a height exceeding a certain value, or, to special buildings
#    (having a certain area exceeded on any floor), as given below..."
#
# Implementation Note:
#   This is a TRACKING layer only. Per Software Scope:
#   "FireRuleX should support both a baseline NBC 2016 library and an NBCS
#    tracking layer, but should not switch live calculation logic to NBCS
#    nationally until the applicable state or approving authority clearly
#    adopts and enforces it."

from __future__ import annotations

from typing import Optional


# ── NBCS 2026 Part F Section 1.2 — Applicability Thresholds ──
#
# Each entry: occupancy_key -> {
#   "label": display name,
#   "height_threshold_m": building height beyond which Part F applies,
#   "area_threshold_m2": floor area beyond which Part F applies,
#   "height_note": special note for height (e.g. "any height"),
#   "area_note": special note for area (e.g. "total area exceeds X"),
# }
#
# Source: NBCS 2026 Part F, Section 1.2, Table (lines 249-264 of document)

_NBCS_APPLICABILITY_THRESHOLDS: dict[str, dict] = {
    "A": {
        "label": "Residential",
        "height_threshold_m": 24,
        "area_threshold_m2": 750,
    },
    "B": {
        "label": "Educational",
        "height_threshold_m": 9,
        "area_threshold_m2": 500,
    },
    "C": {
        "label": "Institutional",
        "height_threshold_m": 15,
        "area_threshold_m2": 500,
    },
    "D": {
        "label": "Assembly",
        "height_threshold_m": 9,
        "area_threshold_m2": 750,
    },
    "E": {
        "label": "Business",
        "height_threshold_m": 15,
        "area_threshold_m2": 750,
    },
    "F": {
        "label": "Mercantile",
        "height_threshold_m": 15,
        "area_threshold_m2": 1000,
    },
    "G-1": {
        "label": "Industrial – Low hazard",
        "height_threshold_m": None,  # "Any height"
        "area_threshold_m2": 2000,  # "total area of the building exceeds 2000 m²"
        "height_note": "Any height — applicability is based on total building area",
        "area_note": "Total area of the building exceeds 2000 m²",
    },
    "G-2": {
        "label": "Industrial – Moderate hazard",
        "height_threshold_m": None,  # "Any height"
        "area_threshold_m2": 2000,  # "total area of the building exceeds 2000 m²"
        "height_note": "Any height — applicability is based on total building area",
        "area_note": "Total area of the building exceeds 2000 m²",
    },
    "G-3": {
        "label": "Industrial – High hazard",
        "height_threshold_m": 15,
        "area_threshold_m2": 500,
    },
    "H": {
        "label": "Storage",
        "height_threshold_m": 9,
        "area_threshold_m2": 500,
    },
    "J": {
        "label": "Hazardous",
        "height_threshold_m": 9,
        "area_threshold_m2": 500,
    },
    "MIXED": {
        "label": "Mixed Use",
        "height_threshold_m": 15,
        "area_threshold_m2": 1000,
    },
}


def check_nbcs_applicability(
    occupancy_group: str,
    occupancy_subdivision: Optional[str],
    building_height: float,
    max_floor_area: float,
) -> dict:
    """Check whether NBCS 2026 Part F provisions are applicable.

    Args:
        occupancy_group: NBC occupancy group (A-J)
        occupancy_subdivision: Optional subdivision (e.g. 'G-1', 'G-2', 'G-3')
        building_height: Building height in metres
        max_floor_area: Maximum floor area on any single floor in m²

    Returns:
        dict with keys:
            is_applicable: bool — whether Part F provisions apply
            reason: str — human-readable explanation
            clause_ref: str — NBCS section reference
            thresholds: dict — the applicable thresholds used
            occupancy_label: str — display name of the occupancy
    """
    clause_ref = "NBCS 2026 Part F, Section 1.2"

    # Determine lookup key — use subdivision for industrial groups
    lookup_key = occupancy_group
    if occupancy_subdivision and occupancy_subdivision in _NBCS_APPLICABILITY_THRESHOLDS:
        lookup_key = occupancy_subdivision

    threshold = _NBCS_APPLICABILITY_THRESHOLDS.get(lookup_key)

    if threshold is None:
        return {
            "is_applicable": False,
            "reason": f"Occupancy group '{lookup_key}' not found in NBCS 2026 applicability table",
            "clause_ref": clause_ref,
            "thresholds": None,
            "occupancy_label": lookup_key,
        }

    label = threshold["label"]
    height_threshold = threshold.get("height_threshold_m")
    area_threshold = threshold.get("area_threshold_m2")

    reasons = []

    # Height check
    height_applicable = False
    if height_threshold is not None:
        if building_height > height_threshold:
            height_applicable = True
            reasons.append(
                f"Building height ({building_height}m) exceeds "
                f"{height_threshold}m threshold for {label}"
            )
    else:
        # "Any height" — for G-1 and G-2 industrial
        height_applicable = True
        reasons.append(threshold.get("height_note", "Applicable at any height"))

    # Area check
    area_applicable = False
    if area_threshold is not None:
        if max_floor_area > area_threshold:
            area_applicable = True
            reasons.append(
                f"Floor area ({max_floor_area}m²) exceeds "
                f"{area_threshold}m² threshold for {label}"
            )

    is_applicable = height_applicable or area_applicable

    if not is_applicable:
        reason = (
            f"Building height ({building_height}m) does not exceed "
            f"{height_threshold}m and floor area ({max_floor_area}m²) "
            f"does not exceed {area_threshold}m² for {label} occupancy"
        )
    else:
        reason = "; ".join(reasons)

    return {
        "is_applicable": is_applicable,
        "reason": reason,
        "clause_ref": clause_ref,
        "thresholds": {
            "height_threshold_m": height_threshold,
            "area_threshold_m2": area_threshold,
        },
        "occupancy_label": label,
    }
