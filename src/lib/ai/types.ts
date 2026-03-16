// src/lib/ai/types.ts
// Pluggable AI Provider Interface
//
// All AI vision providers implement this interface.
// Swap providers by changing getAIProvider() in index.ts.

import type { BuildingInput } from '@/types';

export interface AIExtractionResult {
    success: boolean;
    data: BuildingInput | null;
    rawResponse: string;
    provider: string;
    error?: string;
}

export interface AIDocument {
    data: string;     // base64
    mimeType: string; // e.g. 'image/png' or 'application/pdf'
}

export interface AIProvider {
    name: string;
    analyzeFloorPlan(documents: AIDocument[]): Promise<AIExtractionResult>;
}
