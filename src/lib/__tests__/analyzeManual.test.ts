// src/lib/__tests__/analyzeManual.test.ts
// Tests for the manual analysis path (JSON input → rule engine)

import { describe, it, expect } from 'vitest';
import { runRuleEngine } from '../ruleEngine';
import type { BuildingInput } from '@/types';

describe('Manual analysis path', () => {
    it('produces valid AnalysisResult for a standard office', () => {
        const input: BuildingInput = {
            buildingName: 'User Office',
            buildingType: 'Office',
            totalFloorArea: 300,
            numberOfFloors: 1,
            floorAreas: [300],
            buildingHeight: 4,
            occupantCount: 20,
            hasKitchen: false,
            hasFlammableLiquids: false,
            hasFlammableGases: false,
            hasCombustibleMetals: false,
            hasElectricalHazards: false,
        };

        const result = runRuleEngine(input);

        expect(result.hazardType).toBeDefined();
        expect(result.complianceScore).toBe(100);
        expect(result.requiredExtinguishers.length).toBeGreaterThan(0);
        expect(result.requiredExtinguishers[0].clauseRef).toContain('IS 2190');
    });

    it('handles all hazard types from manual input', () => {
        const input: BuildingInput = {
            buildingName: 'Warehouse',
            buildingType: 'Hospital',
            totalFloorArea: 5000,
            numberOfFloors: 1,
            floorAreas: [5000],
            buildingHeight: 18,
            occupantCount: 300,
            hasKitchen: true,
            cookingAreaM2: 0.1,
            hasFlammableLiquids: true,
            flammableLiquidsLitres: 2000,
            hasFlammableGases: false,
            hasCombustibleMetals: false,
            hasElectricalHazards: true,
        };

        const result = runRuleEngine(input);

        expect(result.hazardType).toBe('high');
        expect(result.requiredExtinguishers.some((r) => r.fireClass === 'A')).toBe(true);
        expect(result.requiredExtinguishers.some((r) => r.fireClass === 'B')).toBe(true);
        expect(result.requiredExtinguishers.some((r) => r.fireClass === 'F')).toBe(true);
    });

    it('flags combustible metals requiring professional assessment', () => {
        const input: BuildingInput = {
            buildingName: 'Metal Workshop',
            buildingType: 'Warehouse',
            totalFloorArea: 200,
            numberOfFloors: 1,
            floorAreas: [200],
            buildingHeight: 4,
            occupantCount: 10,
            hasKitchen: false,
            hasFlammableLiquids: false,
            hasFlammableGases: false,
            hasCombustibleMetals: true,
            hasElectricalHazards: false,
        };

        const result = runRuleEngine(input);

        expect(result.violations.some((v) => v.ruleId === 'D-PROFESSIONAL')).toBe(true);
        expect(result.violations[0].severity).toBe('high');
        expect(result.complianceScore).toBeLessThan(100);
    });

    it('handles kitchen without cooking area as a violation', () => {
        const input: BuildingInput = {
            buildingName: 'Restaurant',
            buildingType: 'School',
            totalFloorArea: 400,
            numberOfFloors: 1,
            floorAreas: [400],
            buildingHeight: 4,
            occupantCount: 60,
            hasKitchen: true,
            // Missing cookingAreaM2 — should trigger violation
            hasFlammableLiquids: false,
            hasFlammableGases: false,
            hasCombustibleMetals: false,
            hasElectricalHazards: false,
        };

        const result = runRuleEngine(input);

        expect(result.violations.some((v) => v.ruleId === 'F-MISSING-AREA')).toBe(true);
    });
});
