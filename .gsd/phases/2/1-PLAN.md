---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: API Route + Gemini Vision Extraction

## Objective
Create the `/api/analyze` Next.js API route that accepts a PDF or image file upload, sends it to **Gemini 2.5 Flash** for building metadata extraction, and returns structured `BuildingInput` data. This is the core pipeline — file in, structured data out.

## Context
- `src/types/index.ts` — `BuildingInput` interface defines our extraction target shape
- `.gsd/DECISIONS.md` — ADR-003: AI Vision with User Confirmation Fallback
- `.gsd/SPEC.md` — MVP accepts PDF, JPG, PNG; commercial buildings only
- No file storage needed — in-memory processing (base64 → Gemini → JSON)

## Tasks

<task type="auto">
  <name>Install dependencies and set up environment configuration</name>
  <files>
    package.json,
    .env.local,
    .env.example,
    src/lib/gemini.ts
  </files>
  <action>
    ### 1. Install @google/genai SDK
    ```powershell
    npm install @google/genai
    ```

    ### 2. Create .env.example (committed) and .env.local (gitignored)
    ```
    # .env.example
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

    ```
    # .env.local — DO NOT COMMIT
    GEMINI_API_KEY=<actual key from https://aistudio.google.com/apikey>
    ```

    Verify `.env*.local` is already in .gitignore (Next.js default).

    ### 3. Create src/lib/gemini.ts — Gemini client singleton

    ```typescript
    // src/lib/gemini.ts
    import { GoogleGenAI } from '@google/genai';

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    export const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    export const GEMINI_MODEL = 'gemini-2.5-flash';
    ```

    IMPORTANT: Use `@google/genai` (the new unified SDK), NOT the deprecated `@google/generative-ai`.
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    ```
    Must compile without errors. Also verify .env.example exists.
  </verify>
  <done>
    - @google/genai installed in package.json
    - .env.example committed, .env.local gitignored
    - src/lib/gemini.ts exports genai client and model name
    - TypeScript compiles clean
  </done>
</task>

<task type="auto">
  <name>Create /api/analyze route with Gemini extraction</name>
  <files>
    src/app/api/analyze/route.ts,
    src/lib/extractBuildingData.ts
  </files>
  <action>
    ### 1. src/lib/extractBuildingData.ts — Extraction logic

    Sends an image/PDF to Gemini with a structured prompt and enforces `BuildingInput` JSON schema.

    ```typescript
    // src/lib/extractBuildingData.ts
    import { genai, GEMINI_MODEL } from './gemini';
    import type { BuildingInput } from '@/types';

    // Supported MIME types
    const SUPPORTED_MIME: Record<string, string> = {
      'application/pdf': 'application/pdf',
      'image/jpeg': 'image/jpeg',
      'image/jpg': 'image/jpeg',
      'image/png': 'image/png',
    };

    // JSON Schema for structured output (matches BuildingInput)
    const BUILDING_INPUT_SCHEMA = {
      type: 'object' as const,
      properties: {
        buildingName:           { type: 'string' as const, description: 'Name or identifier of the building' },
        buildingType:           { type: 'string' as const, enum: ['commercial'], description: 'Must be commercial for MVP' },
        totalFloorArea:         { type: 'number' as const, description: 'Total floor area in m²' },
        numberOfFloors:         { type: 'number' as const, description: 'Total number of floors including ground' },
        floorAreas:             { type: 'array' as const, items: { type: 'number' as const }, description: 'Area of each floor in m², index 0 = ground floor' },
        buildingHeight:         { type: 'number' as const, description: 'Building height in metres' },
        occupantCount:          { type: 'number' as const, description: 'Estimated max occupant count' },
        hasKitchen:             { type: 'boolean' as const, description: 'Whether building has a kitchen or cooking area' },
        cookingAreaM2:          { type: 'number' as const, description: 'Cooking appliance area in m², if hasKitchen is true' },
        hasFlammableLiquids:    { type: 'boolean' as const, description: 'Whether flammable liquids are stored on premises' },
        flammableLiquidsLitres: { type: 'number' as const, description: 'Litres of flammable liquids, if present' },
        hasFlammableGases:      { type: 'boolean' as const, description: 'Whether flammable gases are present' },
        flammableGasesLitres:   { type: 'number' as const, description: 'Litres of flammable gases, if present' },
        hasCombustibleMetals:   { type: 'boolean' as const, description: 'Whether combustible metals are handled' },
        hasElectricalHazards:   { type: 'boolean' as const, description: 'Whether there are server rooms, electrical panels, or HV equipment' },
      },
      required: [
        'buildingName', 'buildingType', 'totalFloorArea', 'numberOfFloors',
        'floorAreas', 'buildingHeight', 'occupantCount', 'hasKitchen',
        'hasFlammableLiquids', 'hasFlammableGases', 'hasCombustibleMetals',
        'hasElectricalHazards',
      ],
    };

    const EXTRACTION_PROMPT = `You are a fire safety engineering assistant. Analyze this building floor plan and extract the following building metadata for IS 2190:2024 fire extinguisher compliance checking.

RULES:
1. Extract ONLY what you can see or reasonably infer from the floor plan.
2. If the building type is not commercial (e.g., residential, industrial), set buildingType to "commercial" anyway — the system only supports commercial buildings.
3. For occupantCount, estimate based on visible rooms and industry standards (1 person per 10m² for offices, 1 per 3m² for assembly).
4. For buildingHeight, estimate from floor count × 3.5m per floor if not shown.
5. Set boolean flags (hasKitchen, hasFlammableLiquids, etc.) based on visible room labels or area types.
6. If you cannot determine a numeric value with any confidence, use 0.
7. floorAreas array must have exactly numberOfFloors entries.

Respond with ONLY the structured JSON, no explanations.`;

    export interface ExtractionResult {
      success: boolean;
      data: BuildingInput | null;
      rawResponse: string;
      error?: string;
    }

    export async function extractBuildingData(
      fileBuffer: Buffer,
      mimeType: string
    ): Promise<ExtractionResult> {
      const validMime = SUPPORTED_MIME[mimeType];
      if (!validMime) {
        return {
          success: false,
          data: null,
          rawResponse: '',
          error: `Unsupported file type: ${mimeType}. Accepted: PDF, JPG, PNG.`,
        };
      }

      const base64Data = fileBuffer.toString('base64');

      try {
        const response = await genai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                { text: EXTRACTION_PROMPT },
                {
                  inlineData: {
                    mimeType: validMime,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: BUILDING_INPUT_SCHEMA,
          },
        });

        const text = response.text ?? '';

        const parsed: BuildingInput = JSON.parse(text);

        // Validate critical fields
        if (!parsed.floorAreas || parsed.floorAreas.length === 0) {
          parsed.floorAreas = [parsed.totalFloorArea];
          parsed.numberOfFloors = 1;
        }

        // Force commercial for MVP
        parsed.buildingType = 'commercial';

        return {
          success: true,
          data: parsed,
          rawResponse: text,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown AI extraction error';
        return {
          success: false,
          data: null,
          rawResponse: '',
          error: message,
        };
      }
    }
    ```

    ### 2. src/app/api/analyze/route.ts — Upload endpoint

    ```typescript
    // src/app/api/analyze/route.ts
    import { NextRequest, NextResponse } from 'next/server';
    import { extractBuildingData } from '@/lib/extractBuildingData';
    import { runRuleEngine } from '@/lib/ruleEngine';

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    export async function POST(request: NextRequest) {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
          return NextResponse.json(
            { error: 'No file provided. Upload a PDF or image.' },
            { status: 400 }
          );
        }

        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.` },
            { status: 400 }
          );
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Step 1: Extract building data via Gemini
        const extraction = await extractBuildingData(buffer, file.type);

        if (!extraction.success || !extraction.data) {
          return NextResponse.json(
            {
              error: extraction.error || 'Failed to extract building data from the uploaded file.',
              step: 'extraction',
            },
            { status: 422 }
          );
        }

        // Step 2: Run rule engine on extracted data
        const analysisResult = runRuleEngine(extraction.data);

        // Step 3: Return combined result
        return NextResponse.json({
          extraction: extraction.data,
          analysis: analysisResult,
          meta: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            analyzedAt: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error('Analysis error:', err);
        return NextResponse.json(
          { error: 'Internal server error during analysis.' },
          { status: 500 }
        );
      }
    }
    ```

    IMPORTANT:
    - Do NOT use `bodyParser: false` — App Router handles this natively
    - Do NOT install multer/formidable — NextRequest.formData() is sufficient
    - The endpoint performs extraction AND rule engine check in one call
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    ```
    Must compile without errors.

    Then manually test with curl (requires GEMINI_API_KEY in .env.local):
    ```powershell
    npm run dev
    # In another terminal:
    curl -X POST http://localhost:3000/api/analyze -F "file=@test_floorplan.jpg"
    ```
  </verify>
  <done>
    - /api/analyze route created and compiles
    - extractBuildingData.ts sends file to Gemini and parses structured JSON
    - Route performs extraction → rule engine → response in one call
    - Error handling for: missing file, oversized file, unsupported type, AI failure
    - npx tsc --noEmit clean
  </done>
</task>

## Success Criteria
- [ ] `npx tsc --noEmit` compiles clean after all files created
- [ ] /api/analyze accepts POST with multipart file
- [ ] Gemini returns structured BuildingInput matching our schema
- [ ] Rule engine runs on extracted data and returns AnalysisResult
- [ ] Error responses have clear messages for all failure modes
