// src/lib/classBCChecker.ts
// IS 2190:2024 Table 2 — Class B/C Fire Extinguisher Requirements
//
// For flammable liquid (Class B) and flammable gas (Class C) hazards
// with shallow depth (≤6mm).
//
// Table 2 values:
//   Low hazard:      55B rating, max 300 m²/extinguisher
//   Moderate hazard: 144B rating, max 150 m²/extinguisher
//   High hazard:     233B rating, max 100 m²/extinguisher
//
// Additional rules:
//   - Min 2 per floor (exception: <100m² → 1) per cl 7.3.4
//   - ADDITIONAL to Class A complement (cl 7.1.6) — never replaces Class A
//   - Two lower-rated extinguishers shall NOT combine to meet Table 2
//     (exception: up to 3 AFFF may combine) per cl 7.3.2

import type { HazardType, ExtinguisherRequirement } from '@/types';

const CLASS_B_TABLE: Record<HazardType, { rating: string; maxAreaM2: number }> = {
    low: { rating: '55B', maxAreaM2: 300 },
    moderate: { rating: '144B', maxAreaM2: 150 },
    high: { rating: '233B', maxAreaM2: 100 },
};

export function checkClassBC(
    floorAreas: number[],
    hazardType: HazardType
): ExtinguisherRequirement[] {
    const { rating, maxAreaM2 } = CLASS_B_TABLE[hazardType];
    return floorAreas.map((area, idx) => {
        const floorLabel = idx === 0 ? 'Ground Floor' : `Floor ${idx}`;
        const calculated = Math.ceil(area / maxAreaM2);
        const minimum = area < 100 ? 1 : 2;
        return {
            fireClass: 'B' as const,
            minimumRating: rating,
            countRequired: Math.max(calculated, minimum),
            perFloor: true,
            clauseRef: `IS 2190:2024, Table 2 (${hazardType} hazard), cl 7.3.1–7.3.4`,
            note: `Additional to Class A complement. ${floorLabel}: area ${area}m²`,
        };
    });
}
