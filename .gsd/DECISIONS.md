# DECISIONS.md — Architecture Decision Records

> Log of key technical and product decisions made during FireRuleX development.

---

## ADR-001: MVP Building Type = Commercial Only

**Date**: 2026-02-23
**Status**: Accepted

**Context**: IS 2190:2024 fire extinguisher rules vary by building occupancy type. Supporting all types in MVP would increase rule complexity significantly.

**Decision**: MVP targets commercial buildings only. Other occupancy types (residential, industrial, educational, healthcare) are post-MVP.

**Consequences**: Faster MVP delivery. Rule engine only needs to handle commercial classification. Users with non-commercial buildings will be turned away at upload.

---

## ADR-002: DWG Support Deferred to Post-MVP

**Date**: 2026-02-23
**Status**: Accepted

**Context**: DWG parsing requires a specialized SDK (e.g., Apryse). No license was available at project start, and it adds significant complexity.

**Decision**: MVP accepts PDF and image files only. DWG support added post-MVP when SDK is licensed.

**Consequences**: Some architects may prefer DWG workflow. Acceptable tradeoff for MVP scope.

---

## ADR-003: AI Vision with User Confirmation Fallback

**Date**: 2026-02-23
**Status**: Accepted

**Context**: V1 (Gemini free API on raw PDF) failed to extract reliable geometry data. V2 must be more robust.

**Decision**: Use GPT-4o-vision or Gemini 1.5 Pro for extraction. If confidence is low or data is ambiguous, show user a confirmation form with AI's best guess for manual correction before running rule check.

**Consequences**: Handles AI extraction failures gracefully. User remains in control of input data. Adds one extra screen to the flow when extraction fails.

---

## ADR-004: Rule Source = IS 2190:2024 Only

**Date**: 2026-02-23
**Status**: Accepted

**Context**: The broader vision includes NBC Part 4 rules. But for MVP, scope is explicitly fire extinguisher placement/selection per IS 2190:2024.

**Decision**: Rule engine only implements IS 2190:2024 fire extinguisher rules for MVP.

**Consequences**: Clear, bounded scope. All rules are already being encoded in `nbc_rules.json`.

---

## ADR-005: Platform = Next.js Web App on Vercel

**Date**: 2026-02-23
**Status**: Accepted

**Context**: Product needs to be a user-friendly website accessible to non-technical building owners and builders.

**Decision**: Next.js with Tailwind CSS deployed to Vercel. Serverless API routes for backend logic.

**Consequences**: Fast deployment, free tier covers MVP traffic, excellent DX for solo developer.
