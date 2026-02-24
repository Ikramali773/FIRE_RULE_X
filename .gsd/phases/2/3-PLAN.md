---
phase: 2
plan: 3
wave: 2
---

# Plan 2.3: Integration Tests + End-to-End Validation

## Objective
Write integration tests for the full analysis pipeline (extraction → rule engine → response), test the manual override endpoint, and validate with a real floor plan image if available. Ensure the system handles edge cases gracefully (bad files, missing data, oversized uploads).

## Context
- `src/app/api/analyze/route.ts` — From Plan 2.1
- `src/app/api/analyze-manual/route.ts` — From Plan 2.2
- `src/lib/extractBuildingData.ts` — Gemini extraction + confidence scoring
- `vitest.config.ts` — Already configured from Phase 1
- `.env.local` — Must have GEMINI_API_KEY for live AI tests

## Tasks

<task type="auto">
  <name>Write unit tests for confidence scoring and manual endpoint</name>
  <files>
    src/lib/__tests__/extractBuildingData.test.ts,
    src/lib/__tests__/analyzeManual.test.ts
  </files>
  <action>
    ### 1. src/lib/__tests__/extractBuildingData.test.ts

    Test `scoreConfidence` function independently (export it for testing).

    ```typescript
    import { describe, it, expect } from 'vitest';
    import { scoreConfidence } from '../extractBuildingData';

    const completeInput = {
      buildingName: 'Test Office',
      buildingType: 'commercial' as const,
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
      it('returns high confidence for complete data', () => {
        const result = scoreConfidence(completeInput);
        expect(result.overall).toBe('high');
        expect(result.score).toBeGreaterThanOrEqual(70);
        expect(result.flags).toHaveLength(0);
      });

      it('returns low confidence when floor area is zero', () => {
        const result = scoreConfidence({ ...completeInput, totalFloorArea: 0 });
        expect(result.score).toBeLessThan(70);
        expect(result.flags).toContain('Total floor area missing or zero');
      });

      it('returns low confidence when floor areas mismatch floor count', () => {
        const result = scoreConfidence({ ...completeInput, numberOfFloors: 3 });
        expect(result.flags.some(f => f.includes("doesn't match"))).toBe(true);
      });

      it('flags unusually large buildings', () => {
        const result = scoreConfidence({ ...completeInput, totalFloorArea: 60000 });
        expect(result.flags.some(f => f.includes('50,000'))).toBe(true);
      });

      it('returns medium confidence when only occupant count is missing', () => {
        const result = scoreConfidence({ ...completeInput, occupantCount: 0 });
        expect(result.overall).toBe('high'); // Only -10 points, still 90
        expect(result.score).toBe(90);
      });
    });
    ```

    ### 2. src/lib/__tests__/analyzeManual.test.ts

    Test that the manual analysis path works end-to-end (rule engine integration):

    ```typescript
    import { describe, it, expect } from 'vitest';
    import { runRuleEngine } from '../ruleEngine';

    describe('Manual analysis path', () => {
      it('produces valid AnalysisResult from manual BuildingInput', () => {
        const input = {
          buildingName: 'User Office',
          buildingType: 'commercial' as const,
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
        expect(result.hazardType).toBe('moderate'); // 300m² and 20 occupants → moderate
        expect(result.complianceScore).toBe(100);
        expect(result.requiredExtinguishers.length).toBeGreaterThan(0);
        expect(result.requiredExtinguishers[0].clauseRef).toContain('IS 2190');
      });

      it('handles all hazard types from manual input', () => {
        const highInput = {
          buildingName: 'Warehouse',
          buildingType: 'commercial' as const,
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

        const result = runRuleEngine(highInput);
        expect(result.hazardType).toBe('high');
        expect(result.requiredExtinguishers.some(r => r.fireClass === 'A')).toBe(true);
        expect(result.requiredExtinguishers.some(r => r.fireClass === 'B')).toBe(true);
        expect(result.requiredExtinguishers.some(r => r.fireClass === 'F')).toBe(true);
        expect(result.requiredExtinguishers.some(r => r.fireClass === 'C')).toBe(true);
      });
    });
    ```
  </action>
  <verify>
    ```powershell
    npm test
    ```
    All existing Phase 1 tests (19) + new Phase 2 tests must pass.
  </verify>
  <done>
    - scoreConfidence tests: 5 tests covering all branches
    - Manual analysis tests: 2 tests covering moderate and high hazard
    - Total test count: 19 (Phase 1) + 7 (Phase 2) = 26+ tests
    - npm test passes with 0 failures
  </done>
</task>

<task type="checkpoint:human-verify">
  <name>Test live Gemini extraction with a real floor plan</name>
  <files>none (manual test)</files>
  <action>
    This test requires a real GEMINI_API_KEY and a sample floor plan.

    ### Steps:
    1. Ensure `.env.local` has a valid `GEMINI_API_KEY`
    2. Start dev server: `npm run dev`
    3. Test with a real image:
       ```powershell
       curl -X POST http://localhost:3000/api/analyze -F "file=@path/to/floor_plan.jpg"
       ```
    4. Verify the response contains:
       - `extraction` with all BuildingInput fields populated
       - `analysis` with hazardType, complianceScore, requiredExtinguishers
       - `confidence` with a score and any flags
       - `needsConfirmation` boolean

    ### What to look for:
    - Does Gemini extract reasonable values for floor area, floors, occupancy?
    - Does the confidence score reflect the quality of extraction?
    - Does the rule engine produce sensible results from the AI data?

    If no real floor plan is available, test with the manual endpoint instead:
    ```powershell
    $body = '{"buildingName":"Test","buildingType":"commercial","totalFloorArea":500,"numberOfFloors":2,"floorAreas":[250,250],"buildingHeight":7,"occupantCount":50,"hasKitchen":true,"cookingAreaM2":0.04,"hasFlammableLiquids":false,"hasFlammableGases":false,"hasCombustibleMetals":false,"hasElectricalHazards":true}'
    Invoke-WebRequest -Uri "http://localhost:3000/api/analyze-manual" -Method POST -ContentType "application/json" -Body $body
    ```
  </action>
  <verify>
    User visually confirms the extraction makes sense for the floor plan provided.
  </verify>
  <done>
    - Live test completed with real or synthetic floor plan
    - Extraction values verified as reasonable
    - Rule engine produced valid compliance results
  </done>
</task>

## Success Criteria
- [ ] All unit tests pass (npm test — 26+ total including Phase 1 tests)
- [ ] scoreConfidence correctly classifies high/medium/low
- [ ] Manual endpoint returns valid AnalysisResult
- [ ] Live Gemini test (if API key available) returns structured extraction
- [ ] Full pipeline: file upload → AI extraction → confidence → rule engine → response works
