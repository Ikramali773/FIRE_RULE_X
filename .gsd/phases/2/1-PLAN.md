---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: File Conversion Service + Pluggable AI Interface

## Objective
Set up GroupDocs Cloud API for DWG/PDF → PNG conversion, create a pluggable AI provider interface, and implement the GPT-4o provider. These are the two building blocks that Plan 2.2 wires together.

## Context
- `src/types/index.ts` — `BuildingInput` interface (extraction target shape)
- `.gsd/phases/2/RESEARCH.md` — Two-stage pipeline architecture
- `.gsd/DECISIONS.md` — ADR-003: fallback if AI confidence low

## Tasks

<task type="auto">
  <name>Install dependencies and configure environment</name>
  <files>
    package.json,
    .env.local,
    .env.example,
    .gitignore
  </files>
  <action>
    ### 1. Install dependencies
    ```powershell
    npm install openai groupdocs-conversion-cloud
    ```

    ### 2. Update .env.example and .env.local
    ```
    # .env.example (committed)
    OPENAI_API_KEY=your_openai_api_key_here
    GROUPDOCS_CLIENT_ID=your_groupdocs_client_id
    GROUPDOCS_CLIENT_SECRET=your_groupdocs_client_secret

    # .env.local (gitignored) — actual keys
    OPENAI_API_KEY=sk-...
    GROUPDOCS_CLIENT_ID=...
    GROUPDOCS_CLIENT_SECRET=...
    ```

    ### 3. Verify .gitignore includes .env*.local
    Next.js default .gitignore already excludes this. Verify it does.
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    Select-String -Path ".gitignore" -Pattern "env"
    ```
  </verify>
  <done>
    - openai + groupdocs-conversion-cloud installed
    - .env.example created with all required keys
    - .gitignore confirmed to exclude .env*.local
  </done>
</task>

<task type="auto">
  <name>Create file conversion service (GroupDocs DWG/PDF → PNG)</name>
  <files>
    src/lib/fileConverter.ts
  </files>
  <action>
    Create `src/lib/fileConverter.ts` that:
    1. Accepts a file buffer + mime type
    2. If already JPG/PNG — skip conversion, return as-is
    3. If DWG/DXF/PDF — upload to GroupDocs, convert to PNG, download result
    4. Returns PNG buffer + metadata

    ```typescript
    // src/lib/fileConverter.ts
    import * as groupdocs from 'groupdocs-conversion-cloud';

    const PASSTHROUGH_MIMES = ['image/png', 'image/jpeg', 'image/jpg'];
    const CONVERTIBLE_MIMES: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/vnd.dwg': 'dwg',
      'application/acad': 'dwg',
      'application/x-dwg': 'dwg',
      'application/dxf': 'dxf',
    };

    export interface ConversionResult {
      imageBuffer: Buffer;
      originalFormat: string;
      wasConverted: boolean;
      error?: string;
    }

    export async function convertToPng(
      fileBuffer: Buffer,
      mimeType: string,
      fileName: string
    ): Promise<ConversionResult> {
      // If already an image, pass through
      if (PASSTHROUGH_MIMES.includes(mimeType)) {
        return { imageBuffer: fileBuffer, originalFormat: mimeType, wasConverted: false };
      }

      const sourceFormat = CONVERTIBLE_MIMES[mimeType];
      if (!sourceFormat) {
        return {
          imageBuffer: Buffer.from(''),
          originalFormat: mimeType,
          wasConverted: false,
          error: `Unsupported file type: ${mimeType}. Accepted: PDF, DWG, DXF, JPG, PNG.`,
        };
      }

      // GroupDocs conversion
      const config = new groupdocs.Configuration(
        process.env.GROUPDOCS_CLIENT_ID!,
        process.env.GROUPDOCS_CLIENT_SECRET!
      );
      const fileApi = groupdocs.FileApi.fromConfig(config);
      const convertApi = groupdocs.ConvertApi.fromConfig(config);

      // Upload file
      const uploadPath = `uploads/${Date.now()}_${fileName}`;
      const uploadRequest = new groupdocs.UploadFileRequest(uploadPath, fileBuffer);
      await fileApi.uploadFile(uploadRequest);

      // Convert to PNG
      const settings = new groupdocs.ConvertSettings();
      settings.filePath = uploadPath;
      settings.format = 'png';
      settings.outputPath = `converted/${Date.now()}_output.png`;

      const convertRequest = new groupdocs.ConvertDocumentRequest(settings);
      const result = await convertApi.convertDocument(convertRequest);

      // Download converted file
      const downloadRequest = new groupdocs.DownloadFileRequest(result[0].path);
      const downloadResult = await fileApi.downloadFile(downloadRequest);

      // Clean up uploaded file
      const deleteRequest = new groupdocs.DeleteFileRequest(uploadPath);
      await fileApi.deleteFile(deleteRequest);

      return {
        imageBuffer: Buffer.from(downloadResult),
        originalFormat: sourceFormat,
        wasConverted: true,
      };
    }
    ```

    IMPORTANT:
    - GroupDocs uses cloud storage internally (their server, not ours)
    - Clean up uploaded files after conversion
    - The SDK may have slightly different APIs — adjust during implementation
    - For DWG files without proper MIME type, also check file extension
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    ```
  </verify>
  <done>
    - fileConverter.ts handles PNG/JPG passthrough
    - fileConverter.ts converts DWG/DXF/PDF → PNG via GroupDocs
    - Unsupported file types return clear error
    - TypeScript compiles clean
  </done>
</task>

<task type="auto">
  <name>Create pluggable AI provider interface + GPT-4o implementation</name>
  <files>
    src/lib/ai/types.ts,
    src/lib/ai/openaiProvider.ts,
    src/lib/ai/index.ts
  </files>
  <action>
    ### 1. src/lib/ai/types.ts — Provider interface

    ```typescript
    import type { BuildingInput } from '@/types';

    export interface AIExtractionResult {
      success: boolean;
      data: BuildingInput | null;
      rawResponse: string;
      provider: string;
      error?: string;
    }

    export interface AIProvider {
      name: string;
      analyzeFloorPlan(imageBase64: string, mimeType?: string): Promise<AIExtractionResult>;
    }
    ```

    ### 2. src/lib/ai/openaiProvider.ts — GPT-4o implementation

    ```typescript
    import OpenAI from 'openai';
    import type { AIProvider, AIExtractionResult } from './types';
    import type { BuildingInput } from '@/types';

    const EXTRACTION_PROMPT = `You are a fire safety engineering assistant analyzing a building floor plan image.

    Extract the following building metadata for IS 2190:2024 fire extinguisher compliance checking.
    
    RULES:
    1. Extract ONLY what you can see or reasonably infer.
    2. Set buildingType to "commercial".
    3. Estimate occupantCount: 1 person per 10m² for offices, 1 per 3m² for assembly.
    4. Estimate buildingHeight: floor count × 3.5m if not visible.
    5. Set boolean flags based on visible room labels (kitchen, server room, storage, etc.).
    6. Use 0 for any value you cannot determine.
    7. floorAreas must have exactly numberOfFloors entries.`;

    // JSON schema for structured output
    const BUILDING_INPUT_SCHEMA = {
      name: 'building_input',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          buildingName:           { type: 'string', description: 'Name or identifier' },
          buildingType:           { type: 'string', enum: ['commercial'] },
          totalFloorArea:         { type: 'number', description: 'Total area in m²' },
          numberOfFloors:         { type: 'number', description: 'Total floors' },
          floorAreas:             { type: 'array', items: { type: 'number' }, description: 'm² per floor' },
          buildingHeight:         { type: 'number', description: 'Height in metres' },
          occupantCount:          { type: 'number', description: 'Max occupants' },
          hasKitchen:             { type: 'boolean' },
          cookingAreaM2:          { type: 'number', description: 'Cooking area m²' },
          hasFlammableLiquids:    { type: 'boolean' },
          flammableLiquidsLitres: { type: 'number' },
          hasFlammableGases:      { type: 'boolean' },
          flammableGasesLitres:   { type: 'number' },
          hasCombustibleMetals:   { type: 'boolean' },
          hasElectricalHazards:   { type: 'boolean' },
        },
        required: ['buildingName', 'buildingType', 'totalFloorArea', 'numberOfFloors',
                    'floorAreas', 'buildingHeight', 'occupantCount', 'hasKitchen',
                    'cookingAreaM2', 'hasFlammableLiquids', 'flammableLiquidsLitres',
                    'hasFlammableGases', 'flammableGasesLitres', 'hasCombustibleMetals',
                    'hasElectricalHazards'],
        additionalProperties: false,
      },
    };

    export class OpenAIProvider implements AIProvider {
      name = 'gpt-4o';
      private client: OpenAI;

      constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      }

      async analyzeFloorPlan(imageBase64: string, mimeType = 'image/png'): Promise<AIExtractionResult> {
        try {
          const response = await this.client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: EXTRACTION_PROMPT },
                  {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                  },
                ],
              },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: BUILDING_INPUT_SCHEMA,
            },
          });

          const text = response.choices[0]?.message?.content ?? '';
          const parsed: BuildingInput = JSON.parse(text);
          parsed.buildingType = 'commercial'; // force MVP

          return { success: true, data: parsed, rawResponse: text, provider: this.name };
        } catch (err) {
          return {
            success: false,
            data: null,
            rawResponse: '',
            provider: this.name,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      }
    }
    ```

    ### 3. src/lib/ai/index.ts — Factory for current provider

    ```typescript
    import type { AIProvider } from './types';
    import { OpenAIProvider } from './openaiProvider';

    export type { AIProvider, AIExtractionResult } from './types';

    // Default provider — swap here to change globally
    export function getAIProvider(): AIProvider {
      return new OpenAIProvider();
    }
    ```

    This is the pluggable design: to add Gemini later, just create
    `geminiProvider.ts` implementing AIProvider and swap in index.ts.
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    ```
  </verify>
  <done>
    - AIProvider interface defined with analyzeFloorPlan method
    - OpenAIProvider implements GPT-4o with structured JSON output
    - getAIProvider() factory returns current provider (swappable)
    - TypeScript compiles clean
  </done>
</task>

## Success Criteria
- [ ] GroupDocs + OpenAI SDKs installed
- [ ] fileConverter.ts handles passthrough (PNG/JPG) and conversion (DWG/PDF)
- [ ] AIProvider interface is clean and swappable
- [ ] GPT-4o provider uses structured output with JSON schema
- [ ] `npx tsc --noEmit` compiles clean
