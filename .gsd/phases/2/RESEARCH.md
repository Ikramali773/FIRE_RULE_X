# Phase 2 Research: AI Vision Extraction Pipeline

> **Discovery Level**: L2 — Standard Research
> **Date**: 2026-02-24

---

## Decision: AI Provider

| Option | Pros | Cons |
|--------|------|------|
| **Gemini 2.5 Flash** ✅ | Cheapest API, structured JSON output with schema enforcement, handles images + PDFs, TypeScript SDK `@google/genai`, thinking budgets for cost control | Preview model (may change) |
| GPT-4o-vision | Proven track record, excellent image understanding | More expensive per call, no native structured output schema enforcement |
| Gemini 1.5 Pro | Stable, large context | More expensive than Flash, overkill for extraction |

**Chosen**: Gemini 2.5 Flash via `@google/genai` SDK.

**Reason**: Cost (₹5 target per analysis), structured JSON output with schema enforcement matches BuildingInput shape exactly, TypeScript SDK is clean.

---

## Decision: File Upload Strategy

**Chosen**: In-memory processing (no file storage for MVP).

- Next.js App Router `NextRequest.formData()` handles multipart natively — no multer/formidable needed
- File → ArrayBuffer → Buffer → base64 → Gemini inline data
- Max 10MB file size limit (floor plans are typically <5MB)
- No Vercel Blob or Cloudinary needed for MVP — saves complexity and cost

---

## Decision: API Design

Two endpoints:
1. `/api/analyze` (POST, multipart) — file upload → AI extraction → rule engine
2. `/api/analyze-manual` (POST, JSON) — user-corrected input → rule engine (skip AI)

Both return identical `AnalyzeResponse` shape for consistent frontend consumption.

---

## Confidence Scoring

Penalty-based system (start at 100, deduct for issues):
- Missing/zero total floor area: -30
- Missing/zero floor count: -20
- Empty floor areas: -25
- Floor count mismatch: -15
- Missing occupant count: -10
- Missing height: -10
- Implausible values: -5 to -10

Thresholds: high (≥70), medium (40-69), low (<40)
`needsConfirmation` = score < 70

---

## Key SDK Usage

```typescript
// @google/genai — new unified SDK (NOT @google/generative-ai)
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await genai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType, data: base64 } }] }],
  config: {
    responseMimeType: 'application/json',
    responseSchema: BUILDING_INPUT_SCHEMA,  // enforces our JSON shape
  },
});
```
