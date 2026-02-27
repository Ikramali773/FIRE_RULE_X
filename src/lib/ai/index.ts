// src/lib/ai/index.ts
// AI Provider Factory
//
// Returns the current AI provider. To swap providers:
// 1. Create a new provider implementing AIProvider (e.g. geminiProvider.ts)
// 2. Change getAIProvider() to return the new implementation

import type { AIProvider } from './types';
import { OpenAIProvider } from './openaiProvider';

export type { AIProvider, AIExtractionResult } from './types';

// Default: GPT-4o — swap this to change the global AI provider
export function getAIProvider(): AIProvider {
    return new OpenAIProvider();
}
