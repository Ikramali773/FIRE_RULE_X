---
phase: 2
plan: 2
wave: 1
---

# Plan 2.2: Confidence Scoring + Manual Override Endpoint

## Objective
Add a confidence scoring system to the AI extraction to determine if user confirmation is needed (ADR-003). Create a `/api/analyze-manual` endpoint that accepts user-corrected `BuildingInput` directly (bypassing AI). This enables the fallback flow: AI extracts → low confidence → show form → user corrects → re-analyze.

## Context
- `src/lib/extractBuildingData.ts` — From Plan 2.1 (returns raw extraction)
- `src/types/index.ts` — `BuildingInput` interface
- `src/lib/ruleEngine.ts` — Phase 1 rule engine
- `.gsd/DECISIONS.md` — ADR-003: show confirmation form if AI confidence is low

## Tasks

<task type="auto">
  <name>Add confidence scoring to extraction and enhance types</name>
  <files>
    src/lib/extractBuildingData.ts,
    src/types/index.ts
  </files>
  <action>
    ### 1. Add extraction-related types to src/types/index.ts

    Append to the existing types file:

    ```typescript
    // --- Phase 2: Extraction Types ---

    export type ConfidenceLevel = 'high' | 'medium' | 'low';

    export interface ExtractionConfidence {
      overall: ConfidenceLevel;
      score: number;              // 0-100
      flags: string[];            // reasons for low confidence
    }

    export interface ExtractionResult {
      success: boolean;
      data: BuildingInput | null;
      confidence: ExtractionConfidence;
      rawResponse: string;
      error?: string;
    }

    export interface AnalyzeResponse {
      extraction: BuildingInput;
      analysis: AnalysisResult;
      confidence: ExtractionConfidence;
      needsConfirmation: boolean;  // true if confidence < 70
      meta: {
        fileName: string;
        fileSize: number;
        fileType: string;
        analyzedAt: string;
      };
    }
    ```

    ### 2. Add confidence scoring to extractBuildingData.ts

    After Gemini returns the parsed data, score it:

    ```typescript
    function scoreConfidence(data: BuildingInput): ExtractionConfidence {
      const flags: string[] = [];
      let score = 100;

      // Critical field checks
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
      if (data.floorAreas && data.numberOfFloors && data.floorAreas.length !== data.numberOfFloors) {
        flags.push(`Floor areas count (${data.floorAreas.length}) doesn't match numberOfFloors (${data.numberOfFloors})`);
        score -= 15;
      }
      if (!data.occupantCount || data.occupantCount <= 0) {
        flags.push('Occupant count missing — will default to area-based estimate');
        score -= 10;
      }
      if (!data.buildingHeight || data.buildingHeight <= 0) {
        flags.push('Building height missing — using floor-count estimate');
        score -= 10;
      }

      // Plausibility checks
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
      const overall: ConfidenceLevel = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

      return { overall, score, flags };
    }
    ```

    Update `extractBuildingData` to return confidence alongside data. Move the `ExtractionResult` interface from this file into types/index.ts (use the one from types).

    Update the /api/analyze route (from Plan 2.1) to include `needsConfirmation: confidence.score < 70` in the response.
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    ```
    Must compile clean.
  </verify>
  <done>
    - ExtractionConfidence type added to types/index.ts
    - scoreConfidence function checks critical fields + plausibility
    - /api/analyze response includes `confidence` and `needsConfirmation` fields
    - confidence.score >= 70 → needsConfirmation: false (auto-proceed)
    - confidence.score < 70 → needsConfirmation: true (show form)
  </done>
</task>

<task type="auto">
  <name>Create /api/analyze-manual endpoint for user-corrected input</name>
  <files>
    src/app/api/analyze-manual/route.ts
  </files>
  <action>
    Create a POST endpoint that accepts a JSON body directly as `BuildingInput` (no file upload).
    This is the fallback path when AI confidence is low and the user corrects the data.

    ```typescript
    // src/app/api/analyze-manual/route.ts
    import { NextRequest, NextResponse } from 'next/server';
    import { runRuleEngine } from '@/lib/ruleEngine';
    import type { BuildingInput } from '@/types';

    export async function POST(request: NextRequest) {
      try {
        const body: BuildingInput = await request.json();

        // Basic validation
        if (!body.buildingType || !body.totalFloorArea || !body.floorAreas) {
          return NextResponse.json(
            { error: 'Missing required fields: buildingType, totalFloorArea, floorAreas' },
            { status: 400 }
          );
        }

        // Force commercial for MVP
        body.buildingType = 'commercial';

        // Run rule engine
        const analysis = runRuleEngine(body);

        return NextResponse.json({
          extraction: body,
          analysis,
          confidence: { overall: 'high', score: 100, flags: [] },
          needsConfirmation: false,
          meta: {
            fileName: 'manual_input',
            fileSize: 0,
            fileType: 'application/json',
            analyzedAt: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error('Manual analysis error:', err);
        return NextResponse.json(
          { error: 'Invalid input. Ensure all required BuildingInput fields are provided.' },
          { status: 400 }
        );
      }
    }
    ```

    This endpoint:
    - Skips AI vision entirely
    - Accepts the BuildingInput shape directly
    - Returns the same response format as /api/analyze
    - Confidence is always 100% (user-provided data)
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    ```

    Manual test (with dev server running):
    ```powershell
    $body = '{"buildingName":"Test Office","buildingType":"commercial","totalFloorArea":500,"numberOfFloors":2,"floorAreas":[250,250],"buildingHeight":7,"occupantCount":50,"hasKitchen":false,"hasFlammableLiquids":false,"hasFlammableGases":false,"hasCombustibleMetals":false,"hasElectricalHazards":true}'
    Invoke-WebRequest -Uri "http://localhost:3000/api/analyze-manual" -Method POST -ContentType "application/json" -Body $body | Select-Object -ExpandProperty Content
    ```
    Should return JSON with analysis.hazardType, analysis.complianceScore, etc.
  </verify>
  <done>
    - /api/analyze-manual accepts JSON BuildingInput
    - Returns same AnalyzeResponse shape as /api/analyze
    - Input validation rejects missing required fields
    - npx tsc --noEmit clean
    - Manual test returns valid AnalysisResult
  </done>
</task>

## Success Criteria
- [ ] Confidence scoring correctly flags missing/zero critical fields
- [ ] /api/analyze returns `needsConfirmation: true` when confidence < 70
- [ ] /api/analyze-manual works without any file upload
- [ ] Both endpoints return identical response shape (AnalyzeResponse)
- [ ] npx tsc --noEmit compiles clean
