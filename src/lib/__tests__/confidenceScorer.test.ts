// src/lib/__tests__/confidenceScorer.test.ts
// Tests for AI extraction confidence scoring

import { describe, it, expect } from 'vitest';
import { scoreConfidence } from '../confidenceScorer';
import type { BuildingInput } from '@/types';

const completeInput: BuildingInput = {
    buildingName: 'Test Office',
    buildingType: 'commercial',
    totalFloorArea: 500,
    numberOfFloors: 2,
    floorAreas: [250, 250],
    buildingHeight: 7,
    occupantCount: 50,
    hasKitchen: false,
    hasFlammableLiquids: false,
    hasFlammableGases: false,
    hasCombustibleMetals: false,
    hasElectricalHazards: false,
};

describe('scoreConfidence', () => {
    it('returns high confidence (100) for complete valid data', () => {
        const result = scoreConfidence(completeInput);
        expect(result.overall).toBe('high');
        expect(result.score).toBe(100);
        expect(result.flags).toHaveLength(0);
    });

    it('penalizes -30 when totalFloorArea is zero', () => {
        const result = scoreConfidence({ ...completeInput, totalFloorArea: 0 });
        expect(result.score).toBe(70);
        expect(result.flags).toContain('Total floor area missing or zero');
        expect(result.overall).toBe('high'); // exactly 70 → still high
    });

    it('penalizes -20 when numberOfFloors is zero', () => {
        const result = scoreConfidence({ ...completeInput, numberOfFloors: 0 });
        expect(result.score).toBe(80);
        expect(result.flags).toContain('Number of floors missing or zero');
    });

    it('penalizes -25 when floorAreas is empty (plus -15 mismatch with numberOfFloors)', () => {
        // Empty floorAreas triggers two penalties:
        // -25 for empty array + -15 for length (0) !== numberOfFloors (2)
        const result = scoreConfidence({ ...completeInput, floorAreas: [] });
        expect(result.score).toBe(60); // 100 - 25 - 15 = 60
        expect(result.flags).toContain('Floor areas array empty');
    });

    it('flags floor areas count mismatch (-15)', () => {
        const result = scoreConfidence({ ...completeInput, numberOfFloors: 3 });
        expect(result.flags.some((f) => f.includes("doesn't match"))).toBe(true);
        expect(result.score).toBe(85);
    });

    it('returns high confidence (90) when only occupant count is missing', () => {
        const result = scoreConfidence({ ...completeInput, occupantCount: 0 });
        expect(result.overall).toBe('high');
        expect(result.score).toBe(90);
    });

    it('flags unusually large buildings (>50,000 m²)', () => {
        const result = scoreConfidence({ ...completeInput, totalFloorArea: 60000 });
        expect(result.flags.some((f) => f.includes('50,000'))).toBe(true);
        expect(result.score).toBe(90);
    });

    it('flags high floor count (>20)', () => {
        // Need matching floorAreas to avoid mismatch penalty
        const manyFloors = Array(25).fill(200);
        const result = scoreConfidence({
            ...completeInput,
            numberOfFloors: 25,
            floorAreas: manyFloors,
        });
        expect(result.flags.some((f) => f.includes('20 floors'))).toBe(true);
    });

    it('returns low confidence when multiple critical fields are missing', () => {
        const result = scoreConfidence({
            ...completeInput,
            totalFloorArea: 0,    // -30
            numberOfFloors: 0,    // -20
            floorAreas: [],       // -25
            occupantCount: 0,     // -10
            buildingHeight: 0,    // -10
        });
        expect(result.score).toBe(5); // 100 - 30 - 20 - 25 - 10 - 10 = 5
        expect(result.overall).toBe('low');
        expect(result.flags.length).toBeGreaterThanOrEqual(5);
    });

    it('returns medium confidence for moderate issues', () => {
        const result = scoreConfidence({
            ...completeInput,
            totalFloorArea: 0,    // -30
            numberOfFloors: 0,    // -20
            // score = 50 → medium
        });
        expect(result.score).toBe(50);
        expect(result.overall).toBe('medium');
    });

    it('never returns score below 0', () => {
        const result = scoreConfidence({
            ...completeInput,
            totalFloorArea: 0,
            numberOfFloors: 0,
            floorAreas: [],
            occupantCount: 0,
            buildingHeight: 0,
        });
        expect(result.score).toBeGreaterThanOrEqual(0);
    });
});
