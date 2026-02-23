# ROADMAP.md — FireRuleX MVP

> **Current Phase**: Not started
> **Milestone**: v1.0 MVP — Commercial Building Fire Extinguisher Compliance Checker
> **Solo Developer**: Yes

---

## Must-Haves (from SPEC)

- [ ] PDF/image floor plan upload
- [ ] AI vision-based geometry/metadata extraction
- [ ] IS 2190:2024 fire extinguisher rule engine (commercial buildings)
- [ ] Compliance score (0–100) with violation details + clause references
- [ ] Downloadable PDF compliance report
- [ ] Clean, user-friendly web UI

---

## Phases

### Phase 1: Foundation & Rule Engine
**Status**: ⬜ Not Started
**Objective**: Set up the project scaffold and build the core IS 2190:2024 rule engine that evaluates building data against fire extinguisher requirements.
**Deliverable**: A working rule engine that, given structured building data (type, area, floors, occupancy, hazard indicators), returns required extinguisher types/counts and violations with IS 2190 clause references.
**Requirements**: SPEC Goals 1, 2
**Scope (from /discuss-phase 1)**: Check number and types of extinguishers only (NOT placement/travel distance). Commercial buildings only. Option A input (minimal structured data).

**Tasks**:
- [x] Create `nbc_rules.json` — fresh from IS 2190:2024 PDF (fire classes, hazard classification, Tables 1-3, installation requirements, commercial mandatories)
- [ ] Initialize Next.js project with Tailwind CSS at project root
- [ ] Build rule engine service (`lib/ruleEngine.ts`) that:
  - Determines hazard type (low/moderate/high) from building inputs using Table 6 criteria
  - Calculates required Class A extinguisher count per floor (Table 1)
  - Calculates required Class B/C extinguisher count if flammable liquids present (Table 2)
  - Checks for Class F requirement if kitchen/cooking area present (Table 3)
  - Checks for CO2/clean agent requirement if electrical hazard present
  - Returns: required extinguishers per floor, violations, IS 2190 clause references
- [ ] Unit test rule engine with known commercial building scenarios (low/moderate/high hazard)
- [ ] Set up Vercel deployment pipeline

---

### Phase 2: AI Vision Extraction Pipeline
**Status**: ⬜ Not Started
**Objective**: Accept PDF/image floor plan uploads and use AI vision to extract the building metadata needed for rule checking.
**Deliverable**: A `/api/analyze` endpoint that accepts a floor plan file and returns structured building data (building type, area per floor, total floors, occupancy, etc.).
**Requirements**: SPEC Goal 1

**Tasks**:
- [ ] Implement file upload endpoint (PDF, JPG, PNG) with temp storage
- [ ] Integrate GPT-4o-vision or Gemini 1.5 Pro API for geometry extraction
- [ ] Design extraction prompt: extract building type, floor area, floor count, occupancy, fire extinguisher locations if visible
- [ ] Build fallback: if AI extraction confidence is low, surface a data-confirmation form to user
- [ ] Connect extraction output to rule engine from Phase 1

---

### Phase 3: Web UI
**Status**: ⬜ Not Started
**Objective**: Build the complete user-facing interface — upload, progress, results, and report.
**Deliverable**: A polished, production-ready web app where a non-technical user can upload a floor plan and get a full compliance report without any instructions.
**Requirements**: SPEC Goals 3, 4

**Tasks**:
- [ ] Landing page with clear value proposition and upload CTA
- [ ] Upload flow with drag-and-drop (PDF/image), file validation, progress indicator
- [ ] AI analysis loading state ("Analyzing your floor plan... ~30s")
- [ ] Results page: compliance score, violation cards (clause reference + fix suggestion), pass/fail badges
- [ ] Data confirmation screen: if AI extraction is uncertain, show extracted values for user to confirm/correct before analysis
- [ ] Responsive design (desktop-first, mobile-friendly)

---

### Phase 4: Report Generation & Polish
**Status**: ⬜ Not Started
**Objective**: Generate a professional PDF compliance report and polish the full experience for real users.
**Deliverable**: A downloadable PDF report a builder can attach to their fire NOC application, plus a complete, production-ready app.
**Requirements**: SPEC Goals 3, 4, Success Criteria

**Tasks**:
- [ ] PDF report template: building summary, score, violations with clause refs, fix suggestions
- [ ] Generate report via `pdf-lib` or headless browser
- [ ] Report download from results page
- [ ] Error handling: bad uploads, API failures, unsupported file types
- [ ] Loading/empty/error states throughout UI
- [ ] End-to-end test with real commercial building floor plans
- [ ] Performance: keep end-to-end time under 60 seconds
- [ ] Final deployment to production Vercel

---

## Post-MVP (Backlog)

- DWG file support (Apryse SDK)
- Additional building categories: Residential, Industrial, Educational, Healthcare
- NBC Part 4 rules: travel distance, stair widths, exit counts
- User accounts + history of past analyses
- Enterprise plan (bulk uploads, API access)
- Annotated floor plan image output (red markers on the actual plan)
- Municipal authority portal integration
