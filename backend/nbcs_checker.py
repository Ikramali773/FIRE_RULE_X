# backend/nbcs_checker.py
# NBCS 2026 Part F — Tracking Checker
#
# Evaluates building inputs against NBCS 2026 Tables 7A-7J for firefighting installations.
# This runs as a parallel tracking layer and does NOT replace the active NBC 2016 logic.

import json
from pathlib import Path
from typing import Optional

from models import (
    BuildingInput,
    FirefightingInstallationRequirement,
    NBCSFirefightingInstallationRequirement,
    NBCSOccupantLoadData,
    NBCSExitCapacityData,
    NBCSTravelDistanceData,
)
from building_type_mapper import get_mapping

_DATA_PATH = Path(__file__).parent / "data" / "nbcs_firefighting_installations.json"
with open(_DATA_PATH, "r", encoding="utf-8") as f:
    _NBCS_DATA = json.load(f)

def run_nbcs_firefighting_check(
    inp: BuildingInput,
    nbc_active_result: Optional[FirefightingInstallationRequirement] = None
) -> Optional[NBCSFirefightingInstallationRequirement]:
    """
    Evaluate NBCS 2026 Part F Tables 7A-7J to produce a tracking result.
    """
    if not inp.building_type:
        return None
        
    mapping = get_mapping(inp.building_type)
    if not mapping:
        return None
        
    group = mapping.get("group")
    nbcs_subdivision = mapping.get("nbcs_subdivision")
    
    if not group or not nbcs_subdivision:
        return None
        
    # Find matching table
    matched_table = None
    table_key = None
    for tk, table_data in _NBCS_DATA.get("tables", {}).items():
        if table_data.get("occupancy_group") == group:
            matched_table = table_data
            table_key = tk
            break
            
    if not matched_table:
        return None
        
    # Find matching subdivision
    subdiv_data = matched_table.get("subdivisions", {}).get(nbcs_subdivision)
    if not subdiv_data:
        # Fallback to group level if no subdivision specific table (e.g., Group B, D, H, J)
        # Try finding a single subdivision key if that's all that exists
        subdiv_keys = list(matched_table.get("subdivisions", {}).keys())
        if len(subdiv_keys) == 1 and subdiv_keys[0] == group:
            subdiv_data = matched_table.get("subdivisions", {})[group]
        else:
            return None
            
    height = inp.building_height
    area = inp.total_floor_area if inp.number_of_floors == 1 else max(inp.floor_areas) if inp.floor_areas else inp.total_floor_area
    
    # Check self-certification eligibility
    self_cert_eligible = False
    thresholds = subdiv_data.get("self_cert_threshold")
    if thresholds:
        max_a = thresholds.get("max_area_m2")
        max_h = thresholds.get("max_height_m")
        if max_a and max_h:
            if area <= max_a and height <= max_h:
                self_cert_eligible = True

    # Find matching tier
    matched_tier = None
    for tier in subdiv_data.get("tiers", []):
        h_min = tier.get("height_min_m")
        h_max = tier.get("height_max_m")
        a_min = tier.get("area_min_m2")
        a_max = tier.get("area_max_m2")
        
        height_match = True
        if h_min is not None and height < h_min:
            height_match = False
        if h_max is not None and height > h_max:
            height_match = False
            
        area_match = True
        if a_min is not None and area < a_min:
            area_match = False
        if a_max is not None and area > a_max:
            area_match = False
            
        if height_match and area_match:
            matched_tier = tier
            break
            
    if not matched_tier:
        return None

    inst = matched_tier.get("installations", {})
    
    # Conditional logic based on notes
    protection_level = matched_tier.get("protection_level", "UNKNOWN")
    triggered_notes = []
    
    # 1. Kitchen -> HL-2 for A-I, A-II
    if inp.has_kitchen and group == "A" and protection_level == "HL-1":
        protection_level = "HL-2"
        triggered_notes.append("Note 1: Kitchen presence upgrades protection level to HL-2")
        
    # 2. EV Parking -> CL-5 (very common across all tables)
    if inp.has_ev_parking:
        if protection_level.startswith("HL") or protection_level in ["CL-2", "CL-3", "CL-4"]:
            protection_level = "CL-5"
            inst["automatic_sprinkler"] = True
            triggered_notes.append("EV Parking detected: Protection level upgraded to CL-5 with automatic sprinklers")

    differs_from_nbc = False
    if nbc_active_result:
        # Check if basic requirements differ
        if (inst.get("automatic_sprinkler") != nbc_active_result.automatic_sprinkler or
            inst.get("yard_hydrant") != nbc_active_result.yard_hydrant or
            inst.get("wet_riser") != nbc_active_result.wet_riser):
            differs_from_nbc = True

    # If self-certification is eligible, we still return the required installations
    # but the protection level can be flagged.
    if self_cert_eligible:
        protection_level = "SELF-CERT"

    return NBCSFirefightingInstallationRequirement(
        fireExtinguisher=inst.get("fire_extinguisher", False),
        firstAidHoseReel=inst.get("first_aid_hose_reel", False),
        wetRiser=inst.get("wet_riser", False),
        downComer=inst.get("down_comer", False),
        yardHydrant=inst.get("yard_hydrant", False),
        automaticSprinkler=inst.get("automatic_sprinkler", False),
        autoDetectionAlarm=inst.get("auto_detection_alarm", False),
        publicAddressVoiceEvacuation=inst.get("public_address_voice_evacuation", False),
        protectionLevel=protection_level,
        nbcsTableRef=f"Table {table_key}",
        occupancyLabel=subdiv_data.get("label", group),
        clauseRef=matched_table.get("clause_refs", ""),
        selfCertificationEligible=self_cert_eligible,
        triggeredNotes=triggered_notes,
        differsFromNbc=differs_from_nbc
    )


_TABLES_DATA_PATH = Path(__file__).parent / "data" / "nbcs_tables_data.json"
with open(_TABLES_DATA_PATH, "r", encoding="utf-8") as f:
    _NBCS_TABLES_DATA = json.load(f)

def run_nbcs_tables_check(inp: BuildingInput) -> tuple[Optional[NBCSOccupantLoadData], Optional[NBCSExitCapacityData], Optional[NBCSTravelDistanceData]]:
    """
    Evaluate NBCS 2026 Tables 2, 3, 4 for tracking metrics.
    """
    if not inp.building_type:
        return None, None, None

    mapping = get_mapping(inp.building_type)
    if not mapping:
        return None, None, None

    group = mapping.get("group")
    subdiv = mapping.get("nbcs_subdivision")
    if not group:
        return None, None, None

    # 1. Occupant Load
    occ_data = None
    occ_config = _NBCS_TABLES_DATA.get("occupantLoad", {}).get(group)
    if occ_config:
        if subdiv in occ_config:
            occ_config = occ_config[subdiv]
        elif "default" in occ_config:
            occ_config = occ_config["default"]
            
        area = inp.total_floor_area
        factor_net = occ_config.get("net_m2_per_person")
        factor_gross = occ_config.get("gross_m2_per_person")
        
        # Calculate using the best available factor (gross preferred if we don't know net vs gross split)
        factor = factor_gross or factor_net
        total_occ = int(area / factor) if factor else 0
        
        occ_data = NBCSOccupantLoadData(
            totalOccupants=total_occ,
            loadFactorNet=factor_net,
            loadFactorGross=factor_gross,
        )
        
    # 2. Exit Capacity
    cap_data = None
    cap_config = _NBCS_TABLES_DATA.get("capacityFactors", {}).get(group)
    if cap_config:
        stairway_mm = cap_config.get("stairways_mm", 10.0)
        level_mm = cap_config.get("level_ramps_mm", 6.5)
        
        # Estimate required width for the max floor occupants
        # We need the floor occupants based on NBCS, but we can reuse the max floor area and factor
        max_floor_area = max(inp.floor_areas) if inp.floor_areas else inp.total_floor_area
        factor = 12.5 # default safe fallback
        if occ_data and (occ_data.load_factor_gross or occ_data.load_factor_net):
            factor = occ_data.load_factor_gross or occ_data.load_factor_net
            
        max_floor_occ = int(max_floor_area / factor)
        
        dead_end = _NBCS_TABLES_DATA.get("deadEndCorridorLimit", {}).get(group, 15.0)
        
        cap_data = NBCSExitCapacityData(
            stairwayMmPerPerson=stairway_mm,
            levelMmPerPerson=level_mm,
            maxStairwayWidthMm=max_floor_occ * stairway_mm,
            maxLevelWidthMm=max_floor_occ * level_mm,
            deadEndLimitM=dead_end
        )

    # 3. Travel Distance
    td_data = None
    td_config = _NBCS_TABLES_DATA.get("travelDistance", {}).get(group)
    if td_config:
        if subdiv in _NBCS_TABLES_DATA.get("travelDistance", {}):
            td_config = _NBCS_TABLES_DATA.get("travelDistance", {})[subdiv]
            
        is_sp = True # If we don't know, assume better condition to not falsely alarm tracking
        is_type_3_4 = inp.construction_type in ["type3", "type4"]
        
        if is_type_3_4:
            dist = td_config.get("type_3_4")
        else:
            dist = td_config.get("sp_1_2") if is_sp else td_config.get("unsp_1_2")
            
        td_data = NBCSTravelDistanceData(
            maxDistanceM=dist
        )

    return occ_data, cap_data, td_data
