// src/lib/ruleEngine.ts
// FireRuleX Rule Engine — Main Orchestrator
//
// Accepts a BuildingInput and evaluates all IS 2190:2024 fire
// extinguisher rules applicable to commercial buildings.
//
// Evaluation flow:
//   1. Determine hazard type (Annex B, Table 6)
//   2. Calculate Class A requirements (Table 1) — always required
//   3. Calculate Class B/C requirements (Table 2) — if flammable liquids
//   4. Calculate Class F requirements (Table 3) — if kitchen
//   5. Check electrical hazard (cl 7.5) — if electrical panels
//   6. Flag combustible metals (cl 7.6) — requires professional
//   7. Calculate compliance score and grade

import type { BuildingInput, AnalysisResult, Violation, ExtinguisherRequirement } from '@/types';
import { determineHazardType } from './hazardClassifier';
import { checkClassA } from './classAChecker';
import { checkClassBC } from './classBCChecker';
import { checkClassF } from './classFChecker';
import { checkElectrical } from './electricalChecker';

export function runRuleEngine(input: BuildingInput): AnalysisResult {
    const violations: Violation[] = [];
    const passedRules: string[] = [];
    const allRequirements: ExtinguisherRequirement[] = [];

    // Step 1: Determine hazard type
    const { hazardType } = determineHazardType(input);

    // Step 2: Class A requirements (all buildings with combustible contents)
    const { requirements: classAReqs } = checkClassA(input.floorAreas, hazardType);
    allRequirements.push(...classAReqs);
    passedRules.push(`Class A extinguishers required: ${classAReqs.length} floor(s) assessed`);

    // Step 3: Class B/C if flammable liquids present
    if (input.hasFlammableLiquids) {
        const classBReqs = checkClassBC(input.floorAreas, hazardType);
        allRequirements.push(...classBReqs);
        passedRules.push('Class B/C extinguishers: flammable liquid hazard detected and addressed');
    }

    // Step 4: Class F if kitchen present
    if (input.hasKitchen) {
        if (!input.cookingAreaM2 || input.cookingAreaM2 <= 0) {
            violations.push({
                ruleId: 'F-MISSING-AREA',
                clauseRef: 'IS 2190:2024, Table 3, cl 7.7',
                severity: 'medium',
                description: 'Kitchen detected but cooking area size not provided. Cannot calculate Class F extinguisher requirement.',
                fixSuggestion: 'Provide the cooking appliance area (m²) to determine the correct Class F extinguisher rating.',
            });
        } else {
            const classFReq = checkClassF(input.cookingAreaM2);
            allRequirements.push(classFReq);
            passedRules.push('Class F extinguisher: kitchen cooking area assessed');
        }
    }

    // Step 5: Electrical hazard
    if (input.hasElectricalHazards) {
        const elecReq = checkElectrical();
        allRequirements.push(elecReq);
        passedRules.push('Electrical hazard: CO2/clean agent requirement identified');
    }

    // Step 6: Combustible metals — cannot auto-calculate
    if (input.hasCombustibleMetals) {
        violations.push({
            ruleId: 'D-PROFESSIONAL',
            clauseRef: 'IS 2190:2024, cl 7.6',
            severity: 'high',
            description: 'Combustible metal hazard detected (Class D). Cannot auto-calculate — requires fire professional assessment.',
            fixSuggestion: 'Engage a qualified fire safety professional to determine Class D extinguisher type, size, and number per IS 2190:2024 cl 7.6.3.',
        });
    }

    // Step 7: Compliance score
    //   Penalty-based scoring:
    //     High violation:   -20 points
    //     Medium violation: -10 points
    //     Low violation:    -5  points
    const penaltyPoints = violations.reduce((sum, v) => {
        return sum + (v.severity === 'high' ? 20 : v.severity === 'medium' ? 10 : 5);
    }, 0);
    const rawScore = Math.max(0, 100 - penaltyPoints);

    //   Grade thresholds:
    //     A (90-100):  NOC-ready
    //     B (75-89):   Minor fixes needed
    //     C (60-74):   Significant violations
    //     D (<60):     Major redesign required
    const grade = rawScore >= 90 ? 'A' as const : rawScore >= 75 ? 'B' as const : rawScore >= 60 ? 'C' as const : 'D' as const;
    const nocReadiness = rawScore >= 90 ? 'READY' as const : rawScore >= 60 ? 'CONDITIONAL' as const : 'NOT_READY' as const;

    return {
        hazardType,
        complianceScore: rawScore,
        grade,
        nocReadiness,
        requiredExtinguishers: allRequirements,
        violations,
        passedRules,
        analysisMethod: 'structured_input',
    };
}
