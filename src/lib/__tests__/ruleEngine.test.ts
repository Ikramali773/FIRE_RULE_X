// Tests for the complete FireRuleX rule engine
import { describe, it, expect } from 'vitest';
import { runRuleEngine } from '../ruleEngine';
import type { BuildingInput } from '@/types';

const smallOffice: BuildingInput = {
    buildingName: 'Small Office',
    buildingType: 'Office',
    totalFloorArea: 150,
    numberOfFloors: 1,
    floorAreas: [150],
    buildingHeight: 4,
    occupantCount: 10,
    hasKitchen: false,
    hasFlammableLiquids: false,
    hasCombustibleMetals: false,
    hasElectricalHazards: false,
    hasFlammableGases: false,
};

const largeCommercial: BuildingInput = {
    buildingName: 'Large Mall',
    buildingType: 'Warehouse',
    totalFloorArea: 5000,
    numberOfFloors: 4,
    floorAreas: [1250, 1250, 1250, 1250],
    buildingHeight: 16,
    occupantCount: 500,
    hasKitchen: true,
    cookingAreaM2: 0.06,
    hasFlammableLiquids: true,
    flammableLiquidsLitres: 1200,
    hasCombustibleMetals: false,
    hasElectricalHazards: true,
    hasFlammableGases: false,
};

describe('runRuleEngine', () => {
    describe('Small low-hazard office', () => {
        it('classifies as low hazard', () => {
            const result = runRuleEngine(smallOffice);
            expect(result.hazardType).toBe('low');
        });

        it('requires 2A rated extinguishers per floor', () => {
            const result = runRuleEngine(smallOffice);
            const classAReq = result.requiredExtinguishers.find(r => r.fireClass === 'A');
            expect(classAReq?.minimumRating).toBe('2A');
        });

        it('requires minimum 2 extinguishers (150m² >= 100m²)', () => {
            const result = runRuleEngine(smallOffice);
            const classAReq = result.requiredExtinguishers.find(r => r.fireClass === 'A');
            // 150m² / 300m² = 0.5 → ceil = 1, but minimum is 2 (150m² >= 100m²)
            expect(classAReq?.countRequired).toBe(2);
        });

        it('has no violations for basic setup', () => {
            const result = runRuleEngine(smallOffice);
            const highViolations = result.violations.filter(v => v.severity === 'high');
            expect(highViolations).toHaveLength(0);
        });

        it('returns compliance score of 100 (no violations)', () => {
            const result = runRuleEngine(smallOffice);
            expect(result.complianceScore).toBe(100);
        });
    });

    describe('Large high-hazard commercial (mall)', () => {
        it('classifies as high hazard (height 16m > 15m, occupants 500 > 250)', () => {
            const result = runRuleEngine(largeCommercial);
            expect(result.hazardType).toBe('high');
        });

        it('requires 4A extinguishers for Class A', () => {
            const result = runRuleEngine(largeCommercial);
            const classAReqs = result.requiredExtinguishers.filter(r => r.fireClass === 'A');
            classAReqs.forEach(req => expect(req.minimumRating).toBe('4A'));
        });

        it('requires Class B extinguishers (233B) per floor for flammable liquids', () => {
            const result = runRuleEngine(largeCommercial);
            const classBReq = result.requiredExtinguishers.find(r => r.fireClass === 'B');
            expect(classBReq?.minimumRating).toBe('233B');
        });

        it('requires Class F extinguisher for kitchen (cooking area 0.06m² → 25F)', () => {
            const result = runRuleEngine(largeCommercial);
            const classFReq = result.requiredExtinguishers.find(r => r.fireClass === 'F');
            expect(classFReq?.minimumRating).toBe('25F');
        });

        it('requires CO2/electrical extinguisher for electrical hazard', () => {
            const result = runRuleEngine(largeCommercial);
            const elecReq = result.requiredExtinguishers.find(r => r.fireClass === 'C');
            expect(elecReq).toBeDefined();
            expect(elecReq?.clauseRef).toContain('6.3.7');
        });

        it('calculates correct Class A count for each 1250m² floor at high hazard', () => {
            // 1250m² / 100m² = 12.5 → ceil = 13, which is > 2 minimum
            const result = runRuleEngine(largeCommercial);
            const classAReqs = result.requiredExtinguishers.filter(r => r.fireClass === 'A');
            classAReqs.forEach(req => expect(req.countRequired).toBe(13));
        });
    });

    describe('Kitchen without area specified', () => {
        it('creates a medium violation for missing cooking area', () => {
            const input: BuildingInput = { ...smallOffice, hasKitchen: true, cookingAreaM2: undefined };
            const result = runRuleEngine(input);
            const violation = result.violations.find(v => v.ruleId === 'F-MISSING-AREA');
            expect(violation).toBeDefined();
            expect(violation?.severity).toBe('medium');
        });
    });

    describe('Combustible metals hazard', () => {
        it('creates a high violation requiring professional assessment', () => {
            const input: BuildingInput = { ...smallOffice, hasCombustibleMetals: true };
            const result = runRuleEngine(input);
            const violation = result.violations.find(v => v.ruleId === 'D-PROFESSIONAL');
            expect(violation?.severity).toBe('high');
        });
    });
});
