# backend/engines/standards_engine.py
# Standards Engine — BIS technical standards evaluation
#
# Evaluates which BIS fire-fighting standards become relevant based on
# code-level findings from the Code Engine.
#
# Software Scope Reference:
#   "Standards Engine — evaluates BIS technical standards relevance
#    and high-level outputs."
#   "Once code logic determines what systems are needed, the standards
#    layer should explain the technical rule books that become active
#    and generate high-level design guidance."
#
# Priority standards (Phase 3 scope):
#   IS 3844  — Internal hydrants and hose reels
#   IS 13039 — External hydrants
#   IS 9668  — Water supply for fire fighting
#   IS 15301 — Fire fighting pumps
#   IS 15105 — Sprinkler systems
#   IS 2189  — Fire detection and alarm
#   IS 15908 — Control and indicating equipment
#   IS 2190  — Fire extinguishers
#
# Current status: Stub implementation. Standards logic will be expanded
# in Increment 3 to produce system cards with status, triggered reason,
# relevant standards, missing inputs, and suggested next design steps.

from __future__ import annotations

from typing import Optional

from models import BuildingInput, Violation, SystemCard, NBCComplianceData


class StandardsEngineResult:
    """Result from the Standards Engine evaluation."""

    def __init__(self) -> None:
        self.system_cards: list[SystemCard] = []
        self.violations: list[Violation] = []
        self.passed_rules: list[str] = []


def evaluate(
    inp: BuildingInput,
    code_findings: Optional[dict] = None,
) -> StandardsEngineResult:
    """Evaluate which BIS standards are triggered by code-level findings.

    Args:
        inp: Building input data.
        code_findings: Output from Code Engine (firefighting installation
            requirements, occupancy data, etc.)

    Returns:
        StandardsEngineResult with system cards and any violations.
    """
    result = StandardsEngineResult()

    if not code_findings or "nbc_compliance" not in code_findings:
        return result

    nbc: NBCComplianceData = code_findings["nbc_compliance"]
    fi = nbc.firefighting_installations
    if not fi:
        return result

    # Extinguishers
    if fi.fire_extinguisher:
        result.system_cards.append(SystemCard(
            systemName="Fire Extinguishers",
            status="REQUIRED",
            triggeredBy="NBC 2016 Part IV requirement for this occupancy and height.",
            relevantStandards=["IS 2190:2024"],
            missingInputs=["Detailed hazard classification (Light/Ordinary/High)", "Floor plan layout"],
            nextSteps=["Determine extinguisher types based on hazard", "Calculate quantities based on area"]
        ))

    # Internal Hydrants / Hose Reels
    if fi.first_aid_hose_reel or fi.wet_riser or fi.down_comer:
        triggered = []
        if fi.first_aid_hose_reel: triggered.append("Hose Reel")
        if fi.wet_riser: triggered.append("Wet Riser")
        if fi.down_comer: triggered.append("Down Comer")
        
        result.system_cards.append(SystemCard(
            systemName="Internal Hydrants & Hose Reels",
            status="REQUIRED",
            triggeredBy=f"NBC 2016 requires: {', '.join(triggered)}.",
            relevantStandards=["IS 3844"],
            missingInputs=["Hydrant location map", "Pipe routing plan"],
            nextSteps=["Design pipe sizing per IS 3844", "Locate hydrants to meet coverage radius"]
        ))

    # External Hydrants
    if fi.yard_hydrant:
        result.system_cards.append(SystemCard(
            systemName="External (Yard) Hydrants",
            status="REQUIRED",
            triggeredBy="NBC 2016 requires Yard Hydrants.",
            relevantStandards=["IS 13039"],
            missingInputs=["Site plan", "External perimeter distances"],
            nextSteps=["Plot yard hydrants around building perimeter", "Ensure ring main design"]
        ))

    # Water Supply & Pumps
    if fi.underground_tank_litres or fi.terrace_tank_litres or fi.underground_pump_lpm or fi.terrace_pump_lpm:
        result.system_cards.append(SystemCard(
            systemName="Water Supply & Fire Pumps",
            status="REQUIRED",
            triggeredBy="NBC 2016 prescribes specific water storage and pumping capacities.",
            relevantStandards=["IS 9668", "IS 15301"],
            missingInputs=["Pump room layout", "Tank locations"],
            nextSteps=["Verify IS 15301 pump specifications (head, power)", "Design suction and delivery manifolds"]
        ))

    # Sprinkler System
    if fi.automatic_sprinkler:
        result.system_cards.append(SystemCard(
            systemName="Automatic Sprinkler System",
            status="REQUIRED",
            triggeredBy="NBC 2016 requires Automatic Sprinklers.",
            relevantStandards=["IS 15105", "IS 9972"],
            missingInputs=["Ceiling plan", "Obstruction details"],
            nextSteps=["Select sprinkler heads per IS 9972", "Design hydraulic calculations per IS 15105"]
        ))

    # Fire Detection and Alarm
    if fi.auto_detection_alarm or fi.manual_fire_alarm:
        triggered = []
        if fi.auto_detection_alarm: triggered.append("Auto Detection")
        if fi.manual_fire_alarm: triggered.append("Manual Alarm")
        
        result.system_cards.append(SystemCard(
            systemName="Fire Detection & Alarm",
            status="REQUIRED",
            triggeredBy=f"NBC 2016 requires: {', '.join(triggered)}.",
            relevantStandards=["IS 2189", "IS 15908"],
            missingInputs=["Detector spacing constraints", "Panel location"],
            nextSteps=["Design detector loops per IS 2189", "Select control panel per IS 15908"]
        ))

    return result
