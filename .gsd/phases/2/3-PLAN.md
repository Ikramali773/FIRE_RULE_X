---
phase: 2
plan: 3
wave: 2
---

# Plan 2.3: Unit Tests + Integration Validation

## Objective
Write unit tests for confidence scoring, test manual analysis path, and validate the full pipeline with a live API test (if keys available).

## Context
- `src/lib/confidenceScorer.ts` — From Plan 2.2
- `src/lib/ruleEngine.ts` — Phase 1 (19 tests already passing)
- `vitest.config.ts` — Vitest already configured from Phase 1
- All Phase 2 source files from Plans 2.1 and 2.2

## Tasks

<task type="auto">
  <name>Write unit tests for confidence scoring and manual analysis</name>
  <files>
    src/lib/__tests__/confidenceScorer.test.ts,
    src/lib/__tests__/analyzeManual.test.ts
  </files>
  <action>
    ### 1. src/lib/__tests__/confidenceScorer.test.ts

    Test the scoreConfidence function across all branches:

    - Complete valid input → high confidence (100)
    - Missing totalFloorArea → score drops by 30
    - Missing floor count → score drops by 20
    - Floor areas mismatch → flag generated
    - Implausible values (area > 50K) → flag generated
    - Missing only occupant count → still high (90 → above 70)
    - Multiple missing critical fields → low confidence

    ### 2. src/lib/__tests__/analyzeManual.test.ts

    Test the manual analysis path end-to-end:

    - Valid commercial input → moderate hazard → correct compliance
    - High-hazard warehouse → all extinguisher classes present
    - Input with all hazard flags → violations for combustible metals
    - Missing floorAreas or totalFloorArea → error handling
  </action>
  <verify>
    ```powershell
    npm test
    ```
    Phase 1 (19 tests) + Phase 2 tests must all pass.
  </verify>
  <done>
    - confidenceScorer tests: 7+ test cases covering all scoring branches
    - analyzeManual tests: 4+ test cases for manual input path
    - Total: 19 (Phase 1) + 11+ (Phase 2) = 30+ tests
    - npm test passes with 0 failures
  </done>
</task>

<task type="checkpoint:human-verify">
  <name>Live end-to-end test with real API keys</name>
  <files>none (manual test)</files>
  <action>
    Requires real API keys in .env.local:
    - OPENAI_API_KEY (for GPT-4o)
    - GROUPDOCS_CLIENT_ID + GROUPDOCS_CLIENT_SECRET (for file conversion)

    ### Test 1: Manual endpoint (no API keys needed)
    ```powershell
    npm run dev
    # In another terminal:
    $body = '{"buildingName":"Test Office","buildingType":"commercial","totalFloorArea":500,"numberOfFloors":2,"floorAreas":[250,250],"buildingHeight":7,"occupantCount":50,"hasKitchen":true,"cookingAreaM2":0.04,"hasFlammableLiquids":false,"hasFlammableGases":false,"hasCombustibleMetals":false,"hasElectricalHazards":true}'
    Invoke-WebRequest -Uri "http://localhost:3000/api/analyze-manual" -Method POST -ContentType "application/json" -Body $body | Select-Object -ExpandProperty Content
    ```

    ### Test 2: File upload with AI (requires API keys)
    ```powershell
    curl -X POST http://localhost:3000/api/analyze -F "file=@path/to/floor_plan.jpg"
    ```

    ### Test 3: DWG conversion (requires GroupDocs keys)
    ```powershell
    curl -X POST http://localhost:3000/api/analyze -F "file=@path/to/floor_plan.dwg"
    ```

    ### What to verify:
    - Response has extraction, analysis, confidence, needsConfirmation fields
    - Confidence score reflects extraction quality
    - Rule engine output has correct hazardType and extinguisher requirements
    - DWG files get converted to PNG before AI analysis
  </action>
  <verify>
    User confirms end-to-end pipeline works with real floor plan.
  </verify>
  <done>
    - Manual endpoint returns valid compliance results
    - AI endpoint extracts reasonable building data from floor plan
    - DWG conversion + AI analysis pipeline works
    - Confidence scoring flags unreliable extractions
  </done>
</task>

## Success Criteria
- [ ] All unit tests pass (`npm test` → 30+ total)
- [ ] Confidence scorer correctly assigns high/medium/low
- [ ] Manual endpoint returns valid AnalysisResult
- [ ] Live AI test (if keys available) extracts structured data
- [ ] DWG → PNG → GPT-4o → JSON → rule engine pipeline works
