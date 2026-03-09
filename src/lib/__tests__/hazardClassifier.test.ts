// Tests for IS 2190:2024 Annex B Table 6 — Hazard Classification
import { describe, it, expect } from 'vitest';
import { determineHazardType } from '../hazardClassifier';

const baseInput = {
    buildingName: 'Test',
    buildingType: 'Hospital',
    totalFloorArea: 100,
    numberOfFloors: 1,
    floorAreas: [100],
    buildingHeight: 5,
    occupantCount: 5,
    hasKitchen: false,
    hasFlammableLiquids: false,
    flammableLiquidsLitres: 0,
    hasFlammableGases: false,
    flammableGasesLitres: 0,
    hasCombustibleMetals: false,
    hasElectricalHazards: false,
};

describe('determineHazardType — IS 2190:2024 Annex B Table 6', () => {
    it('returns LOW for a small office (area 200m², 10 occupants, height 5m)', () => {
        const result = determineHazardType({ ...baseInput, totalFloorArea: 200, occupantCount: 10, buildingHeight: 5 });
        expect(result.hazardType).toBe('low');
    });

    it('returns MODERATE when area is between 300 and 3000 m²', () => {
        const result = determineHazardType({ ...baseInput, totalFloorArea: 1500, occupantCount: 50 });
        expect(result.hazardType).toBe('moderate');
    });

    it('returns HIGH when building height exceeds 15m', () => {
        const result = determineHazardType({ ...baseInput, buildingHeight: 20 });
        expect(result.hazardType).toBe('high');
    });

    it('returns HIGH when occupant count exceeds 250', () => {
        const result = determineHazardType({ ...baseInput, occupantCount: 300, totalFloorArea: 2000 });
        expect(result.hazardType).toBe('high');
    });

    it('returns HIGH when flammable liquids exceed 1000 litres', () => {
        const result = determineHazardType({ ...baseInput, hasFlammableLiquids: true, flammableLiquidsLitres: 1500 });
        expect(result.hazardType).toBe('high');
    });

    it('returns MODERATE for exact boundary at 300 m² floor area', () => {
        const result = determineHazardType({ ...baseInput, totalFloorArea: 300, occupantCount: 15 });
        expect(result.hazardType).toBe('moderate');
    });
});
