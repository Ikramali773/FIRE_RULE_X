// src/lib/confidenceScorer.ts
// Confidence scoring for AI-extracted building data
//
// Penalty-based: starts at 100, deducts for missing/implausible fields.
// Thresholds: high (≥70), medium (40-69), low (<40)

import type { BuildingInput, ExtractionConfidence, ConfidenceLevel } from '@/types';

export function scoreConfidence(data: BuildingInput): ExtractionConfidence {
    const flags: string[] = [];
    let score = 100;

    // --- Critical field checks ---

    if (!data.totalFloorArea || data.totalFloorArea <= 0) {
        flags.push('Total floor area missing or zero');
        score -= 30;
    }
    if (!data.numberOfFloors || data.numberOfFloors <= 0) {
        flags.push('Number of floors missing or zero');
        score -= 20;
    }
    if (!data.floorAreas || data.floorAreas.length === 0) {
        flags.push('Floor areas array empty');
        score -= 25;
    }
    if (
        data.floorAreas &&
        data.numberOfFloors &&
        data.floorAreas.length !== data.numberOfFloors
    ) {
        flags.push(
            `Floor areas count (${data.floorAreas.length}) doesn't match numberOfFloors (${data.numberOfFloors})`
        );
        score -= 15;
    }
    if (!data.occupantCount || data.occupantCount <= 0) {
        flags.push('Occupant count missing — using area-based estimate');
        score -= 10;
    }
    if (!data.buildingHeight || data.buildingHeight <= 0) {
        flags.push('Building height missing — using floor-count estimate');
        score -= 10;
    }

    // --- Plausibility checks ---

    if (data.totalFloorArea > 50000) {
        flags.push('Total area > 50,000 m² — unusually large, verify');
        score -= 10;
    }
    if (data.numberOfFloors > 20) {
        flags.push('More than 20 floors — verify this is correct');
        score -= 5;
    }
    if (data.occupantCount > 5000) {
        flags.push('Occupant count > 5000 — verify');
        score -= 5;
    }

    score = Math.max(0, score);
    const overall: ConfidenceLevel =
        score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

    return { overall, score, flags };
}
