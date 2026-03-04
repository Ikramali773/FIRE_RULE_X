// src/app/api/analyze/route.ts
// POST /api/analyze — Full AI analysis pipeline
//
// Pipeline:  file upload → convert (if DWG/PDF) → GPT-4o vision → confidence → rule engine → response
//
// Accepts: multipart/form-data with a single 'file' field
// Returns: AnalyzeResponse JSON

import { NextRequest, NextResponse } from 'next/server';
import { convertToPng } from '@/lib/fileConverter';
import { getAIProvider } from '@/lib/ai';
import { scoreConfidence } from '@/lib/confidenceScorer';
import { runRuleEngine } from '@/lib/ruleEngine';
import { resizeForAI } from '@/lib/imageResizer';
import { checkRateLimit } from '@/lib/rateLimiter';
import type { AnalyzeResponse } from '@/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided. Send a file with the key "file".' },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                {
                    error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`,
                },
                { status: 400 }
            );
        }

        // ─── Rate limit check ───
        const rateCheck = checkRateLimit();
        if (!rateCheck.allowed) {
            const retrySec = Math.ceil((rateCheck.retryAfterMs ?? 30000) / 1000);
            return NextResponse.json(
                {
                    error: `Too many requests. Please wait ${retrySec} seconds and try again.`,
                    step: 'rate_limit',
                    retryAfterSeconds: retrySec,
                },
                { status: 429 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // ─── Stage 1: Convert to PNG (if needed) ───
        const conversion = await convertToPng(buffer, file.type, file.name);
        if (conversion.error) {
            return NextResponse.json(
                { error: conversion.error, step: 'conversion' },
                { status: 422 }
            );
        }

        // ─── Stage 1.5: Resize for AI (reduce token usage) ───
        const resizedBuffer = await resizeForAI(conversion.imageBuffer);

        // ─── Stage 2: AI extraction ───
        let aiProvider;
        try {
            aiProvider = getAIProvider();
        } catch (err) {
            return NextResponse.json(
                {
                    error: err instanceof Error ? err.message : 'AI provider initialization failed.',
                    step: 'ai_init',
                },
                { status: 500 }
            );
        }

        const imageBase64 = resizedBuffer.toString('base64');
        const extraction = await aiProvider.analyzeFloorPlan(imageBase64);

        if (!extraction.success || !extraction.data) {
            return NextResponse.json(
                {
                    error: extraction.error || 'AI extraction failed. Please try a clearer image.',
                    step: 'ai_extraction',
                },
                { status: 422 }
            );
        }

        // ─── Stage 3: Confidence scoring ───
        const confidence = scoreConfidence(extraction.data);
        const needsConfirmation = confidence.score < 70;

        // ─── Stage 4: Rule engine ───
        const analysis = runRuleEngine(extraction.data);
        // Override analysis method to reflect AI source
        const result = { ...analysis, analysisMethod: 'ai_vision' as const };

        const response: AnalyzeResponse = {
            extraction: extraction.data,
            analysis: result,
            confidence,
            needsConfirmation,
            meta: {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                originalFormat: conversion.originalFormat,
                wasConverted: conversion.wasConverted,
                aiProvider: aiProvider.name,
                analyzedAt: new Date().toISOString(),
            },
        };

        return NextResponse.json(response);
    } catch (err) {
        console.error('Analysis error:', err);
        return NextResponse.json(
            { error: 'Internal server error during analysis.' },
            { status: 500 }
        );
    }
}
