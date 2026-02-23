---
phase: 1
plan: 3
wave: 2
---

# Plan 1.3: Rule Engine Complete — All Fire Classes + Unit Tests

## Objective
Complete the rule engine by adding Class B/C, Class F (kitchen), and Electrical hazard checkers, then wire them together into the main `ruleEngine.ts` orchestrator that accepts a `BuildingInput` and returns a complete `AnalysisResult`. Finally, write unit tests covering all rule scenarios.

## Context
- `src/lib/hazardClassifier.ts` — From Plan 1.2
- `src/lib/classAChecker.ts` — From Plan 1.2
- `src/types/index.ts` — All types (BuildingInput, AnalysisResult, Violation, etc.)
- `src/data/nbc_rules.json` — Reference for clause numbers (Table 2, Table 3, cl 7.5, cl 7.7)
- `.gsd/DECISIONS.md` — MVP checks number/type only; NO travel distance; NO placement

## Tasks

<task type="auto">
  <name>Implement Class B/C, Class F, and Electrical checkers + main ruleEngine.ts</name>
  <files>
    src/lib/classBCChecker.ts,
    src/lib/classFChecker.ts,
    src/lib/electricalChecker.ts,
    src/lib/ruleEngine.ts
  </files>
  <action>
    ### 1. src/lib/classBCChecker.ts
    Implements Table 2. Only triggered if `input.hasFlammableLiquids === true`.

    **Table 2 values:**
    - Low: rating=55B, maxArea=300 m²
    - Moderate: rating=144B, maxArea=150 m²
    - High: rating=233B, maxArea=100 m²

    **Rules:** Min 2 per floor (exception: <100m² → 1). Building also needs FULL Class A complement (do not replace).

    ```typescript
    // src/lib/classBCChecker.ts
    import type { HazardType, ExtinguisherRequirement } from '@/types';

    const CLASS_B_TABLE: Record<HazardType, { rating: string; maxAreaM2: number }> = {
      low:      { rating: '55B',  maxAreaM2: 300 },
      moderate: { rating: '144B', maxAreaM2: 150 },
      high:     { rating: '233B', maxAreaM2: 100 },
    };

    export function checkClassBC(
      floorAreas: number[],
      hazardType: HazardType
    ): ExtinguisherRequirement[] {
      const { rating, maxAreaM2 } = CLASS_B_TABLE[hazardType];
      return floorAreas.map((area, idx) => {
        const calculated = Math.ceil(area / maxAreaM2);
        const minimum = area < 100 ? 1 : 2;
        return {
          fireClass: 'B' as const,
          minimumRating: rating,
          countRequired: Math.max(calculated, minimum),
          perFloor: true,
          clauseRef: `IS 2190:2024, Table 2 (${hazardType} hazard), cl 7.3.1–7.3.4`,
          note: `Additional to Class A complement. Floor ${idx}: area ${area}m²`,
        };
      });
    }
    ```

    ### 2. src/lib/classFChecker.ts
    Implements Table 3. Only triggered if `input.hasKitchen === true`.

    **Table 3 values (cooking area → minimum rating):**
    - ≤ 0.03 m² → 5F
    - ≤ 0.05 m² → 15F
    - ≤ 0.08 m² → 25F
    - ≤ 0.25 m² → 75F
    - > 0.25 m² → multiple 75F extinguishers (ceil(area / 0.25))

    ```typescript
    // src/lib/classFChecker.ts
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
      // Area > 0.25 m²: multiple 75F
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
    ```

    ### 3. src/lib/electricalChecker.ts
    Implements cl 7.5 + 6.3.7. Triggered if `input.hasElectricalHazards === true`.
    No area-based calculation — just flag that CO2/clean agent/water-mist must be present near electrical panels.

    ```typescript
    // src/lib/electricalChecker.ts
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
    ```

    ### 4. src/lib/ruleEngine.ts — Main Orchestrator

    Wires all checkers together. Accepts BuildingInput, returns AnalysisResult.

    ```typescript
    // src/lib/ruleEngine.ts
    import type { BuildingInput, AnalysisResult, Violation, ExtinguisherRequirement } from '@/types';
    import { determineHazardType } from './hazardClassifier';
    import { checkClassA } from './classAChecker';
    import { checkClassBC } from './classBCChecker';
    import { checkClassF } from './classFChecker';
    import { checkElectrical } from './electricalChecker';

    export function runRuleEngine(input: BuildingInput): AnalysisResult {
      const violations: Violation[] = [];
      const passedRules: string[] = [];
      const allRequirements: ExtinguisherRequirement[] = [];

      // Step 1: Determine hazard type
      const { hazardType, reasons, clauseRef: hazardClause } = determineHazardType(input);

      // Step 2: Class A requirements (all buildings)
      const { requirements: classAReqs } = checkClassA(input.floorAreas, hazardType);
      allRequirements.push(...classAReqs);
      passedRules.push(`Class A extinguishers required: ${classAReqs.length} floor(s) assessed`);

      // Step 3: Class B/C if flammable liquids present
      if (input.hasFlammableLiquids) {
        const classBReqs = checkClassBC(input.floorAreas, hazardType);
        allRequirements.push(...classBReqs);
        passedRules.push('Class B/C extinguishers: flammable liquid hazard detected and addressed');
      }

      // Step 4: Class F if kitchen present
      if (input.hasKitchen) {
        if (!input.cookingAreaM2 || input.cookingAreaM2 <= 0) {
          violations.push({
            ruleId: 'F-MISSING-AREA',
            clauseRef: 'IS 2190:2024, Table 3, cl 7.7',
            severity: 'medium',
            description: 'Kitchen detected but cooking area size not provided. Cannot calculate Class F extinguisher requirement.',
            fixSuggestion: 'Provide the cooking appliance area (m²) to determine the correct Class F extinguisher rating.',
          });
        } else {
          const classFReq = checkClassF(input.cookingAreaM2);
          allRequirements.push(classFReq);
          passedRules.push('Class F extinguisher: kitchen cooking area assessed');
        }
      }

      // Step 5: Electrical hazard
      if (input.hasElectricalHazards) {
        const elecReq = checkElectrical();
        allRequirements.push(elecReq);
        passedRules.push('Electrical hazard: CO2/clean agent requirement identified');
      }

      // Step 6: Combustible metals
      if (input.hasCombustibleMetals) {
        violations.push({
          ruleId: 'D-PROFESSIONAL',
          clauseRef: 'IS 2190:2024, cl 7.6',
          severity: 'high',
          description: 'Combustible metal hazard detected (Class D). Cannot auto-calculate — requires fire professional assessment.',
          fixSuggestion: 'Engage a qualified fire safety professional to determine Class D extinguisher type, size, and number per IS 2190:2024 cl 7.6.3.',
        });
      }

      // Step 7: Compliance score
      const totalChecks = passedRules.length + violations.filter(v => v.severity === 'high').length * 2 + violations.filter(v => v.severity === 'medium').length;
      const penaltyPoints = violations.reduce((sum, v) => {
        return sum + (v.severity === 'high' ? 20 : v.severity === 'medium' ? 10 : 5);
      }, 0);
      const rawScore = Math.max(0, 100 - penaltyPoints);

      const grade = rawScore >= 90 ? 'A' : rawScore >= 75 ? 'B' : rawScore >= 60 ? 'C' : 'D';
      const nocReadiness = rawScore >= 90 ? 'READY' : rawScore >= 60 ? 'CONDITIONAL' : 'NOT_READY';

      return {
        hazardType,
        complianceScore: rawScore,
        grade,
        nocReadiness,
        requiredExtinguishers: allRequirements,
        violations,
        passedRules,
        analysisMethod: 'structured_input',
      };
    }
    ```
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    ```
    Must output nothing (zero TypeScript errors).
  </verify>
  <done>
    - All 4 files created and compile without errors
    - ruleEngine.ts exports `runRuleEngine` function
    - All imports resolve correctly
  </done>
</task>

<task type="auto">
  <name>Write unit tests for the complete rule engine</name>
  <files>
    src/lib/__tests__/ruleEngine.test.ts,
    src/lib/__tests__/hazardClassifier.test.ts,
    vitest.config.ts,
    package.json (add vitest dev dependency)
  </files>
  <action>
    ### Install Vitest
    ```powershell
    npm install --save-dev vitest @vitest/ui
    ```

    Add to package.json scripts:
    ```json
    "test": "vitest run",
    "test:ui": "vitest --ui"
    ```

    ### Create vitest.config.ts
    ```typescript
    import { defineConfig } from 'vitest/config';
    import path from 'path';

    export default defineConfig({
      test: {
        environment: 'node',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        },
      },
    });
    ```

    ### Create src/lib/__tests__/hazardClassifier.test.ts
    Test all boundary conditions from IS 2190:2024 Table 6.

    ```typescript
    import { describe, it, expect } from 'vitest';
    import { determineHazardType } from '../hazardClassifier';

    const baseInput = {
      buildingName: 'Test',
      buildingType: 'commercial' as const,
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
    ```

    ### Create src/lib/__tests__/ruleEngine.test.ts
    Test the full rule engine with realistic commercial building scenarios.

    ```typescript
    import { describe, it, expect } from 'vitest';
    import { runRuleEngine } from '../ruleEngine';
    import type { BuildingInput } from '@/types';

    const smallOffice: BuildingInput = {
      buildingName: 'Small Office',
      buildingType: 'commercial',
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
      buildingType: 'commercial',
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

        it('requires 1 extinguisher for floor under 100m² or 1 for 150m²/300 = ceil(0.5)=1 but min 2', () => {
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

        it('returns a compliance score of 100 (no violations)', () => {
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

        it('requires Class F extinguisher for kitchen (cooking area 0.06m² → 15F)', () => {
          const result = runRuleEngine(largeCommercial);
          const classFReq = result.requiredExtinguishers.find(r => r.fireClass === 'F');
          expect(classFReq?.minimumRating).toBe('15F');
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
    ```
  </action>
  <verify>
    ```powershell
    npm test
    ```
    Expected output: All tests PASS. Zero failures.
    If any test fails, fix the corresponding implementation file before marking done.
  </verify>
  <done>
    - `npm test` outputs all tests passing (0 failures)
    - Vitest finds and runs all test files in src/lib/__tests__/
    - All 16+ test cases pass green
    - `npx tsc --noEmit` still outputs nothing (no TypeScript errors)
  </done>
</task>

## Success Criteria
- [ ] All 4 checker files created and compile (`npx tsc --noEmit` clean)
- [ ] `npm test` passes with 0 failures across all test cases
- [ ] All fire class scenarios tested: Class A (low/mod/high), Class B (Table 2), Class F (Table 3), Electrical
- [ ] Rule engine scores 100 for clean input, deducts correctly for violations
- [ ] Every requirement returned includes IS 2190:2024 clause reference
