# SPEC.md — FireRuleX Project Specification

> **Status**: `FINALIZED`
> **Created**: 2026-02-23
> **Version**: MVP v1.0

---

## Vision

FireRuleX is an AI-powered web platform — the "Grammarly for building fire safety" — that automatically checks uploaded floor plans (PDF/image) against IS 2190:2024 fire extinguisher placement rules, returning an annotated compliance report in seconds. MVP targets commercial buildings, eliminating the manual guesswork that causes 80% of fire NOC rejections in India.

---

## Goals

1. **Automated compliance checking** — Accept floor plan uploads (PDF, JPG, PNG) and extract building geometry/metadata using AI vision to check against IS 2190:2024 fire extinguisher rules.
2. **Clear violation reporting** — Return a compliance score and a list of violations with exact clause references and actionable fix suggestions.
3. **Downloadable NOC-ready report** — Generate a PDF report architects and builders can attach to fire NOC applications.
4. **User-friendly web interface** — A clean, fast UI that non-technical building owners can use without training.

---

## Non-Goals (Out of Scope — MVP)

- DWG file parsing (requires Apryse SDK license — deferred to post-MVP)
- NBC Part 4 rules beyond fire extinguishers (travel distance, stair widths, exit counts, etc.)
- Structural fire resistance ratings
- Smoke/fire detection system design
- Multi-building or site-level analysis
- Real-time collaboration or team workspaces
- Integration with municipal authority portals
- Mobile native app (iOS/Android)
- Any building category other than **Commercial** in MVP

---

## Users

**Primary:** Builders and building owners who need to verify fire extinguisher compliance before submitting for fire NOC. They are non-technical, want a clear pass/fail result, and need an official-looking report they can show authorities.

**Secondary:** Architects who want to catch fire extinguisher issues early in design. They understand floor plans and want precise, clause-referenced feedback.

**Tertiary (post-MVP):** Fire consultants automating their initial review pass.

---

## Constraints

- **Solo developer** — scope must be achievable by one person
- **No Apryse license** — DWG parsing is out of MVP; PDF/image only via AI vision
- **AI vision limitations** — Geometry extraction from floor plans is imperfect; MVP accepts structured data fallback if vision fails (user can confirm extracted values)
- **IS 2190:2024** — ALL fire extinguisher rules come from this standard only
- **MVP building type: Commercial** — Residential, industrial, etc. are post-MVP
- **Budget**: Free/low-cost infra (serverless, pay-per-use AI API calls)

---

## Technical Stack (MVP)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (React) + Tailwind CSS |
| Backend | Next.js API routes (serverless) |
| AI Vision | GPT-4o-vision or Gemini 1.5 Pro (file upload → geometry extraction) |
| Rule Engine | Custom JSON rule engine against `nbc_rules.json` (IS 2190:2024 rules already defined) |
| PDF Report | `pdf-lib` or `puppeteer` |
| File Storage | Vercel Blob or Cloudinary (temp upload) |
| Deployment | Vercel |

---

## Success Criteria

- [ ] User can upload a commercial building floor plan (PDF or image) and receive a compliance result in under 60 seconds
- [ ] System checks all IS 2190:2024 fire extinguisher rules applicable to commercial buildings
- [ ] Every violation shows the exact IS 2190 clause reference and a plain-English fix suggestion
- [ ] Compliance score (0–100) is generated and explained
- [ ] Downloadable PDF compliance report is generated
- [ ] A real architect or building owner can use the tool without instructions
- [ ] End-to-end cost per analysis stays under ₹5 (AI API cost)
