# backend/engines/code_engine.py
# Code Engine — National code logic (NBC 2016 + NBCS 2026 tracking)
#
# Evaluates building inputs against national building code requirements.
# Primary source: NBC 2016 Part IV (active calculation logic)
# Secondary source: NBCS 2026 Part F (parallel tracking layer — not replacing NBC)
#
# Software Scope Reference:
#   "Code Engine — evaluates NBC/NBCS logic"
#   "FireRuleX should support both a baseline NBC 2016 library and an NBCS
#    tracking layer, but should not switch live calculation logic to NBCS
#    nationally until the applicable state or approving authority clearly
#    adopts and enforces it."

from __future__ import annotations

from typing import Optional

from models import (
    BuildingInput,
    NBCComplianceData,
    Violation,
)
from nbc_checker import run_nbc_checks
from nbcs_applicability import check_nbcs_applicability
from nbcs_checker import run_nbcs_firefighting_check, run_nbcs_tables_check
from models import (
    NBCSFirefightingInstallationRequirement,
    NBCSOccupantLoadData,
    NBCSExitCapacityData,
    NBCSTravelDistanceData,
)


class CodeEngineResult:
    """Result from the Code Engine evaluation."""

    def __init__(self) -> None:
        self.nbc_compliance: Optional[NBCComplianceData] = None
        self.nbcs_applicability: Optional[dict] = None
        self.nbcs_firefighting_installations: Optional[NBCSFirefightingInstallationRequirement] = None
        self.nbcs_occupant_load: Optional[NBCSOccupantLoadData] = None
        self.nbcs_exit_capacity: Optional[NBCSExitCapacityData] = None
        self.nbcs_travel_distance: Optional[NBCSTravelDistanceData] = None
        self.violations: list[Violation] = []
        self.passed_rules: list[str] = []


def evaluate(inp: BuildingInput) -> CodeEngineResult:
    """Evaluate building inputs against national code requirements.

    Runs:
      1. NBC 2016 Part IV checks (occupant load, exit capacity, travel
         distance, firefighting installations, detector counts)
      2. NBCS 2026 Part F applicability check (parallel tracking layer)

    Args:
        inp: Building input data with occupancy group, height, areas, etc.

    Returns:
        CodeEngineResult with NBC compliance data, NBCS applicability,
        violations, and passed rules.
    """
    result = CodeEngineResult()

    # ── NBC 2016 Part IV checks ──
    if inp.occupancy_group:
        nbc_result = run_nbc_checks(inp)

        result.violations.extend(nbc_result.violations)
        result.passed_rules.extend(nbc_result.passed_rules)

        result.nbc_compliance = NBCComplianceData(
            occupant_load=nbc_result.occupant_load,
            exit_capacity=nbc_result.exit_capacity,
            travel_distance=nbc_result.travel_distance,
            firefighting_installations=nbc_result.firefighting_installations,
            detector_counts=nbc_result.detector_counts,
        )
        
        # ── NBCS 2026 Part F Tables 7A-7J (Tracking layer) ──
        result.nbcs_firefighting_installations = run_nbcs_firefighting_check(
            inp, nbc_active_result=nbc_result.firefighting_installations
        )
        
        occ_data, cap_data, td_data = run_nbcs_tables_check(inp)
        result.nbcs_occupant_load = occ_data
        result.nbcs_exit_capacity = cap_data
        result.nbcs_travel_distance = td_data

    # ── NBCS 2026 Part F applicability check ──
    if inp.occupancy_group:
        max_floor_area = max(inp.floor_areas) if inp.floor_areas else inp.total_floor_area
        nbcs_result = check_nbcs_applicability(
            occupancy_group=inp.occupancy_group,
            occupancy_subdivision=inp.occupancy_subdivision,
            building_height=inp.building_height,
            max_floor_area=max_floor_area,
        )
        result.nbcs_applicability = nbcs_result

        if nbcs_result["is_applicable"]:
            result.passed_rules.append(
                f"NBCS 2026 Part F: Provisions ARE applicable "
                f"({nbcs_result['reason']}). "
                f"Ref: {nbcs_result['clause_ref']}"
            )
        else:
            result.passed_rules.append(
                f"NBCS 2026 Part F: Provisions are NOT applicable "
                f"({nbcs_result['reason']}). "
                f"Ref: {nbcs_result['clause_ref']}"
            )

    return result
