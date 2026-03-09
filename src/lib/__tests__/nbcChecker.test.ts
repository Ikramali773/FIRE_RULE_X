// Tests for NBC 2016 Part IV checker
import { describe, it, expect } from 'vitest';
import {
    calculateOccupantLoad,
    calculateExitCapacity,
    checkTravelDistance,
    checkFirefightingInstallations,
    runNBCChecks,
} from '../nbcChecker';
import { runRuleEngine } from '../ruleEngine';
import type { BuildingInput } from '@/types';

// ── Occupant Load (Table 3) ────────────────────────────────────────

describe('calculateOccupantLoad', () => {
    it('calculates occupant load for Group E (Business) — 10 m²/person', () => {
        const result = calculateOccupantLoad('E', 500);
        expect(result).not.toBeNull();
        expect(result!.maxOccupants).toBe(50);   // 500 / 10
        expect(result!.loadFactor).toBe(10);
    });

    it('calculates occupant load for Group B (Educational) — 4 m²/person', () => {
        const result = calculateOccupantLoad('B', 200);
        expect(result).not.toBeNull();
        expect(result!.maxOccupants).toBe(50);   // 200 / 4
        expect(result!.loadFactor).toBe(4);
    });

    it('calculates occupant load for Group H (Storage) — 30 m²/person', () => {
        const result = calculateOccupantLoad('H', 3000);
        expect(result).not.toBeNull();
        expect(result!.maxOccupants).toBe(100);  // 3000 / 30
        expect(result!.loadFactor).toBe(30);
    });

    it('calculates occupant load for Group A (Residential) — 12.5 m²/person', () => {
        const result = calculateOccupantLoad('A', 250);
        expect(result).not.toBeNull();
        expect(result!.maxOccupants).toBe(20);   // 250 / 12.5
        expect(result!.loadFactor).toBe(12.5);
    });

    it('uses floor for fractional results', () => {
        const result = calculateOccupantLoad('E', 155);
        expect(result).not.toBeNull();
        expect(result!.maxOccupants).toBe(15);   // 155 / 10 = 15.5 → floor = 15
    });
});

// ── Exit Capacity (Table 4) ────────────────────────────────────────

describe('calculateExitCapacity', () => {
    it('calculates exit capacity for Group D (Assembly) — 400 occupants', () => {
        const result = calculateExitCapacity('D', 400);
        expect(result).not.toBeNull();
        expect(result!.stairwayUnits).toBe(10);      // 400 / 40 = 10
        expect(result!.corridorUnits).toBe(7);        // 400 / 60 = 6.67 → ceil = 7
        expect(result!.doorUnits).toBe(5);             // 400 / 90 = 4.44 → ceil = 5
    });

    it('calculates exit widths in mm (500mm per unit)', () => {
        const result = calculateExitCapacity('D', 400);
        expect(result).not.toBeNull();
        expect(result!.stairwayWidthMm).toBe(5000);   // 10 × 500
        expect(result!.corridorWidthMm).toBe(3500);    // 7 × 500
        expect(result!.doorWidthMm).toBe(2500);        // 5 × 500
    });

    it('calculates exit capacity for Group E (Business) — 100 occupants', () => {
        const result = calculateExitCapacity('E', 100);
        expect(result).not.toBeNull();
        expect(result!.stairwayUnits).toBe(2);   // 100 / 50 = 2
        expect(result!.corridorUnits).toBe(2);    // 100 / 75 = 1.33 → ceil = 2
        expect(result!.doorUnits).toBe(1);         // 100 / 100 = 1
    });

    it('calculates exit capacity for Group J (Hazardous) — stricter limits', () => {
        const result = calculateExitCapacity('J', 60);
        expect(result).not.toBeNull();
        expect(result!.stairwayUnits).toBe(3);   // 60 / 25 = 2.4 → ceil = 3
        expect(result!.corridorUnits).toBe(2);    // 60 / 40 = 1.5 → ceil = 2
        expect(result!.doorUnits).toBe(1);         // 60 / 60 = 1
    });
});

// ── Travel Distance (Table 5) ──────────────────────────────────────

describe('checkTravelDistance', () => {
    it('returns 30m for Group A, Type 1&2, no sprinklers', () => {
        const result = checkTravelDistance('A', 'type12', false);
        expect(result).not.toBeNull();
        expect(result!.maxDistanceM).toBe(30);
    });

    it('returns 45m for Group A, Type 1&2, with sprinklers (+50%)', () => {
        const result = checkTravelDistance('A', 'type12', true);
        expect(result).not.toBeNull();
        expect(result!.maxDistanceM).toBe(45);  // 30 × 1.5
        expect(result!.sprinklerApplied).toBe(true);
    });

    it('returns 22.5m for Group A, Type 3&4, no sprinklers', () => {
        const result = checkTravelDistance('A', 'type34', false);
        expect(result).not.toBeNull();
        expect(result!.maxDistanceM).toBe(22.5);
    });

    it('returns NOT_PERMITTED for Group H, Type 3&4', () => {
        const result = checkTravelDistance('H', 'type34', false);
        expect(result).not.toBeNull();
        expect(result!.maxDistanceM).toBe(-1);
    });

    it('returns NOT_PERMITTED for Group J, Type 3&4', () => {
        const result = checkTravelDistance('J', 'type34', false);
        expect(result).not.toBeNull();
        expect(result!.maxDistanceM).toBe(-1);
    });

    it('returns 45m for Group G-1, Type 1&2, no sprinklers', () => {
        const result = checkTravelDistance('G', 'type12', false, 'G-1');
        expect(result).not.toBeNull();
        expect(result!.maxDistanceM).toBe(45);
    });

    it('returns 22.5m for Group G-3, Type 1&2, no sprinklers', () => {
        const result = checkTravelDistance('G', 'type12', false, 'G-3');
        expect(result).not.toBeNull();
        expect(result!.maxDistanceM).toBe(22.5);
    });
});

// ── Integration: runRuleEngine with NBC fields ─────────────────────

describe('runRuleEngine with NBC occupancyGroup', () => {
    const baseInput: BuildingInput = {
        buildingName: 'Office Tower',
        buildingType: 'School',
        totalFloorArea: 500,
        numberOfFloors: 1,
        floorAreas: [500],
        buildingHeight: 4,
        occupantCount: 40,
        hasKitchen: false,
        hasFlammableLiquids: false,
        hasCombustibleMetals: false,
        hasElectricalHazards: false,
        hasFlammableGases: false,
    };

    it('includes NBC occupant load check when occupancyGroup is provided', () => {
        const input: BuildingInput = {
            ...baseInput,
            occupancyGroup: 'E',
        };
        const result = runRuleEngine(input);
        const nbcPassed = result.passedRules.filter(r => r.includes('Occupant load'));
        expect(nbcPassed.length).toBeGreaterThan(0);
    });

    it('creates violation when occupant count exceeds NBC max', () => {
        const input: BuildingInput = {
            ...baseInput,
            occupantCount: 200,    // 500m² / 10 factor = 50 max → 200 exceeds
            occupancyGroup: 'E',
        };
        const result = runRuleEngine(input);
        const nbcViolation = result.violations.find(v => v.ruleId === 'NBC-OL-EXCEED');
        expect(nbcViolation).toBeDefined();
        expect(nbcViolation!.severity).toBe('high');
    });

    it('does NOT run NBC checks when occupancyGroup is not provided', () => {
        const result = runRuleEngine(baseInput);
        const nbcRules = result.passedRules.filter(r => r.includes('Occupant load') || r.includes('Travel distance'));
        expect(nbcRules).toHaveLength(0);
    });

    it('creates travel distance violation when type34 is used for Group H', () => {
        const input: BuildingInput = {
            ...baseInput,
            occupancyGroup: 'H',
            constructionType: 'type34',
        };
        const result = runRuleEngine(input);
        const tdViolation = result.violations.find(v => v.ruleId === 'NBC-TD-NOT-PERMITTED');
        expect(tdViolation).toBeDefined();
        expect(tdViolation!.severity).toBe('high');
    });

    it('creates travel distance exceed violation', () => {
        const input: BuildingInput = {
            ...baseInput,
            occupancyGroup: 'E',
            constructionType: 'type12',
            hasSprinklers: false,
            travelDistanceM: 35,   // max is 30m for Group E type12 without sprinklers
        };
        const result = runRuleEngine(input);
        const tdViolation = result.violations.find(v => v.ruleId === 'NBC-TD-EXCEED');
        expect(tdViolation).toBeDefined();
    });

    it('passes travel distance when sprinklers increase the limit', () => {
        const input: BuildingInput = {
            ...baseInput,
            occupancyGroup: 'E',
            constructionType: 'type12',
            hasSprinklers: true,    // sprinkler bonus: 30 × 1.5 = 45m
            travelDistanceM: 35,    // 35 < 45 → pass
        };
        const result = runRuleEngine(input);
        const tdViolation = result.violations.find(v => v.ruleId === 'NBC-TD-EXCEED');
        expect(tdViolation).toBeUndefined();
        const tdPassed = result.passedRules.filter(r => r.includes('Travel distance'));
        expect(tdPassed.length).toBeGreaterThan(0);
    });
});

// ── Firefighting Installations (Table 7) ───────────────────────────

describe('checkFirefightingInstallations', () => {
    it('returns ≤15m tier for A-4 apartment at 10m height', () => {
        const { result, violation } = checkFirefightingInstallations('A', 'A-4', 10);
        expect(violation).toBeUndefined();
        expect(result).toBeDefined();
        expect(result!.heightTierLabel).toBe('≤15m');
        expect(result!.wetRiser).toBe(false);
        expect(result!.automaticSprinkler).toBe(false);
        expect(result!.terraceTankLitres).toBe(10000);
    });

    it('returns 35-45m tier for A-4 apartment at 40m — requires sprinkler & wet riser', () => {
        const { result, violation } = checkFirefightingInstallations('A', 'A-4', 40);
        expect(violation).toBeUndefined();
        expect(result).toBeDefined();
        expect(result!.heightTierLabel).toBe('35m to 45m');
        expect(result!.wetRiser).toBe(true);
        expect(result!.automaticSprinkler).toBe(true);
        expect(result!.undergroundTankLitres).toBe(75000);
    });

    it('returns >60m tier for A-4 apartment at 65m — all major systems required', () => {
        const { result, violation } = checkFirefightingInstallations('A', 'A-4', 65);
        expect(violation).toBeUndefined();
        expect(result).toBeDefined();
        expect(result!.heightTierLabel).toBe('>60m');
        expect(result!.wetRiser).toBe(true);
        expect(result!.automaticSprinkler).toBe(true);
        expect(result!.yardHydrant).toBe(true);
        expect(result!.undergroundTankLitres).toBe(200000);
        expect(result!.undergroundPumpLpm).toBe(2850);
    });

    it('returns 15-24m tier for E (Business) at 20m height', () => {
        const { result } = checkFirefightingInstallations('E', undefined, 20);
        expect(result).toBeDefined();
        expect(result!.heightTierLabel).toBe('15m to 24m');
        expect(result!.wetRiser).toBe(true);
        expect(result!.automaticSprinkler).toBe(true);
    });

    it('returns height-not-permitted violation for H (Storage) at 20m', () => {
        const { result, violation } = checkFirefightingInstallations('H', undefined, 20);
        expect(result).toBeUndefined();
        expect(violation).toBeDefined();
        expect(violation!.ruleId).toBe('NBC-FI-HEIGHT-NOT-PERMITTED');
        expect(violation!.severity).toBe('high');
    });

    it('returns height-not-permitted violation for B (Educational) at 35m', () => {
        const { violation } = checkFirefightingInstallations('B', undefined, 35);
        expect(violation).toBeDefined();
        expect(violation!.ruleId).toBe('NBC-FI-HEIGHT-NOT-PERMITTED');
    });

    it('returns requirements for H (Storage) within permitted height', () => {
        const { result, violation } = checkFirefightingInstallations('H', undefined, 12);
        expect(violation).toBeUndefined();
        expect(result).toBeDefined();
        expect(result!.automaticSprinkler).toBe(true);
        expect(result!.undergroundTankLitres).toBe(200000);
    });
});

// ── Integration: runNBCChecks with Table 7 ─────────────────────────

describe('runNBCChecks with firefighting installations', () => {
    it('includes firefighting installations when buildingHeight > 0', () => {
        const result = runNBCChecks({
            buildingName: 'Apartment Tower',
            buildingType: 'Shopping Mall',
            totalFloorArea: 2000,
            numberOfFloors: 10,
            floorAreas: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200],
            buildingHeight: 35,
            occupantCount: 100,
            hasKitchen: false,
            hasFlammableLiquids: false,
            hasCombustibleMetals: false,
            hasElectricalHazards: false,
            hasFlammableGases: false,
            occupancyGroup: 'A',
            occupancySubdivision: 'A-4',
        });
        expect(result.firefightingInstallations).toBeDefined();
        expect(result.firefightingInstallations!.heightTierLabel).toBe('24m to 35m');
        expect(result.firefightingInstallations!.wetRiser).toBe(true);
        const fiPassedRule = result.passedRules.find(r => r.includes('Table 7'));
        expect(fiPassedRule).toBeDefined();
    });

    it('creates violation for H building exceeding 15m', () => {
        const result = runNBCChecks({
            buildingName: 'Storage Facility',
            buildingType: 'Shopping Mall',
            totalFloorArea: 5000,
            numberOfFloors: 6,
            floorAreas: [833, 833, 833, 833, 834, 834],
            buildingHeight: 21,
            occupantCount: 50,
            hasKitchen: false,
            hasFlammableLiquids: false,
            hasCombustibleMetals: false,
            hasElectricalHazards: false,
            hasFlammableGases: false,
            occupancyGroup: 'H',
        });
        const fiViolation = result.violations.find(v => v.ruleId === 'NBC-FI-HEIGHT-NOT-PERMITTED');
        expect(fiViolation).toBeDefined();
        expect(fiViolation!.severity).toBe('high');
    });
});
