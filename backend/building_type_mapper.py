# backend/building_type_mapper.py
# Maps human-readable building types to NBC occupancy groups and subdivisions.
#
# The user selects a building type from a dropdown.
# This module resolves it to the correct occupancy group + subdivision
# for use in the NBC rule engine.

from __future__ import annotations

from typing import Optional

# ── Building Type → Occupancy Group/Subdivision Mapping ────────────
#
# Each entry: { display_label → (group, subdivision_or_None) }

_BUILDING_TYPE_MAP: dict[str, dict] = {
    "Lodging / Guest House": {
        "group": "A",
        "subdivision": "A-1",
        "nbcs_subdivision": "A-I",  # NBCS 2026 Section 3.1.2(a)
    },
    "Private Dwelling (1-2 Family)": {
        "group": "A",
        "subdivision": "A-2",
        "nbcs_subdivision": None,  # not separately listed in NBCS tables
    },
    "Dormitory / Hostel": {
        "group": "A",
        "subdivision": "A-3",
        "nbcs_subdivision": "A-II",  # NBCS 2026 Section 3.1.2(b)
    },
    "Residential Apartment": {
        "group": "A",
        "subdivision": "A-4",
        "nbcs_subdivision": "A-III",  # NBCS 2026 Section 3.1.2(c)
    },
    "Hotel": {
        "group": "A",
        "subdivision": "A-5",
        "nbcs_subdivision": "A-IV",  # NBCS 2026 Section 3.1.2(d)
    },
    "Hotel (5-Star+)": {
        "group": "A",
        "subdivision": "A-6",
        "nbcs_subdivision": "A-V",  # NBCS 2026 Section 3.1.2(e)
    },
    "School (up to Sr. Secondary)": {
        "group": "B",
        "subdivision": None,
        "nbcs_subdivision": None,  # NBCS 2026 Section 3.1.3 (no subdivisions)
    },
    "College / University": {
        "group": "B",
        "subdivision": None,
        "nbcs_subdivision": None,
    },
    "Hospital / Nursing Home": {
        "group": "C",
        "subdivision": "C-1",
        "nbcs_subdivision": "C-I",  # NBCS 2026 Section 3.1.4(a)
    },
    "Old Age Home / Orphanage": {
        "group": "C",
        "subdivision": "C-2",
        "nbcs_subdivision": "C-II",  # NBCS 2026 Section 3.1.4(b)
    },
    "Jail / Prison": {
        "group": "C",
        "subdivision": "C-3",
        "nbcs_subdivision": "C-III",  # NBCS 2026 Section 3.1.4(c)
    },
    "Assembly (Theatre / Hall / Stadium)": {
        "group": "D",
        "subdivision": None,
        "nbcs_subdivision": None,  # NBCS 2026 Section 3.1.5 (no subdivisions)
    },
    "Multiplex / Entertainment Complex": {
        "group": "D",
        "subdivision": "D-6",
        "nbcs_subdivision": None,
    },
    "Religious / Exhibition Hall": {
        "group": "D",
        "subdivision": "D-7",
        "nbcs_subdivision": None,
    },
    "Office / Bank": {
        "group": "E",
        "subdivision": "E-I",  # Updated per user approval — NBCS subdivision is active
        "nbcs_subdivision": "E-I",  # NBCS 2026 Section 3.1.6(a)
    },
    "Laboratory / Library": {
        "group": "E",
        "subdivision": "E-I",  # Updated per user approval
        "nbcs_subdivision": "E-I",
    },
    "Data Centre": {
        "group": "E",
        "subdivision": "E-II",  # Updated per user approval — NBCS 2026 Section 3.1.6(b)
        "nbcs_subdivision": "E-II",
    },
    "Small Shop (≤500 m²)": {
        "group": "F",
        "subdivision": "F-I",  # Updated per user approval — NBCS 2026 Section 3.1.7(a)
        "nbcs_subdivision": "F-I",
    },
    "Mall / Department Store": {
        "group": "F",
        "subdivision": "F-I",  # Updated per user approval — NBCS merges old F-1/F-2
        "nbcs_subdivision": "F-I",
    },
    "Underground Shopping": {
        "group": "F",
        "subdivision": "F-II",  # Updated per user approval — NBCS 2026 Section 3.1.7(b)
        "nbcs_subdivision": "F-II",
    },
    "Factory (Low Hazard)": {
        "group": "G",
        "subdivision": "G-1",
        "nbcs_subdivision": "G-I",  # NBCS 2026 Section 3.1.8(a)
    },
    "Factory (Moderate Hazard)": {
        "group": "G",
        "subdivision": "G-2",
        "nbcs_subdivision": "G-II",  # NBCS 2026 Section 3.1.8(b)
    },
    "Factory (High Hazard)": {
        "group": "G",
        "subdivision": "G-3",
        "nbcs_subdivision": "G-III",  # NBCS 2026 Section 3.1.8(c)
    },
    "Warehouse / Storage": {
        "group": "H",
        "subdivision": None,
        "nbcs_subdivision": None,  # NBCS 2026 Section 3.1.9
    },
    "Multi-Level Car Parking": {
        "group": "H",
        "subdivision": "MLCP",
        "nbcs_subdivision": None,
    },
    "Hazardous Storage": {
        "group": "J",
        "subdivision": None,
        "nbcs_subdivision": None,  # NBCS 2026 Section 3.1.10
    },
    # NBCS 2026 Part F, Section 3.1.11 — Mixed Occupancy
    "Mixed Use Building": {
        "group": "K",
        "subdivision": "K",
        "nbcs_subdivision": "K",
    },
}



def get_mapping(building_type: str) -> Optional[dict]:
    """Return {'group': ..., 'subdivision': ...} for a building type label.
    Returns None if the building type is not recognised.
    """
    return _BUILDING_TYPE_MAP.get(building_type)


def get_all_building_types() -> list[str]:
    """Return all available building type labels (for the frontend dropdown)."""
    return list(_BUILDING_TYPE_MAP.keys())
