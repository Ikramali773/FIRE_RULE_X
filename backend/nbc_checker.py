# backend/nbc_checker.py
# NBC 2016 Part IV — Building Classification & Safety Rule Checker
#
# Evaluates NBC compliance for:
#   1. Occupant Load (Table 3)
#   2. Exit Capacity (Table 4)
#   3. Travel Distance (Table 5)
#   4. Firefighting Installations (Table 7)

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Optional

from models import (
    BuildingInput,
    OccupancyGroup,
    ConstructionType,
    FirefightingInstallationRequirement,
    OccupantLoadData,
    ExitCapacityData,
    TravelDistanceData,
    Violation,
)

# Load NBC data once at module level
_DATA_PATH = Path(__file__).parent / "data" / "nbc_building_classification.json"
with open(_DATA_PATH, "r", encoding="utf-8") as f:
    _NBC_DATA = json.load(f)

UNIT_WIDTH_MM = 500  # One unit exit width = 500mm per NBC


# ── Helper: get occupant load factor ────────────────────────────────


def _get_occupant_load_factor(group: str, sub_type: Optional[str] = None) -> Optional[float]:
    factors = _NBC_DATA["occupantLoadFactors"]["factors"]
    group_factors = factors.get(group)
    if not group_factors:
        return None

    # Groups with sub-types (C, D, F)
    if sub_type and isinstance(group_factors.get(sub_type), (int, float)):
        return float(group_factors[sub_type])

    # Default factor
    if isinstance(group_factors.get("default"), (int, float)):
        return float(group_factors["default"])

    # For groups with only sub-types, pick the first numeric one
    for key, val in group_factors.items():
        if key != "unit" and isinstance(val, (int, float)):
            return float(val)

    return None


# ── 1. Occupant Load (Table 3) ─────────────────────────────────────


def calculate_occupant_load(
    group: str, floor_area_m2: float, sub_type: Optional[str] = None
) -> Optional[OccupantLoadData]:
    factor = _get_occupant_load_factor(group, sub_type)
    if factor is None:
        return None

    max_occupants = math.floor(floor_area_m2 / factor)

    return OccupantLoadData(
        max_occupants=max_occupants,
        load_factor=factor,
        floor_area_used=floor_area_m2,
        group=group,
    )


# ── 2. Exit Capacity (Table 4) ─────────────────────────────────────


def calculate_exit_capacity(
    group: str, occupant_count: int
) -> Optional[ExitCapacityData]:
    factors = _NBC_DATA["capacityFactors"]["factors"]
    group_factors = factors.get(group)
    if not group_factors:
        return None

    stairway_units = math.ceil(occupant_count / group_factors["stairways"])
    corridor_units = math.ceil(occupant_count / group_factors["corridors"])
    door_units = math.ceil(occupant_count / group_factors["doors"])

    return ExitCapacityData(
        stairway_units=stairway_units,
        corridor_units=corridor_units,
        door_units=door_units,
        stairway_width_mm=stairway_units * UNIT_WIDTH_MM,
        corridor_width_mm=corridor_units * UNIT_WIDTH_MM,
        door_width_mm=door_units * UNIT_WIDTH_MM,
        occupant_count=occupant_count,
        group=group,
    )


# ── 3. Travel Distance (Table 5) ───────────────────────────────────


def check_travel_distance(
    group: str,
    construction_type: str,
    has_sprinklers: bool,
    subdivision: Optional[str] = None,
) -> Optional[TravelDistanceData]:
    distances = _NBC_DATA["travelDistance"]["distances"]

    # Industrial groups G-1, G-2, G-3 have separate entries
    lookup_key = group
    if group == "G" and subdivision and subdivision in distances:
        lookup_key = subdivision

    entry = distances.get(lookup_key)
    if entry is None:
        return None

    base_value = entry.get("type12") if construction_type == "type12" else entry.get("type34")

    # NOT_PERMITTED case
    if base_value == "NOT_PERMITTED":
        return TravelDistanceData(
            max_distance_m=-1,
            base_distance_m=-1,
            sprinkler_applied=False,
            construction_type=construction_type,
            group=group,
        )

    base_distance = float(base_value)
    sprinkler_bonus = _NBC_DATA["travelDistance"]["sprinklerBonus"]
    max_distance = base_distance * sprinkler_bonus if has_sprinklers else base_distance

    return TravelDistanceData(
        max_distance_m=max_distance,
        base_distance_m=base_distance,
        sprinkler_applied=has_sprinklers,
        construction_type=construction_type,
        group=group,
    )


# ── 4. Firefighting Installations (Table 7) ────────────────────────


# Condition evaluators for Table 7 notes
def _evaluate_condition(
    condition: str,
    building_height_m: float,
    num_floors: int,
    basement_area_m2: float,
) -> bool:
    """Evaluate a note condition key against actual building inputs."""
    if condition == "always":
        return True
    if condition == "basement_area_gt_200":
        return basement_area_m2 > 200
    if condition == "floors_gt_2":
        return num_floors > 2
    if condition == "floors_gt_1":
        return num_floors > 1
    if condition == "height_gte_15":
        return building_height_m >= 15
    if condition == "height_gte_60":
        return building_height_m >= 60
    return False


def check_firefighting_installations(
    group: str,
    subdivision: Optional[str],
    building_height_m: float,
    floor_area_m2: float = 0,
    num_floors: int = 0,
    basement_area_m2: float = 0,
) -> dict:
    """Return {"result": ..., "violation": ...} — one or both may be None.

    Tier matching uses multiple criteria from Table 7:
      - maxHeightM / minHeightM: building height range
      - maxAreaM2 / minAreaM2:   largest floor area (or covered area)
      - maxFloors / minFloors:   number of storeys
    A tier matches if ALL provided criteria are satisfied.

    Conditional notes are evaluated against building inputs to determine
    if note conditions (like basement > 200m²) are actually met.
    """
    fi_data = _NBC_DATA.get("firefightingInstallations")
    if not fi_data:
        return {}

    height_limits = fi_data.get("heightNotPermitted", {})

    # Check height-not-permitted limits — try subdivision first, then group
    max_height = height_limits.get(subdivision or "", height_limits.get(group))
    if max_height is not None and building_height_m > max_height:
        label = subdivision or group
        return {
            "violation": Violation(
                rule_id="NBC-FI-HEIGHT-NOT-PERMITTED",
                clause_ref="NBC 2016 Part IV, Table 7",
                severity="high",
                description=f"Building height ({building_height_m}m) exceeds the maximum permitted height ({max_height}m) for {label} occupancy.",
                fix_suggestion=f"{label} buildings must not exceed {max_height}m. Reduce building height or reclassify the occupancy.",
            ),
        }

    # Look up requirements — try subdivision first, then group
    tiers = fi_data["requirements"].get(subdivision or "")
    if not tiers:
        tiers = fi_data["requirements"].get(group)
    if not tiers:
        return {}

    # Find matching tier using multi-criteria: height, area, floors
    tier = None
    for t in tiers:
        # Height check
        if building_height_m > t["maxHeightM"]:
            continue
        if "minHeightM" in t and building_height_m < t["minHeightM"]:
            continue
        # Area check (if tier specifies area criteria)
        if "maxAreaM2" in t and floor_area_m2 > 0 and floor_area_m2 > t["maxAreaM2"]:
            continue
        if "minAreaM2" in t and floor_area_m2 > 0 and floor_area_m2 < t["minAreaM2"]:
            continue
        # Floor count check (if tier specifies floor criteria)
        if "maxFloors" in t and num_floors > 0 and num_floors > t["maxFloors"]:
            continue
        if "minFloors" in t and num_floors > 0 and num_floors < t["minFloors"]:
            continue
        tier = t
        break

    if tier is None:
        # No tier matched — use the last (most conservative) tier
        tier = tiers[-1]

    # Start with base values from the tier
    base_values = {
        "fireExtinguisher": tier["fireExtinguisher"],
        "firstAidHoseReel": tier["firstAidHoseReel"],
        "wetRiser": tier["wetRiser"],
        "downComer": tier["downComer"],
        "yardHydrant": tier["yardHydrant"],
        "automaticSprinkler": tier["automaticSprinkler"],
        "manualFireAlarm": tier["manualFireAlarm"],
        "autoDetectionAlarm": tier["autoDetectionAlarm"],
        "undergroundTankLitres": tier.get("undergroundTankLitres"),
        "terraceTankLitres": tier.get("terraceTankLitres"),
        "undergroundPumpLpm": tier.get("undergroundPumpLpm"),
        "terracePumpLpm": tier.get("terracePumpLpm"),
    }

    # Evaluate conditional notes and apply modifications
    from models import EvaluatedNote
    evaluated_notes = []
    conditional_notes = tier.get("conditionalNotes", [])

    for cn in conditional_notes:
        is_met = _evaluate_condition(
            cn["condition"], building_height_m, num_floors, basement_area_m2
        )

        evaluated_notes.append(
            EvaluatedNote(
                note_id=cn["noteId"],
                field=cn.get("field"),
                condition=cn["condition"],
                is_met=is_met,
                description=cn["description"],
                additional_value=cn.get("additionalValue"),
                set_value=cn.get("setValue"),
            )
        )

        # Apply note effects when condition is met
        if is_met:
            field = cn.get("field")
            additional_value = cn.get("additionalValue")
            set_value = cn.get("setValue")

            if field and set_value is not None:
                # Direct value assignment (e.g., Notes 10/11/12/14: set pump capacity)
                base_values[field] = int(set_value)

            elif field and additional_value is not None:
                # Additive value (e.g., Note 6: +5000L to terraceTankLitres)
                current = base_values.get(field) or 0
                base_values[field] = int(current + additional_value)

            elif field and field in base_values and isinstance(base_values[field], bool):
                # Boolean override (e.g., Note 4: set automaticSprinkler = true)
                base_values[field] = True

    # Build legacy notes string for backward compat
    notes_parts = []
    for en in evaluated_notes:
        status = "✓ MET" if en.is_met else "✗ NOT MET"
        notes_parts.append(f"Note {en.note_id} [{status}]: {en.description}")
    legacy_notes = " | ".join(notes_parts) if notes_parts else None

    result = FirefightingInstallationRequirement(
        fire_extinguisher=base_values["fireExtinguisher"],
        first_aid_hose_reel=base_values["firstAidHoseReel"],
        wet_riser=base_values["wetRiser"],
        down_comer=base_values["downComer"],
        yard_hydrant=base_values["yardHydrant"],
        automatic_sprinkler=base_values["automaticSprinkler"],
        manual_fire_alarm=base_values["manualFireAlarm"],
        auto_detection_alarm=base_values["autoDetectionAlarm"],
        underground_tank_litres=base_values["undergroundTankLitres"],
        terrace_tank_litres=base_values["terraceTankLitres"],
        underground_pump_lpm=base_values["undergroundPumpLpm"],
        terrace_pump_lpm=base_values["terracePumpLpm"],
        height_tier_label=tier["label"],
        occupancy_label=subdivision or group,
        clause_ref="NBC 2016 Part IV, Table 7",
        notes=legacy_notes,
        evaluated_notes=evaluated_notes,
    )

    return {"result": result}


# ── Orchestrator ───────────────────────────────────────────────────


class NBCCheckResult:
    def __init__(self) -> None:
        self.occupant_load: Optional[OccupantLoadData] = None
        self.exit_capacity: Optional[ExitCapacityData] = None
        self.travel_distance: Optional[TravelDistanceData] = None
        self.firefighting_installations: Optional[FirefightingInstallationRequirement] = None
        self.violations: list[Violation] = []
        self.passed_rules: list[str] = []


def run_nbc_checks(inp: BuildingInput) -> NBCCheckResult:
    result = NBCCheckResult()
    group = inp.occupancy_group
    if not group:
        return result

    # ── Occupant Load ──
    load_result = calculate_occupant_load(group, inp.total_floor_area)
    if load_result:
        result.occupant_load = load_result
        result.passed_rules.append(
            f"Max occupant load: {load_result.max_occupants} persons "
            f"(Group {group}, {load_result.load_factor} m²/person, {inp.total_floor_area}m² area)"
        )

    # ── Exit Capacity (based on calculated max occupant load) ──
    occupant_count_for_exit = load_result.max_occupants if load_result else inp.occupant_count
    capacity_result = calculate_exit_capacity(group, occupant_count_for_exit)
    if capacity_result:
        result.exit_capacity = capacity_result
        result.passed_rules.append(
            f"Exit capacity calculated: stairways {capacity_result.stairway_units} units "
            f"({capacity_result.stairway_width_mm}mm), "
            f"corridors {capacity_result.corridor_units} units "
            f"({capacity_result.corridor_width_mm}mm), "
            f"doors {capacity_result.door_units} units "
            f"({capacity_result.door_width_mm}mm)"
        )

    # ── Travel Distance ──
    if inp.construction_type:
        dist_result = check_travel_distance(
            group,
            inp.construction_type,
            inp.has_sprinklers or False,
            inp.occupancy_subdivision or None,
        )

        if dist_result:
            result.travel_distance = dist_result

            if dist_result.max_distance_m == -1:
                result.violations.append(
                    Violation(
                        rule_id="NBC-TD-NOT-PERMITTED",
                        clause_ref="NBC 2016 Part IV, Table 5",
                        severity="high",
                        description=f"Type 3/4 construction is NOT PERMITTED for Group {group} occupancy.",
                        fix_suggestion=f"Building must use Type 1 or Type 2 (fire-resistive/non-combustible) construction for Group {group}.",
                    )
                )
            elif inp.travel_distance_m and inp.travel_distance_m > dist_result.max_distance_m:
                sprinkler_note = " (with sprinkler bonus)" if dist_result.sprinkler_applied else ""
                fix_extra = "" if inp.has_sprinklers else " Installing sprinklers increases the allowance by 50%."
                result.violations.append(
                    Violation(
                        rule_id="NBC-TD-EXCEED",
                        clause_ref="NBC 2016 Part IV, Table 5",
                        severity="high",
                        description=(
                            f"Travel distance ({inp.travel_distance_m}m) exceeds maximum allowed "
                            f"({dist_result.max_distance_m}m) for Group {group}, "
                            f"{inp.construction_type} construction{sprinkler_note}."
                        ),
                        fix_suggestion=(
                            f"Reduce travel distance to ≤{dist_result.max_distance_m}m, "
                            f"or add additional exits.{fix_extra}"
                        ),
                    )
                )
            else:
                if inp.travel_distance_m:
                    dist_note = f"{inp.travel_distance_m}m ≤ {dist_result.max_distance_m}m max"
                else:
                    dist_note = f"max {dist_result.max_distance_m}m allowed"
                sprinkler_tag = ", sprinklered" if dist_result.sprinkler_applied else ""
                result.passed_rules.append(
                    f"Travel distance OK: {dist_note} "
                    f"(Group {group}, {inp.construction_type}{sprinkler_tag})"
                )

    # ── Firefighting Installations (Table 7) ──
    if inp.building_height > 0:
        # Use max floor area for tier matching; fallback to total_floor_area
        max_floor_area = max(inp.floor_areas) if inp.floor_areas else inp.total_floor_area
        fi_check = check_firefighting_installations(
            group,
            inp.occupancy_subdivision or None,
            inp.building_height,
            floor_area_m2=max_floor_area,
            num_floors=inp.number_of_floors,
            basement_area_m2=inp.basement_area,
        )

        if fi_check.get("violation"):
            result.violations.append(fi_check["violation"])

        if fi_check.get("result"):
            fi_result = fi_check["result"]
            result.firefighting_installations = fi_result

            required_items: list[str] = []
            if fi_result.fire_extinguisher:
                required_items.append("Fire Extinguisher")
            if fi_result.first_aid_hose_reel:
                required_items.append("Hose Reel")
            if fi_result.wet_riser:
                required_items.append("Wet Riser")
            if fi_result.down_comer:
                required_items.append("Down Comer")
            if fi_result.yard_hydrant:
                required_items.append("Yard Hydrant")
            if fi_result.automatic_sprinkler:
                required_items.append("Sprinkler System")
            if fi_result.manual_fire_alarm:
                required_items.append("Manual Fire Alarm")
            if fi_result.auto_detection_alarm:
                required_items.append("Auto Detection & Alarm")

            result.passed_rules.append(
                f"Firefighting installations identified (Table 7, {fi_result.height_tier_label}): "
                + ", ".join(required_items)
            )

    return result
