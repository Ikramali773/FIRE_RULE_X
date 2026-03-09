// src/lib/ai/geminiProvider.ts
// Gemini 2.5 Flash Vision Provider for Floor Plan Analysis
//
// Uses Google's Generative AI SDK with structured JSON output
// to enforce BuildingInput shape from image analysis.
// temperature=0 for maximum consistency between runs.

import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';
import type { AIProvider, AIExtractionResult } from './types';
import type { BuildingInput } from '@/types';

// ── System instruction: sets the model's role ────────────────────────
const SYSTEM_INSTRUCTION = `You are an expert fire safety engineer and building surveyor with 20 years of experience analyzing floor plans per Indian standards (IS 2190:2024, NBC 2016 Part IV). You produce precise, deterministic building metadata from floor plan images. You never guess — you estimate methodically using dimensional reasoning and visual cues.`;

// ── Extraction prompt: detailed, structured, with estimation anchors ─
const EXTRACTION_PROMPT = `Analyze this building floor plan image and extract building metadata for IS 2190:2024 fire extinguisher compliance and NBC 2016 Part IV checking.

## STEP 1: DIMENSIONAL REASONING (do this first)

Before extracting any values, systematically analyze the image:

1. **Look for scale indicators**: dimension lines, scale bars, grid markings, or labeled dimensions on walls/rooms.
2. **If no explicit dimensions**: use these reference anchors to estimate:
   - Standard single door width: ~0.9m
   - Standard double door width: ~1.5m
   - Standard corridor width: ~1.5–2.0m
   - Standard desk: ~1.5m × 0.75m
   - Standard parking space: ~2.5m × 5.0m
   - Typical toilet stall: ~1.0m × 1.5m
   - Standard office room: ~12–20m²
   - Standard bedroom: ~12–15m²
   - Standard classroom: ~50–60m²
3. **Count rooms and estimate areas** for each identifiable space.
4. **Sum room areas** to get total floor area — do NOT wildly guess a round number.
5. **Identify floor count**: look for floor labels (Ground, First, Second), staircase indicators, or separate plan views per floor.

## STEP 2: ROOM-TYPE → FEATURE MAPPING

Scan ALL room labels/annotations in the plan. Map them to building features using this table:

| Room Labels / Keywords | Feature to Set |
|---|---|
| Kitchen, Pantry, Canteen, Cafeteria, Food Court | hasKitchen = true; estimate cookingAreaM2 |
| Server Room, UPS Room, Electrical Panel, Switchgear, DB Room, MCC Room | hasElectricalHazards = true |
| Chemical Store, Paint Store, Fuel Store, Generator Room with fuel | hasFlammableLiquids = true; estimate litres |
| Gas Bank, LPG Store, Gas Manifold | hasFlammableGases = true; estimate litres |
| Workshop (metalworking), Foundry, Welding Bay | hasCombustibleMetals = true |
| Sprinkler riser, Sprinkler zone labels, Sprinkler heads in legend | hasSprinklers = true |

If a room type is NOT visible anywhere in the plan, set the corresponding boolean to **false** and the numeric value to **0**.

## STEP 3: OCCUPANCY CLASSIFICATION (NBC 2016 Part IV Section 3.1)

Classify the building into the CORRECT group based on its PRIMARY use:

| Group | Use | Common Plan Indicators | Typical Subdivisions |
|---|---|---|---|
| A – Residential | Living/sleeping quarters | Bedrooms, apartments, dwelling units | A-1 (lodging ≤40), A-4 (apartments), A-5 (hotels >40) |
| B – Educational | Teaching/training | Classrooms, labs, lecture halls | B-1 (≤100 students), B-2 (>100 students) |
| C – Institutional | Medical/detention | Patient rooms, wards, cells | C-1 (hospitals), C-2 (nursing), C-3 (prisons) |
| D – Assembly | ≥50 persons gather | Auditoriums, theaters, sports | D-1 (theater >1000), D-4 (hall <300), D-5 (outdoor) |
| E – Business | Offices/professional | Office rooms, conference rooms, cubicles | E-1 (offices/banks), E-2 (labs), E-3 (data centers) |
| F – Mercantile | Retail/trade | Shops, display areas, cash counters | F-1 (retail ≤500m²), F-2 (retail >500m²) |
| G – Industrial | Manufacturing | Production floors, assembly lines, machines | G-1 (low hazard), G-2 (moderate), G-3 (high hazard) |
| H – Storage | Warehousing | Racking, loading docks, storage bays | H |
| J – Hazardous | Explosive/toxic | Special containment, blast walls | J |

**If the plan shows mostly offices/cubicles → E-1. Hotel rooms → A-5. Hospital wards → C-1.**

## STEP 4: CONSTRUCTION TYPE

- **type12** (fire-resistive/non-combustible): RCC frame, steel frame, concrete walls, multi-story buildings. **Default for plans showing concrete/RCC structure.**
- **type34** (ordinary/wood-frame): Load-bearing brick/stone walls, timber frame, single-story sheds. Only use if timber or lightweight framing is clearly visible.

## EXTRACTION RULES

1. Determine buildingType naturally based on the plan (e.g., 'Hospital', 'Office', 'Residential', 'School', 'Mall', 'Factory', 'Warehouse').
2. Estimate occupantCount: 1 person per 10m² for offices, 1 per 3m² for assembly, 1 per 15m² for residential.
3. Estimate buildingHeight: numberOfFloors × 3.5m unless dimensions are visible.
4. floorAreas array MUST have exactly numberOfFloors entries.
5. totalFloorArea MUST equal the sum of floorAreas array.
6. Use 0 for numeric values ONLY if you truly cannot determine them — prefer a reasonable estimate over zero.
7. buildingName: use any title/label visible on the plan. If none, describe as "Unnamed [type] Building".`;

// JSON schema for structured output — matches BuildingInput interface
const BUILDING_INPUT_SCHEMA: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        buildingName: { type: SchemaType.STRING, description: 'Name or identifier visible on the plan, or "Unnamed [type] Building"' },
        buildingType: { type: SchemaType.STRING, description: 'General functional type of the building (e.g., Office, Hospital, Residential, Mall, Factory, School)' },
        totalFloorArea: { type: SchemaType.NUMBER, description: 'Total floor area in m² — must equal sum of floorAreas' },
        numberOfFloors: { type: SchemaType.NUMBER, description: 'Total number of floors including ground floor' },
        floorAreas: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.NUMBER },
            description: 'Area per floor in m², index 0 = ground floor. Must have exactly numberOfFloors entries.',
        },
        buildingHeight: { type: SchemaType.NUMBER, description: 'Building height in metres (numberOfFloors × 3.5 if not visible)' },
        occupantCount: { type: SchemaType.NUMBER, description: 'Estimated max occupants (offices: area/10, assembly: area/3, residential: area/15)' },
        hasKitchen: { type: SchemaType.BOOLEAN, description: 'true if Kitchen/Pantry/Canteen/Cafeteria visible' },
        cookingAreaM2: { type: SchemaType.NUMBER, description: 'Cooking appliance area in m² (0 if no kitchen)' },
        hasFlammableLiquids: { type: SchemaType.BOOLEAN, description: 'true if fuel/paint/chemical storage visible' },
        flammableLiquidsLitres: { type: SchemaType.NUMBER, description: 'Estimated litres (0 if none)' },
        hasFlammableGases: { type: SchemaType.BOOLEAN, description: 'true if LPG/gas bank/gas manifold visible' },
        flammableGasesLitres: { type: SchemaType.NUMBER, description: 'Estimated litres (0 if none)' },
        hasCombustibleMetals: { type: SchemaType.BOOLEAN, description: 'true only if metalworking/foundry/welding visible' },
        hasElectricalHazards: { type: SchemaType.BOOLEAN, description: 'true if server room/UPS/electrical panel/switchgear visible' },
        occupancyGroup: { type: SchemaType.STRING, description: 'NBC occupancy group: A, B, C, D, E, F, G, H, or J based on primary building use' },
        occupancySubdivision: { type: SchemaType.STRING, description: 'NBC subdivision e.g. A-1, B-2, E-1, G-3 — must match occupancyGroup' },
        constructionType: { type: SchemaType.STRING, description: '"type12" for RCC/steel/concrete (default), "type34" only for timber/lightweight frame' },
        hasSprinklers: { type: SchemaType.BOOLEAN, description: 'true if sprinkler system visible in plan or legend' },
    },
    required: [
        'buildingName', 'buildingType', 'totalFloorArea', 'numberOfFloors',
        'floorAreas', 'buildingHeight', 'occupantCount', 'hasKitchen',
        'cookingAreaM2', 'hasFlammableLiquids', 'flammableLiquidsLitres',
        'hasFlammableGases', 'flammableGasesLitres', 'hasCombustibleMetals',
        'hasElectricalHazards',
        'occupancyGroup', 'occupancySubdivision', 'constructionType', 'hasSprinklers',
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
                    systemInstruction: SYSTEM_INSTRUCTION,
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: BUILDING_INPUT_SCHEMA,
                        temperature: 0,  // deterministic output for consistency
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

                // ── Post-processing: enforce consistency ──────────────

                // Fix empty floor areas
                if (!parsed.floorAreas || parsed.floorAreas.length === 0) {
                    parsed.floorAreas = [parsed.totalFloorArea || 0];
                    parsed.numberOfFloors = 1;
                }

                // Ensure numberOfFloors matches floorAreas length
                if (parsed.floorAreas.length !== parsed.numberOfFloors) {
                    parsed.numberOfFloors = parsed.floorAreas.length;
                }

                // Ensure totalFloorArea matches sum of floorAreas
                const floorSum = parsed.floorAreas.reduce((s, a) => s + a, 0);
                if (floorSum > 0 && Math.abs(parsed.totalFloorArea - floorSum) / floorSum > 0.05) {
                    parsed.totalFloorArea = floorSum;
                }

                // Estimate occupantCount from area if missing/zero
                if (!parsed.occupantCount || parsed.occupantCount <= 0) {
                    const densityFactor = parsed.occupancyGroup === 'D' ? 3
                        : parsed.occupancyGroup === 'A' ? 15
                            : 10;  // default: office density
                    parsed.occupantCount = Math.ceil(parsed.totalFloorArea / densityFactor);
                }

                // Estimate buildingHeight from floors if missing/zero
                if (!parsed.buildingHeight || parsed.buildingHeight <= 0) {
                    parsed.buildingHeight = parsed.numberOfFloors * 3.5;
                }

                // Ensure occupancySubdivision starts with occupancyGroup
                if (parsed.occupancyGroup && parsed.occupancySubdivision) {
                    if (!parsed.occupancySubdivision.startsWith(parsed.occupancyGroup)) {
                        // Attempt fix: default to group + '-1'
                        parsed.occupancySubdivision =
                            (parsed.occupancyGroup + '-1') as BuildingInput['occupancySubdivision'];
                    }
                }

                // Default constructionType if missing
                if (!parsed.constructionType) {
                    parsed.constructionType = 'type12';
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
