// src/lib/classAChecker.ts
// IS 2190:2024 Table 1 — Class A Fire Extinguisher Requirements
//
// Calculates the required number and minimum rating of Class A
// extinguishers per floor based on hazard type and floor area.
//
// Table 1 values:
//   Low hazard:      2A rating, max 300 m²/extinguisher
//   Moderate hazard: 3A rating, max 150 m²/extinguisher
//   High hazard:     4A rating, max 100 m²/extinguisher
//
// Additional rules (cl 7.2.2):
//   - Minimum 2 extinguishers per floor
//   - Exception: floor area < 100 m² may have 1 extinguisher

import type { HazardType, ExtinguisherRequirement, Violation } from '@/types';

const CLASS_A_TABLE: Record<HazardType, { rating: string; maxAreaM2: number }> = {
    low: { rating: '2A', maxAreaM2: 300 },
    moderate: { rating: '3A', maxAreaM2: 150 },
    high: { rating: '4A', maxAreaM2: 100 },
};

export interface ClassAResult {
    requirements: ExtinguisherRequirement[];
    violations: Violation[];
}

export function checkClassA(
    floorAreas: number[],
    hazardType: HazardType
): ClassAResult {
    const { rating, maxAreaM2 } = CLASS_A_TABLE[hazardType];
    const requirements: ExtinguisherRequirement[] = [];
    const violations: Violation[] = [];

    floorAreas.forEach((area, idx) => {
        const floorLabel = idx === 0 ? 'Ground Floor' : `Floor ${idx}`;
        const calculated = Math.ceil(area / maxAreaM2);
        const minimum = area < 100 ? 1 : 2;                    // cl 7.2.2
        const countRequired = Math.max(calculated, minimum);

        requirements.push({
            fireClass: 'A',
            minimumRating: rating,
            countRequired,
            perFloor: true,
            clauseRef: `IS 2190:2024, Table 1 (${hazardType} hazard), cl 7.2.1–7.2.2`,
            note: `${floorLabel}: area ${area}m² → ${calculated} by area, min ${minimum} by rule → ${countRequired} required`,
        });
    });

    return { requirements, violations };
}
