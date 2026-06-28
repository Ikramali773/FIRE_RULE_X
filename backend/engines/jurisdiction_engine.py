# backend/engines/jurisdiction_engine.py
# Jurisdiction Engine — State/local approval overlay
#
# Overlays state-specific fire NOC requirements on top of national code
# and BIS standards findings.
#
# Software Scope Reference:
#   "Jurisdiction Engine — overlays state/local approval logic."
#   "Fire NOC enforcement in India is ultimately state- and
#    authority-driven. State fire departments, fire prevention acts,
#    fire prevention rules, and local building bye-laws determine
#    document requirements, process triggers, renewals, local
#    exemptions, and practical approval workflows."
#
# Phase 4 scope — Initial state profiles:
#   Maharashtra, Delhi, Karnataka, Telangana, Gujarat
#
# Current status: Stub implementation. Jurisdiction logic will be
# expanded in Phase 4 to provide:
#   - Fire NOC applicability per state
#   - Required documents per authority
#   - Local rule overlays
#   - Renewal/workflow guidance
#   - Portal/application routes

from __future__ import annotations

from typing import Optional

from models import BuildingInput, Violation


class JurisdictionEngineResult:
    """Result from the Jurisdiction Engine evaluation."""

    def __init__(self) -> None:
        self.noc_likely_required: Optional[bool] = None
        self.relevant_authority: Optional[str] = None
        self.required_documents: list[str] = []
        self.local_overlays: list[str] = []
        self.manual_confirmation_items: list[str] = []
        self.violations: list[Violation] = []
        self.passed_rules: list[str] = []


def evaluate(
    inp: BuildingInput,
    code_findings: Optional[dict] = None,
    standards_findings: Optional[dict] = None,
) -> JurisdictionEngineResult:
    """Evaluate state/local jurisdiction requirements.

    Args:
        inp: Building input data (must include state field).
        code_findings: Output from Code Engine.
        standards_findings: Output from Standards Engine.

    Returns:
        JurisdictionEngineResult with NOC guidance and any violations.
    """
    result = JurisdictionEngineResult()

    # Stub: Jurisdiction engine will be expanded in Phase 4 / future
    # increment to provide state-specific Fire NOC guidance.

    return result
