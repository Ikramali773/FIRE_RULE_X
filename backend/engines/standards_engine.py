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

from models import BuildingInput, Violation


class StandardsEngineResult:
    """Result from the Standards Engine evaluation."""

    def __init__(self) -> None:
        self.system_cards: list[dict] = []
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

    # Stub: Standards engine will be expanded in Phase 3 / Increment 3
    # to produce system cards for hydrant, sprinkler, alarm, and
    # extinguisher modules per Software Scope Modules 3.1–3.4.

    return result
