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

export interface AIProvider {
    name: string;
    analyzeFloorPlan(imageBase64: string, mimeType?: string): Promise<AIExtractionResult>;
}
