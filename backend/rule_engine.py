# backend/rule_engine.py
# FireRuleX Rule Engine — Main Orchestrator
#
# Accepts BuildingInput and evaluates all fire safety rules:
#   IS 2190:2024, NBC 2016 Part IV, NBCS 2026 Part F (tracking layer)
#
# Architecture: Three-layer compliance stack (Software Scope Phase 1)
#   1. Code Engine — NBC/NBCS national code logic
#   2. Standards Engine — BIS technical standards evaluation
#   3. Jurisdiction Engine — State/local approval overlay
#
# This module orchestrates all three engines and aggregates their
# results into a single AnalysisResult.

from models import (
    BuildingInput,
    AnalysisResult,
    Violation,
    ExtinguisherRequirement,
    NBCComplianceData,
    NBCSApplicabilityResult,
)
from hazard_classifier import determine_hazard_type
from class_a_checker import check_class_a
from class_bc_checker import check_class_bc
from class_f_checker import check_class_f
from electrical_checker import check_electrical
from engines import code_engine, standards_engine, jurisdiction_engine


def run_rule_engine(inp: BuildingInput) -> AnalysisResult:
    violations: list[Violation] = []
    passed_rules: list[str] = []
    all_requirements: list[ExtinguisherRequirement] = []
    nbc_compliance: NBCComplianceData | None = None

    # ── IS 2190:2024 — Fire Extinguisher Requirements ──

    # Step 1: Determine hazard type
    hazard_result = determine_hazard_type(inp)
    hazard_type = hazard_result["hazard_type"]

    # Step 2: Class A requirements
    class_a = check_class_a(inp.floor_areas, hazard_type)
    all_requirements.extend(class_a["requirements"])
    passed_rules.append(f"Class A extinguishers required: {len(class_a['requirements'])} floor(s) assessed")

    # Step 3: Class B/C if flammable liquids present
    if inp.has_flammable_liquids:
        class_b_reqs = check_class_bc(inp.floor_areas, hazard_type)
        all_requirements.extend(class_b_reqs)
        passed_rules.append("Class B/C extinguishers: flammable liquid hazard detected and addressed")

    # Step 4: Class F if kitchen present
    if inp.has_kitchen:
        if not inp.cooking_area_m2 or inp.cooking_area_m2 <= 0:
            violations.append(
                Violation(
                    rule_id="F-MISSING-AREA",
                    clause_ref="IS 2190:2024, Table 3, cl 7.7",
                    severity="medium",
                    description="Kitchen detected but cooking area size not provided. Cannot calculate Class F extinguisher requirement.",
                    fix_suggestion="Provide the cooking appliance area (m²) to determine the correct Class F extinguisher rating.",
                )
            )
        else:
            class_f_req = check_class_f(inp.cooking_area_m2)
            all_requirements.append(class_f_req)
            passed_rules.append("Class F extinguisher: kitchen cooking area assessed")

    # Step 5: Electrical hazard
    if inp.has_electrical_hazards:
        elec_req = check_electrical()
        all_requirements.append(elec_req)
        passed_rules.append("Electrical hazard: CO2/clean agent requirement identified")

    # Step 6: Combustible metals — cannot auto-calculate
    if inp.has_combustible_metals:
        violations.append(
            Violation(
                rule_id="D-PROFESSIONAL",
                clause_ref="IS 2190:2024, cl 7.6",
                severity="high",
                description="Combustible metal hazard detected (Class D). Cannot auto-calculate — requires fire professional assessment.",
                fix_suggestion="Engage a qualified fire safety professional to determine Class D extinguisher type, size, and number per IS 2190:2024 cl 7.6.3.",
            )
        )

    # ── Engine Layer 1: Code Engine (NBC 2016 + NBCS 2026 tracking) ──

    code_result = code_engine.evaluate(inp)

    violations.extend(code_result.violations)
    passed_rules.extend(code_result.passed_rules)

    if code_result.nbc_compliance:
        nbc_compliance = code_result.nbc_compliance

        # Attach NBCS applicability result to NBC compliance data
        if code_result.nbcs_applicability:
            thresholds = code_result.nbcs_applicability.get("thresholds") or {}
            nbc_compliance.nbcs_applicability = NBCSApplicabilityResult(
                is_applicable=code_result.nbcs_applicability["is_applicable"],
                reason=code_result.nbcs_applicability["reason"],
                clause_ref=code_result.nbcs_applicability["clause_ref"],
                occupancy_label=code_result.nbcs_applicability["occupancy_label"],
                height_threshold_m=thresholds.get("height_threshold_m"),
                area_threshold_m2=thresholds.get("area_threshold_m2"),
            )

    # ── Engine Layer 2: Standards Engine (BIS standards — stub) ──

    _standards_result = standards_engine.evaluate(
        inp,
        code_findings={"nbc_compliance": nbc_compliance},
    )
    # Standards violations and passed_rules will be merged here
    # once the engine is implemented in Increment 3.

    # ── Engine Layer 3: Jurisdiction Engine (State overlay — stub) ──

    _jurisdiction_result = jurisdiction_engine.evaluate(
        inp,
        code_findings={"nbc_compliance": nbc_compliance},
    )
    # Jurisdiction violations will be merged here once the engine
    # is implemented in Phase 4.

    # ── Compliance Scoring ──

    penalty_points = sum(
        20 if v.severity == "high" else (10 if v.severity == "medium" else 5)
        for v in violations
    )
    raw_score = max(0, 100 - penalty_points)

    grade = "A" if raw_score >= 90 else ("B" if raw_score >= 75 else ("C" if raw_score >= 60 else "D"))
    noc_readiness = "READY" if raw_score >= 90 else ("CONDITIONAL" if raw_score >= 60 else "NOT_READY")

    return AnalysisResult(
        hazard_type=hazard_type,
        compliance_score=raw_score,
        grade=grade,
        noc_readiness=noc_readiness,
        required_extinguishers=all_requirements,
        violations=violations,
        passed_rules=passed_rules,
        analysis_method="structured_input",
        nbc_compliance=nbc_compliance,
    )
