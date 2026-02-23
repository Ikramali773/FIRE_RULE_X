// src/lib/hazardClassifier.ts
// IS 2190:2024 Annex B (Table 6) — Hazard Type Classification
//
// Determines whether a building is Low, Moderate, or High hazard
// based on building height, occupant count, floor area, and
// quantities of flammable gases/liquids.
//
// Rule: Building is classified at the HIGHEST hazard level where
// ANY single criterion places it.

import type { BuildingInput, HazardType } from '@/types';

interface HazardCriteria {
    buildingHeightM: number;
    occupantCount: number;
    totalFloorAreaM2: number;
    flammableGasesLitres: number;
    flammableLiquidsLitres: number;
}

export function determineHazardType(input: BuildingInput): {
    hazardType: HazardType;
    reasons: string[];
    clauseRef: string;
} {
    const reasons: string[] = [];
    const clauseRef = 'IS 2190:2024, Annex B (Table 6)';

    const criteria: HazardCriteria = {
        buildingHeightM: input.buildingHeight,
        occupantCount: input.occupantCount,
        totalFloorAreaM2: input.totalFloorArea,
        flammableGasesLitres: input.flammableGasesLitres ?? 0,
        flammableLiquidsLitres: input.flammableLiquidsLitres ?? 0,
    };

    // HIGH hazard: any single criterion exceeds high threshold
    if (criteria.buildingHeightM > 15)
        reasons.push(`Building height ${criteria.buildingHeightM}m > 15m`);
    if (criteria.occupantCount > 250)
        reasons.push(`Occupant count ${criteria.occupantCount} > 250`);
    if (criteria.totalFloorAreaM2 > 3000)
        reasons.push(`Total floor area ${criteria.totalFloorAreaM2}m² > 3000m²`);
    if (criteria.flammableGasesLitres > 3000)
        reasons.push(`Flammable gases ${criteria.flammableGasesLitres}L > 3000L`);
    if (criteria.flammableLiquidsLitres > 1000)
        reasons.push(`Flammable liquids ${criteria.flammableLiquidsLitres}L > 1000L`);

    if (reasons.length > 0) {
        return { hazardType: 'high', reasons, clauseRef };
    }

    // MODERATE hazard: any criterion in moderate range
    const moderateReasons: string[] = [];
    if (criteria.occupantCount >= 15 && criteria.occupantCount <= 250)
        moderateReasons.push(`Occupant count ${criteria.occupantCount} (15–250)`);
    if (criteria.totalFloorAreaM2 >= 300 && criteria.totalFloorAreaM2 <= 3000)
        moderateReasons.push(`Floor area ${criteria.totalFloorAreaM2}m² (300–3000m²)`);
    if (criteria.flammableGasesLitres >= 500 && criteria.flammableGasesLitres <= 3000)
        moderateReasons.push(`Flammable gases ${criteria.flammableGasesLitres}L (500–3000L)`);
    if (criteria.flammableLiquidsLitres >= 250 && criteria.flammableLiquidsLitres <= 1000)
        moderateReasons.push(`Flammable liquids ${criteria.flammableLiquidsLitres}L (250–1000L)`);

    if (moderateReasons.length > 0) {
        return { hazardType: 'moderate', reasons: moderateReasons, clauseRef };
    }

    // LOW hazard: default
    return {
        hazardType: 'low',
        reasons: ['All criteria within low hazard thresholds'],
        clauseRef,
    };
}
