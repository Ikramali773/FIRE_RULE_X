// src/lib/ai/index.ts
// AI Provider Factory
//
// Returns the current AI provider. To swap providers:
// 1. Create a new provider implementing AIProvider (e.g. geminiProvider.ts)
// 2. Change getAIProvider() to return the new implementation

import type { AIProvider } from './types';
import { GeminiProvider } from './geminiProvider';

export type { AIProvider, AIExtractionResult } from './types';

// Active: Gemini 2.0 Flash — swap this to change the global AI provider
export function getAIProvider(): AIProvider {
    return new GeminiProvider();
}
