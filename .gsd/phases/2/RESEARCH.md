# Phase 2 Research: File Conversion + Pluggable Vision LLM

> **Discovery Level**: L3 — Deep Dive
> **Date**: 2026-02-27 (revised from 2026-02-24)
> **Approach**: File conversion (DWG/PDF → PNG) + pluggable vision LLM

---

## Architecture: Two-Stage Pipeline

```
User uploads DWG/PDF/JPG/PNG
         │
         ▼
  ┌─────────────────┐
  │ Stage 1: Convert │  GroupDocs Cloud API
  │ DWG/PDF → PNG    │  (skip if already PNG/JPG)
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ Stage 2: Analyze │  GPT-4o vision (pluggable)
  │ PNG → JSON       │  Swap to Gemini/Claude later
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ Stage 3: Check   │  IS 2190 Rule Engine (Phase 1)
  │ JSON → Report    │
  └─────────────────┘
```

---

## Stage 1: File Conversion

### GroupDocs Conversion Cloud ✅ (chosen)

| Feature | Detail |
|---------|--------|
| **Formats** | DWG, DXF, PDF → PNG/JPG/SVG (80+ formats) |
| **Free tier** | 150 calls/month (no expiry) |
| **Paid** | $30 per 1,000 calls after free tier |
| **SDK** | `groupdocs-conversion-cloud` (npm/Node.js/TypeScript) |
| **How it works** | Upload file → API converts → download converted PNG |
| **Serverless?** | ✅ Yes — REST API, no server infrastructure |

### ConvertAPI (rejected)

| Feature | Detail |
|---------|--------|
| Free tier | 250 calls, 30 days only (expires) |
| Paid | $35/month for 12K calls |
| Why rejected | Free tier expires; GroupDocs is cheaper and persistent |

---

## Stage 2: Vision LLM

### GPT-4o (primary) ✅

| Feature | Detail |
|---------|--------|
| **Image input** | Base64 inline or URL |
| **Structured output** | `response_format: { type: 'json_schema', json_schema: ... }` |
| **TypeScript** | `openai` npm package, Zod for schema |
| **Cost** | ~$0.01-0.03 per image analysis (low volume) |
| **Serverless?** | ✅ Yes — API call |

### Pluggable design

```typescript
// AI provider interface — swap implementations
interface AIProvider {
  name: string;
  analyzeFloorPlan(imageBase64: string): Promise<BuildingInput>;
}

// Implementations:
// - OpenAIProvider (GPT-4o) ← default
// - GeminiProvider (Gemini 2.5 Flash) ← future
// - ClaudeProvider (Claude 3.5) ← future
```

---

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Conversion API | GroupDocs Cloud | 150 free/mo, $30/1K after, DWG support |
| Primary AI | GPT-4o | Best vision accuracy, structured output, proven |
| AI architecture | Pluggable interface | Swap providers without app changes |
| File flow | Convert → Analyze | Clean PNG gives AI best chance of accuracy |
| Serverless | ✅ Fully | Both APIs are REST, runs on Vercel |
