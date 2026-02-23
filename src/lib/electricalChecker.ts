// src/lib/electricalChecker.ts
// IS 2190:2024 cl 7.5 + 6.3.7 — Electrical Hazard Requirements
//
// For areas with energized electrical equipment (server rooms,
// UPS rooms, electrical panels, switch gear).
//
// Suitable types: CO2, ABC powder, clean agent, water-mist
// Prohibited types: Water, Foam (cl 6.3.7)
// Note: CO2 with metal horns NOT safe for energized electrical equipment

import type { ExtinguisherRequirement } from '@/types';

export function checkElectrical(): ExtinguisherRequirement {
    return {
        fireClass: 'C' as const,
        minimumRating: 'CO2-2kg',   // Minimum 2kg CO2 per electrical zone
        countRequired: 1,
        perFloor: false,
        clauseRef: 'IS 2190:2024, cl 7.5, cl 6.3.7',
        note: 'CO2, clean agent, or water-mist required near energized electrical equipment. Water/foam types prohibited.',
    };
}
