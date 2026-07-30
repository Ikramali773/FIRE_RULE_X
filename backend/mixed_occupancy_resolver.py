# backend/mixed_occupancy_resolver.py
# Mixed-occupancy Rule Resolver — NBC Part 4
#
# Runs the single-occupancy Table 7 evaluation once per selected occupancy
# (or per zone) and then aggregates per-parameter using strictest logic:
#   - booleans          → OR
#   - required minimums → MAX
#   - stricter max limits → MIN
#   - notes             → union of triggered notes
#
# Each resulting installation carries `triggeredBy` (list of source
# occupancy codes) so the UI can show WHY a system is required.
#
# Output uses the normalised `ComplianceResultItem` schema in models.py.

from __future__ import annotations

from typing import Optional

from models import (
    BuildingInput,
    ComplianceResultItem,
    OccupancyZone,
    OccupancySelection,
)
from nbc_checker import check_firefighting_installations
from building_type_mapper import get_mapping


# ── System registry ────────────────────────────────────────────────
# Each entry defines how a Table 7 boolean field maps to a normalised
# compliance item shown in UI & PDF. Wet Riser and Down Comer are
# INTENTIONALLY separate entries — never merged.

_SYSTEM_REGISTRY = [
    {
        "id": "fire_extinguisher",
        "title": "Fire Extinguisher",
        "field": "fire_extinguisher",
        "clause": "NBC 2016 Part 4, Table 7",
        "bis": ["IS 2190"],
        "next_steps_required": [
            "Determine extinguisher types & ratings per hazard class",
            "Distribute per IS 2190 travel distance and floor coverage",
        ],
    },
    {
        "id": "hose_reel",
        "title": "First-aid Hose Reel",
        "field": "first_aid_hose_reel",
        "clause": "NBC 2016 Part 4, Table 7",
        "bis": ["IS 884", "IS 3844"],
        "next_steps_required": [
            "Locate hose reel drums with reach on every floor",
            "Confirm hose length & nozzle spec per IS 884",
        ],
    },
    {
        "id": "wet_riser",
        "title": "Wet Riser",
        "field": "wet_riser",
        "clause": "NBC 2016 Part 4, Table 7 (Cols. wet riser)",
        "bis": ["IS 3844", "IS 15301"],
        "next_steps_required": [
            "Design 100 mm wet-riser shaft with landing valves per floor",
            "Confirm terminal pressure at topmost landing valve (3.5 kg/cm²)",
            "Size booster/jockey pump per IS 15301",
        ],
    },
    {
        "id": "down_comer",
        "title": "Down Comer",
        "field": "down_comer",
        "clause": "NBC 2016 Part 4, Table 7 (Cols. down comer)",
        "bis": ["IS 3844"],
        "next_steps_required": [
            "Design gravity-fed 100 mm down-comer from terrace tank",
            "Provide landing valve on each floor with 15 m hose",
            "Confirm inlet breeching connection at ground level",
        ],
    },
    {
        "id": "yard_hydrant",
        "title": "Yard Hydrant",
        "field": "yard_hydrant",
        "clause": "NBC 2016 Part 4, Table 7",
        "bis": ["IS 908", "IS 13039", "IS 5290"],
        "next_steps_required": [
            "Locate yard hydrants around perimeter (30 m spacing max)",
            "Design ring main with sectional isolation valves",
        ],
    },
    {
        "id": "sprinkler_system",
        "title": "Sprinkler System",
        "field": "automatic_sprinkler",
        "clause": "NBC 2016 Part 4, Table 7",
        "bis": ["IS 15105", "IS 9972"],
        "next_steps_required": [
            "Design wet-pipe sprinkler system per IS 15105",
            "Confirm hazard classification (LH / OH / HH) and density",
        ],
    },
    {
        "id": "manual_alarm",
        "title": "Manual Fire Alarm",
        "field": "manual_fire_alarm",
        "clause": "NBC 2016 Part 4, Table 7",
        "bis": ["IS 2189"],
        "next_steps_required": [
            "Place MCPs near exits, max 30 m travel to any MCP",
            "Wire back to fire alarm panel per IS 2189",
        ],
    },
    {
        "id": "auto_detection",
        "title": "Automatic Detection & Alarm",
        "field": "auto_detection_alarm",
        "clause": "NBC 2016 Part 4, Table 7",
        "bis": ["IS 2189", "IS 15908"],
        "next_steps_required": [
            "Design smoke detector grid per IS 2189",
            "Panel spec per IS 15908 with battery backup",
        ],
    },
]

# Water & pump quantities (numeric) — MAX aggregation
_NUMERIC_FIELDS = [
    ("underground_tank_litres", "Underground Tank"),
    ("terrace_tank_litres", "Terrace Tank"),
    ("underground_pump_lpm", "Underground Pump"),
    ("terrace_pump_lpm", "Terrace Pump"),
]


def _reason_for_system(system_id: str, triggered_by: list[str]) -> str:
    if not triggered_by:
        return "Not required by NBC Part 4 Table 7 for the selected occupancy and building parameters."
    lst = ", ".join(triggered_by)
    special = {
        "wet_riser": (
            f"Wet riser required because occupancy/height/area tier for {lst} triggers "
            "Table 7 wet-riser column (Cols. wet riser + associated notes)."
        ),
        "down_comer": (
            f"Down comer required because occupancy/height/area tier for {lst} triggers "
            "Table 7 down-comer column (Cols. down comer + associated notes)."
        ),
    }
    if system_id in special:
        return special[system_id]
    return f"Required by NBC Part 4 Table 7 for the applicable tier of: {lst}."


def resolve(inp: BuildingInput) -> dict:
    """Run per-occupancy Table 7 evaluation and aggregate strictest.

    Returns a dict:
      {
        "compliance_items": [ComplianceResultItem, ...],
        "aggregated_quantities": {
            "underground_tank_litres": (int, [triggeredBy]),
            "terrace_tank_litres":     (int, [triggeredBy]),
            "underground_pump_lpm":    (int, [triggeredBy]),
            "terrace_pump_lpm":        (int, [triggeredBy]),
        },
        "height_tier_labels": {occ_code: tier_label},
        "occupancy_labels":   {occ_code: label},
        "passed_checks":  [str, ...],
        "missing_inputs": [str, ...],
      }
    """
    selection: OccupancySelection = inp.occupancy_selection
    zones = selection.occupancy_zones or []

    # Build the list of occupancies to evaluate
    if selection.mode == "single":
        occupancy_codes = [selection.primary_occupancy] if selection.primary_occupancy else []
    else:
        # Mixed — union of primary + secondary + zones
        occs: list[str] = []
        if selection.primary_occupancy:
            occs.append(selection.primary_occupancy)
        for s in selection.secondary_occupancies or []:
            if s not in occs:
                occs.append(s)
        for z in zones:
            if z.occupancy_code not in occs:
                occs.append(z.occupancy_code)
        occupancy_codes = occs

    if not occupancy_codes:
        return {
            "compliance_items": [],
            "aggregated_quantities": {},
            "height_tier_labels": {},
            "occupancy_labels": {},
            "passed_checks": [],
            "missing_inputs": ["Select at least one occupancy to run compliance checks."],
        }

    # Get per-occupancy Table 7 result. When zones are present with per-zone
    # area, use that as the tier-matching area. Otherwise use max floor area.
    max_floor_area = max(inp.floor_areas) if inp.floor_areas else inp.total_floor_area
    per_occupancy: dict[str, dict] = {}
    height_tier_labels: dict[str, str] = {}
    occupancy_labels: dict[str, str] = {}

    for code in occupancy_codes:
        # Occupancy group is first letter; subdivision is the full code
        group = code.split("-")[0] if "-" in code else code
        subdivision = code

        # If this occupancy has an area from zones, use that (per-zone floor area)
        zone_areas = [z.area_m2 for z in zones if z.occupancy_code == code and z.area_m2]
        area_for_tier = max(zone_areas) if zone_areas else max_floor_area

        fi_check = check_firefighting_installations(
            group=group,
            subdivision=subdivision,
            building_height_m=inp.building_height,
            floor_area_m2=area_for_tier,
            num_floors=inp.number_of_floors,
            basement_area_m2=inp.basement_area,
        )
        result_obj = fi_check.get("result")
        if not result_obj:
            continue
        per_occupancy[code] = {
            "result": result_obj,
            "area_used": area_for_tier,
        }
        height_tier_labels[code] = result_obj.height_tier_label
        occupancy_labels[code] = result_obj.occupancy_label

    # Build ComplianceResultItem for each system in the registry
    compliance_items: list[ComplianceResultItem] = []
    for sys_def in _SYSTEM_REGISTRY:
        field = sys_def["field"]
        triggered_by: list[str] = []
        clause_refs: set[str] = {sys_def["clause"]}
        merged_notes: list[str] = []

        for code, entry in per_occupancy.items():
            res = entry["result"]
            if getattr(res, field, False):
                triggered_by.append(code)
                # Include note descriptions for THIS field that were met
                for en in (res.evaluated_notes or []):
                    if en.field == field and en.is_met:
                        note_text = f"Note {en.note_id} ({code}): {en.description}"
                        if note_text not in merged_notes:
                            merged_notes.append(note_text)
                        clause_refs.add(f"Table 7 Note {en.note_id}")

        status = "required" if triggered_by else "not_required"
        item = ComplianceResultItem(
            id=sys_def["id"],
            title=sys_def["title"],
            status=status,
            reason=_reason_for_system(sys_def["id"], triggered_by),
            clause_refs=sorted(clause_refs),
            triggered_by=triggered_by,
            bis_standards=sys_def["bis"] if triggered_by else [],
            notes=merged_notes,
            next_steps=sys_def["next_steps_required"] if triggered_by else [],
        )
        compliance_items.append(item)

    # Aggregate numeric quantities (MAX)
    aggregated_quantities: dict[str, dict] = {}
    for field, _label in _NUMERIC_FIELDS:
        best_val: Optional[int] = None
        who: list[str] = []
        for code, entry in per_occupancy.items():
            res = entry["result"]
            val = getattr(res, field, None)
            if val is None:
                continue
            if best_val is None or val > best_val:
                best_val = val
                who = [code]
            elif val == best_val:
                who.append(code)
        if best_val is not None:
            aggregated_quantities[field] = {
                "value": int(best_val),
                "triggered_by": who,
            }

    passed_checks: list[str] = []
    missing_inputs: list[str] = []
    if selection.mode == "mixed" and len(per_occupancy) >= 2:
        passed_checks.append(
            f"Mixed-occupancy resolution applied across {len(per_occupancy)} occupancies "
            f"({', '.join(per_occupancy.keys())}); strictest per-parameter rule taken."
        )
    if inp.basement_area == 0 and inp.basement_count and inp.basement_count > 0:
        missing_inputs.append(
            "Basement count is set but basement area is 0 m² — enter basement area to evaluate Note 4 (sprinkler in basement)."
        )
    if not inp.construction_type:
        missing_inputs.append("Construction type not selected — travel-distance check will be skipped.")

    return {
        "compliance_items": compliance_items,
        "aggregated_quantities": aggregated_quantities,
        "height_tier_labels": height_tier_labels,
        "occupancy_labels": occupancy_labels,
        "passed_checks": passed_checks,
        "missing_inputs": missing_inputs,
    }
