---
phase: 2
plan: 2
wave: 1
---

# Plan 2.2: API Routes + Confidence Scoring + Manual Fallback

## Objective
Wire the conversion service and AI provider into Next.js API routes. Add confidence scoring for AI extractions. Create the manual fallback endpoint for user-corrected data. This completes the full pipeline: upload → convert → analyze → score → rule engine → response.

## Context
- `src/lib/fileConverter.ts` — From Plan 2.1 (DWG/PDF → PNG)
- `src/lib/ai/index.ts` — From Plan 2.1 (pluggable AI provider)
- `src/lib/ruleEngine.ts` — Phase 1 rule engine
- `src/types/index.ts` — BuildingInput, AnalysisResult

## Tasks

<task type="auto">
  <name>Add extraction types and confidence scoring</name>
  <files>
    src/types/index.ts,
    src/lib/confidenceScorer.ts
  </files>
  <action>
    ### 1. Append to src/types/index.ts

    Add the Phase 2 types after the existing content:

    ```typescript
    // --- Phase 2: Extraction & API Types ---

    export type ConfidenceLevel = 'high' | 'medium' | 'low';

    export interface ExtractionConfidence {
      overall: ConfidenceLevel;
      score: number;              // 0-100
      flags: string[];            // reasons for low confidence
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
        originalFormat: string;
        wasConverted: boolean;
        aiProvider: string;
        analyzedAt: string;
      };
    }
    ```

    Update the `analysisMethod` field in `AnalysisResult`:
    ```typescript
    analysisMethod: 'structured_input' | 'ai_vision' | 'manual_override';
    ```

    ### 2. Create src/lib/confidenceScorer.ts

    ```typescript
    import type { BuildingInput, ExtractionConfidence, ConfidenceLevel } from '@/types';

    export function scoreConfidence(data: BuildingInput): ExtractionConfidence {
      const flags: string[] = [];
      let score = 100;

      // Critical fields
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
      if (data.floorAreas && data.numberOfFloors &&
          data.floorAreas.length !== data.numberOfFloors) {
        flags.push(`Floor areas count (${data.floorAreas.length}) doesn't match numberOfFloors (${data.numberOfFloors})`);
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

      // Plausibility checks
      if (data.totalFloorArea > 50000) {
        flags.push('Total area > 50,000 m² — unusually large');
        score -= 10;
      }
      if (data.numberOfFloors > 20) {
        flags.push('More than 20 floors — verify');
        score -= 5;
      }
      if (data.occupantCount > 5000) {
        flags.push('Occupant count > 5000 — verify');
        score -= 5;
      }

      score = Math.max(0, score);
      const overall: ConfidenceLevel =
        score >= 70 ? 'high' :
        score >= 40 ? 'medium' : 'low';

      return { overall, score, flags };
    }
    ```
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    ```
  </verify>
  <done>
    - ExtractionConfidence, AnalyzeResponse types added
    - scoreConfidence checks critical fields + plausibility
    - threshold: high ≥70, medium 40-69, low <40
  </done>
</task>

<task type="auto">
  <name>Create /api/analyze and /api/analyze-manual routes</name>
  <files>
    src/app/api/analyze/route.ts,
    src/app/api/analyze-manual/route.ts
  </files>
  <action>
    ### 1. src/app/api/analyze/route.ts — Full pipeline

    ```typescript
    import { NextRequest, NextResponse } from 'next/server';
    import { convertToPng } from '@/lib/fileConverter';
    import { getAIProvider } from '@/lib/ai';
    import { scoreConfidence } from '@/lib/confidenceScorer';
    import { runRuleEngine } from '@/lib/ruleEngine';
    import type { AnalyzeResponse } from '@/types';

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    export async function POST(request: NextRequest) {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
          return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
        }
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB.` },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Stage 1: Convert to PNG (if needed)
        const conversion = await convertToPng(buffer, file.type, file.name);
        if (conversion.error) {
          return NextResponse.json({ error: conversion.error, step: 'conversion' }, { status: 422 });
        }

        // Stage 2: AI extraction
        const aiProvider = getAIProvider();
        const imageBase64 = conversion.imageBuffer.toString('base64');
        const extraction = await aiProvider.analyzeFloorPlan(imageBase64);

        if (!extraction.success || !extraction.data) {
          return NextResponse.json(
            { error: extraction.error || 'AI extraction failed.', step: 'ai_extraction' },
            { status: 422 }
          );
        }

        // Stage 3: Confidence scoring
        const confidence = scoreConfidence(extraction.data);
        const needsConfirmation = confidence.score < 70;

        // Stage 4: Rule engine
        const analysis = runRuleEngine(extraction.data);
        // Override analysis method 
        (analysis as { analysisMethod: string }).analysisMethod = 'ai_vision';

        const response: AnalyzeResponse = {
          extraction: extraction.data,
          analysis,
          confidence,
          needsConfirmation,
          meta: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            originalFormat: conversion.originalFormat,
            wasConverted: conversion.wasConverted,
            aiProvider: aiProvider.name,
            analyzedAt: new Date().toISOString(),
          },
        };

        return NextResponse.json(response);
      } catch (err) {
        console.error('Analysis error:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
      }
    }
    ```

    ### 2. src/app/api/analyze-manual/route.ts — Manual fallback

    ```typescript
    import { NextRequest, NextResponse } from 'next/server';
    import { runRuleEngine } from '@/lib/ruleEngine';
    import type { BuildingInput, AnalyzeResponse } from '@/types';

    export async function POST(request: NextRequest) {
      try {
        const body: BuildingInput = await request.json();

        if (!body.totalFloorArea || !body.floorAreas) {
          return NextResponse.json(
            { error: 'Missing: totalFloorArea, floorAreas' },
            { status: 400 }
          );
        }

        body.buildingType = 'commercial';
        const analysis = runRuleEngine(body);
        (analysis as { analysisMethod: string }).analysisMethod = 'manual_override';

        const response: AnalyzeResponse = {
          extraction: body,
          analysis,
          confidence: { overall: 'high', score: 100, flags: [] },
          needsConfirmation: false,
          meta: {
            fileName: 'manual_input',
            fileSize: 0,
            fileType: 'application/json',
            originalFormat: 'json',
            wasConverted: false,
            aiProvider: 'none',
            analyzedAt: new Date().toISOString(),
          },
        };

        return NextResponse.json(response);
      } catch (err) {
        console.error('Manual analysis error:', err);
        return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
      }
    }
    ```
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    ```
  </verify>
  <done>
    - /api/analyze: upload → convert → AI → confidence → rule engine
    - /api/analyze-manual: JSON input → rule engine (skip AI)
    - Both return identical AnalyzeResponse shape
    - Error handling for all failure modes
  </done>
</task>

## Success Criteria
- [ ] `npx tsc --noEmit` compiles clean
- [ ] /api/analyze accepts multipart file upload (DWG, PDF, JPG, PNG)
- [ ] File conversion runs for DWG/PDF, skipped for JPG/PNG
- [ ] GPT-4o returns structured BuildingInput
- [ ] Confidence scoring flags missing/implausible fields
- [ ] /api/analyze-manual works with JSON body directly
- [ ] Both endpoints return same AnalyzeResponse shape
