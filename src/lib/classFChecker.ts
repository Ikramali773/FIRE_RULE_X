// src/lib/classFChecker.ts
// IS 2190:2024 Table 3 — Class F Fire Extinguisher Requirements
//
// For cooking media fires (vegetable or animal oils/fats) in
// cooking appliances. Also called kitchen fire.
//
// Table 3 values (cooking area → minimum rating):
//   ≤ 0.03 m² → 5F
//   ≤ 0.05 m² → 15F
//   ≤ 0.08 m² → 25F
//   ≤ 0.25 m² → 75F
//   > 0.25 m² → multiple 75F (ceil(area / 0.25))
//
// Additional rules:
//   - Travel distance ≤ 10m per cl 7.7.2
//   - Required for ANY cooking appliance area per cl 7.7.1

import type { ExtinguisherRequirement } from '@/types';

const CLASS_F_TABLE = [
    { maxCookingAreaM2: 0.03, rating: '5F' },
    { maxCookingAreaM2: 0.05, rating: '15F' },
    { maxCookingAreaM2: 0.08, rating: '25F' },
    { maxCookingAreaM2: 0.25, rating: '75F' },
] as const;

export function checkClassF(cookingAreaM2: number): ExtinguisherRequirement {
    const entry = CLASS_F_TABLE.find((r) => cookingAreaM2 <= r.maxCookingAreaM2);
    if (entry) {
        return {
            fireClass: 'F' as const,
            minimumRating: entry.rating,
            countRequired: 1,
            perFloor: false,
            clauseRef: 'IS 2190:2024, Table 3, cl 7.7',
            note: `Kitchen cooking area: ${cookingAreaM2}m²`,
        };
    }
    // Area > 0.25 m²: multiple 75F extinguishers
    const count = Math.ceil(cookingAreaM2 / 0.25);
    return {
        fireClass: 'F' as const,
        minimumRating: '75F',
        countRequired: count,
        perFloor: false,
        clauseRef: 'IS 2190:2024, Table 3, cl 7.7',
        note: `Large kitchen: ${cookingAreaM2}m² → ${count} × 75F extinguishers`,
    };
}
