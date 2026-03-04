// src/lib/ai/geminiProvider.ts
// Gemini 2.0 Flash Vision Provider for Floor Plan Analysis
//
// Uses Google's Generative AI SDK with structured JSON output
// to enforce BuildingInput shape from image analysis.

import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';
import type { AIProvider, AIExtractionResult } from './types';
import type { BuildingInput } from '@/types';

const EXTRACTION_PROMPT = `You are a fire safety engineering assistant analyzing a building floor plan image.

Extract the following building metadata for IS 2190:2024 fire extinguisher compliance checking.

RULES:
1. Extract ONLY what you can see or reasonably infer from the floor plan.
2. Set buildingType to "commercial".
3. Estimate occupantCount: 1 person per 10m² for offices, 1 per 3m² for assembly areas.
4. Estimate buildingHeight: floor count × 3.5m if not visible in the plan.
5. Set boolean flags based on visible room labels (kitchen, server room, storage, electrical panel, etc.).
6. Use 0 for any numeric value you cannot determine with any confidence.
7. floorAreas array must have exactly numberOfFloors entries.
8. If this appears to be a multi-floor plan, try to identify each floor's area separately.`;

// JSON schema for structured output — matches BuildingInput interface

const BUILDING_INPUT_SCHEMA: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        buildingName: { type: SchemaType.STRING, description: 'Name or identifier of the building' },
        buildingType: { type: SchemaType.STRING, description: 'Must be "commercial"' },
        totalFloorArea: { type: SchemaType.NUMBER, description: 'Total floor area in m²' },
        numberOfFloors: { type: SchemaType.NUMBER, description: 'Total number of floors including ground' },
        floorAreas: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.NUMBER },
            description: 'Area per floor in m², index 0 = ground',
        },
        buildingHeight: { type: SchemaType.NUMBER, description: 'Building height in metres' },
        occupantCount: { type: SchemaType.NUMBER, description: 'Estimated max occupant count' },
        hasKitchen: { type: SchemaType.BOOLEAN },
        cookingAreaM2: { type: SchemaType.NUMBER, description: 'Cooking appliance area in m²' },
        hasFlammableLiquids: { type: SchemaType.BOOLEAN },
        flammableLiquidsLitres: { type: SchemaType.NUMBER },
        hasFlammableGases: { type: SchemaType.BOOLEAN },
        flammableGasesLitres: { type: SchemaType.NUMBER },
        hasCombustibleMetals: { type: SchemaType.BOOLEAN },
        hasElectricalHazards: { type: SchemaType.BOOLEAN },
    },
    required: [
        'buildingName', 'buildingType', 'totalFloorArea', 'numberOfFloors',
        'floorAreas', 'buildingHeight', 'occupantCount', 'hasKitchen',
        'cookingAreaM2', 'hasFlammableLiquids', 'flammableLiquidsLitres',
        'hasFlammableGases', 'flammableGasesLitres', 'hasCombustibleMetals',
        'hasElectricalHazards',
    ],
};

export class GeminiProvider implements AIProvider {
    name = 'gemini-2.5-flash';
    private client: GoogleGenerativeAI;

    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    async analyzeFloorPlan(imageBase64: string, mimeType = 'image/png'): Promise<AIExtractionResult> {
        const MAX_RETRIES = 2;
        let lastError = '';

        console.log(`[Gemini] Image size: ${(imageBase64.length * 0.75 / 1024).toFixed(0)} KB`);

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const model = this.client.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: BUILDING_INPUT_SCHEMA,
                    },
                });

                const result = await model.generateContent([
                    { text: EXTRACTION_PROMPT },
                    {
                        inlineData: {
                            mimeType,
                            data: imageBase64,
                        },
                    },
                ]);

                const text = result.response.text();
                if (!text) {
                    return {
                        success: false,
                        data: null,
                        rawResponse: '',
                        provider: this.name,
                        error: 'Gemini returned empty response.',
                    };
                }

                const parsed: BuildingInput = JSON.parse(text);

                // Enforce MVP constraints
                parsed.buildingType = 'commercial';

                // Fix floor areas if missing
                if (!parsed.floorAreas || parsed.floorAreas.length === 0) {
                    parsed.floorAreas = [parsed.totalFloorArea || 0];
                    parsed.numberOfFloors = 1;
                }

                return {
                    success: true,
                    data: parsed,
                    rawResponse: text,
                    provider: this.name,
                };
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown Gemini error';
                lastError = message;

                // Retry on 429 (rate limit) errors
                if (message.includes('429') && attempt < MAX_RETRIES) {
                    // Try to extract retry delay from error, default to exponential backoff
                    const retryMatch = message.match(/retry in (\d+)/i);
                    const waitSeconds = retryMatch ? parseInt(retryMatch[1], 10) + 2 : (attempt + 1) * 30;
                    console.log(`[Gemini] Rate limited. Retrying in ${waitSeconds}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
                    await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
                    continue;
                }

                // Non-retryable error or retries exhausted
                break;
            }
        }

        return {
            success: false,
            data: null,
            rawResponse: '',
            provider: this.name,
            error: lastError,
        };
    }
}
