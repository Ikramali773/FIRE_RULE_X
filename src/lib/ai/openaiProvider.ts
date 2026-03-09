// src/lib/ai/openaiProvider.ts
// GPT-4o Vision Provider for Floor Plan Analysis
//
// Uses OpenAI's structured output (response_format: json_schema)
// to enforce BuildingInput shape from image analysis.

import OpenAI from 'openai';
import type { AIProvider, AIExtractionResult } from './types';
import type { BuildingInput } from '@/types';

const EXTRACTION_PROMPT = `You are a fire safety engineering assistant analyzing a building floor plan image.

Extract the following building metadata for IS 2190:2024 fire extinguisher compliance checking.

RULES:
1. Extract ONLY what you can see or reasonably infer from the floor plan.
2. Determine buildingType naturally based on the plan (e.g., 'Hospital', 'Office', 'Residential', 'School', 'Mall', 'Factory', 'Warehouse').
3. Estimate occupantCount: 1 person per 10m² for offices, 1 per 3m² for assembly areas.
4. Estimate buildingHeight: floor count × 3.5m if not visible in the plan.
5. Set boolean flags based on visible room labels (kitchen, server room, storage, electrical panel, etc.).
6. Use 0 for any numeric value you cannot determine with any confidence.
7. floorAreas array must have exactly numberOfFloors entries.
8. If this appears to be a multi-floor plan, try to identify each floor's area separately.`;

// JSON schema for structured output — matches BuildingInput interface
const BUILDING_INPUT_SCHEMA = {
    name: 'building_input',
    strict: true,
    schema: {
        type: 'object' as const,
        properties: {
            buildingName: { type: 'string' as const, description: 'Name or identifier of the building' },
            buildingType: { type: 'string' as const, description: 'General functional type of the building (e.g., Office, Hospital, Residential, Mall, Factory, School)' },
            totalFloorArea: { type: 'number' as const, description: 'Total floor area in m²' },
            numberOfFloors: { type: 'number' as const, description: 'Total number of floors including ground' },
            floorAreas: { type: 'array' as const, items: { type: 'number' as const }, description: 'Area per floor in m², index 0 = ground' },
            buildingHeight: { type: 'number' as const, description: 'Building height in metres' },
            occupantCount: { type: 'number' as const, description: 'Estimated max occupant count' },
            hasKitchen: { type: 'boolean' as const },
            cookingAreaM2: { type: 'number' as const, description: 'Cooking appliance area in m²' },
            hasFlammableLiquids: { type: 'boolean' as const },
            flammableLiquidsLitres: { type: 'number' as const },
            hasFlammableGases: { type: 'boolean' as const },
            flammableGasesLitres: { type: 'number' as const },
            hasCombustibleMetals: { type: 'boolean' as const },
            hasElectricalHazards: { type: 'boolean' as const },
        },
        required: [
            'buildingName', 'buildingType', 'totalFloorArea', 'numberOfFloors',
            'floorAreas', 'buildingHeight', 'occupantCount', 'hasKitchen',
            'cookingAreaM2', 'hasFlammableLiquids', 'flammableLiquidsLitres',
            'hasFlammableGases', 'flammableGasesLitres', 'hasCombustibleMetals',
            'hasElectricalHazards',
        ],
        additionalProperties: false as const,
    },
};

export class OpenAIProvider implements AIProvider {
    name = 'gpt-4o';
    private client: OpenAI;

    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
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
                                image_url: {
                                    url: `data:${mimeType};base64,${imageBase64}`,
                                    detail: 'high',
                                },
                            },
                        ],
                    },
                ],
                response_format: {
                    type: 'json_schema',
                    json_schema: BUILDING_INPUT_SCHEMA,
                },
                max_tokens: 2000,
            });

            const text = response.choices[0]?.message?.content ?? '';
            if (!text) {
                return {
                    success: false,
                    data: null,
                    rawResponse: '',
                    provider: this.name,
                    error: 'GPT-4o returned empty response.',
                };
            }

            const parsed: BuildingInput = JSON.parse(text);

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
            const message = err instanceof Error ? err.message : 'Unknown OpenAI error';
            return {
                success: false,
                data: null,
                rawResponse: '',
                provider: this.name,
                error: message,
            };
        }
    }
}
