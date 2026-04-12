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
    },
    "Private Dwelling (1-2 Family)": {
        "group": "A",
        "subdivision": "A-2",
    },
    "Dormitory / Hostel": {
        "group": "A",
        "subdivision": "A-3",
    },
    "Residential Apartment": {
        "group": "A",
        "subdivision": "A-4",
    },
    "Hotel": {
        "group": "A",
        "subdivision": "A-5",
    },
    "Hotel (5-Star+)": {
        "group": "A",
        "subdivision": "A-6",
    },
    "School (up to Sr. Secondary)": {
        "group": "B",
        "subdivision": None,
    },
    "College / University": {
        "group": "B",
        "subdivision": None,
    },
    "Hospital / Nursing Home": {
        "group": "C",
        "subdivision": "C-1",
    },
    "Old Age Home / Orphanage": {
        "group": "C",
        "subdivision": "C-2",
    },
    "Jail / Prison": {
        "group": "C",
        "subdivision": "C-3",
    },
    "Assembly (Theatre / Hall / Stadium)": {
        "group": "D",
        "subdivision": None,
    },
    "Multiplex / Entertainment Complex": {
        "group": "D",
        "subdivision": "D-6",
    },
    "Religious / Exhibition Hall": {
        "group": "D",
        "subdivision": "D-7",
    },
    "Office / Bank": {
        "group": "E",
        "subdivision": None,
    },
    "Laboratory / Library": {
        "group": "E",
        "subdivision": None,
    },
    "Data Centre": {
        "group": "E",
        "subdivision": None,
    },
    "Small Shop (≤500 m²)": {
        "group": "F",
        "subdivision": "F-1",
    },
    "Mall / Department Store": {
        "group": "F",
        "subdivision": "F-2",
    },
    "Underground Shopping": {
        "group": "F",
        "subdivision": "F-3",
    },
    "Factory (Low Hazard)": {
        "group": "G",
        "subdivision": "G-1",
    },
    "Factory (Moderate Hazard)": {
        "group": "G",
        "subdivision": "G-2",
    },
    "Factory (High Hazard)": {
        "group": "G",
        "subdivision": "G-3",
    },
    "Warehouse / Storage": {
        "group": "H",
        "subdivision": None,
    },
    "Multi-Level Car Parking": {
        "group": "H",
        "subdivision": "MLCP",
    },
    "Hazardous Storage": {
        "group": "J",
        "subdivision": None,
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
