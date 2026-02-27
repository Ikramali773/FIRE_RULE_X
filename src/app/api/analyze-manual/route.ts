// src/app/api/analyze-manual/route.ts
// POST /api/analyze-manual — Manual fallback endpoint
//
// Accepts: JSON body conforming to BuildingInput
// Skips AI vision entirely — for user-corrected input
// Returns: Same AnalyzeResponse shape as /api/analyze

import { NextRequest, NextResponse } from 'next/server';
import { runRuleEngine } from '@/lib/ruleEngine';
import type { BuildingInput, AnalyzeResponse } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as BuildingInput;

        // Basic validation
        if (!body.totalFloorArea || !body.floorAreas || body.floorAreas.length === 0) {
            return NextResponse.json(
                { error: 'Missing required fields: totalFloorArea, floorAreas.' },
                { status: 400 }
            );
        }

        if (!body.numberOfFloors || body.numberOfFloors <= 0) {
            body.numberOfFloors = body.floorAreas.length;
        }

        // Force commercial for MVP
        body.buildingType = 'commercial';

        // Default building name
        if (!body.buildingName) {
            body.buildingName = 'Unnamed Building';
        }

        // Run rule engine
        const analysis = runRuleEngine(body);
        const result = { ...analysis, analysisMethod: 'manual_override' as const };

        const response: AnalyzeResponse = {
            extraction: body,
            analysis: result,
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
        return NextResponse.json(
            { error: 'Invalid input. Ensure all required BuildingInput fields are provided.' },
            { status: 400 }
        );
    }
}
