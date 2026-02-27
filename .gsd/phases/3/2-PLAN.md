---
phase: 3
plan: 2
wave: 1
---

# Plan 3.2: Results Page + Data Confirmation Screen

## Objective
Build the results page that displays compliance analysis output (score, violations, extinguisher requirements) and the data confirmation screen that appears when AI extraction confidence is low. These are the two post-upload screens.

## Context
- `src/types/index.ts` — AnalysisResult, Violation, ExtinguisherRequirement, AnalyzeResponse
- `src/components/FileUpload.tsx` — From Plan 3.1 (triggers analysis, passes data)
- `src/app/globals.css` — Design system from Plan 3.1

## Tasks

<task type="auto">
  <name>Build the results page</name>
  <files>
    src/app/results/page.tsx,
    src/components/ComplianceScore.tsx,
    src/components/ViolationCard.tsx,
    src/components/ExtinguisherTable.tsx
  </files>
  <action>
    ### 1. src/components/ComplianceScore.tsx
    Circular score display component:
    - Animated ring/circle showing score 0-100
    - Color coded: green (90+), amber (60-89), red (<60)
    - Grade letter (A/B/C/D) inside
    - NOC readiness label below: "NOC Ready" / "Conditional" / "Not Ready"

    ### 2. src/components/ViolationCard.tsx
    Individual violation display:
    - Severity badge (HIGH=red, MEDIUM=amber, LOW=blue)
    - IS 2190 clause reference (e.g. "cl 7.5, Table 3")
    - Description text
    - Fix suggestion in a green-tinted box
    - Collapsible/expandable detail

    ### 3. src/components/ExtinguisherTable.tsx
    Table/grid showing required extinguishers:
    - Fire class (A, B, C, F) with color icons
    - Minimum rating (e.g. "3A", "144B")
    - Count required
    - Per-floor indicator
    - Clause reference
    - Note (if any)

    ### 4. src/app/results/page.tsx
    Results page layout:
    - Receives analysis data (via URL search params or React context/state)
    - Top: building name + summary bar (hazard type, analysis method)
    - Left/center: ComplianceScore (large, prominent)
    - Below score: ViolationCard list (sorted by severity)
    - Right column / below: ExtinguisherTable
    - Bottom: "Upload Another" button → back to home
    - "Download Report" button (disabled/placeholder for Phase 4)
    - If no data (direct URL access): redirect to home

    IMPORTANT:
    - Data passing: use sessionStorage or React state management (keep it simple)
    - No server-side rendering for this page — client component ('use client')
    - All violation cards must have unique IDs (violation-{ruleId})
    - Responsive: single column on mobile, two columns on desktop
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    npm run dev
    ```
    Navigate to results page with mock data — verify layout, score ring, violation cards, and table render.
  </verify>
  <done>
    - Results page shows compliance score with animated ring
    - Violation cards display with severity badges and fix suggestions
    - Extinguisher table shows all required equipment
    - Responsive layout (1 col mobile, 2 col desktop)
    - "Upload Another" button links back to home
  </done>
</task>

<task type="auto">
  <name>Build data confirmation screen</name>
  <files>
    src/components/DataConfirmation.tsx,
    src/app/confirm/page.tsx
  </files>
  <action>
    ### 1. src/components/DataConfirmation.tsx
    Editable form showing AI-extracted building data for user correction:

    - Pre-filled with AI extraction values
    - Shows confidence flags (warnings from scoreConfidence)
    - Fields: buildingName, totalFloorArea, numberOfFloors, floorAreas (dynamic array),
      buildingHeight, occupantCount, hasKitchen, cookingAreaM2,
      hasFlammableLiquids, flammableLiquidsLitres, hasFlammableGases,
      hasCombustibleMetals, hasElectricalHazards
    - Input types: number for numeric, checkbox for booleans, text for name
    - "Confirm and Analyze" button → submits to /api/analyze-manual
    - "Re-upload" button → back to home
    - Yellow/amber warning banner at top: "AI extraction confidence is low. Please review and correct the values below."

    ### 2. src/app/confirm/page.tsx
    Confirmation page:
    - Receives AI extraction data + confidence flags
    - Renders DataConfirmation component
    - On submit: POST to /api/analyze-manual → redirect to results page

    ### Flow integration in FileUpload.tsx:
    After /api/analyze response:
    - If `needsConfirmation === false` → go straight to /results
    - If `needsConfirmation === true` → go to /confirm with extracted data
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    npm run dev
    ```
    Test the confirmation flow with mock low-confidence data.
  </verify>
  <done>
    - Data confirmation form renders with pre-filled AI values
    - Confidence warnings displayed prominently
    - User can edit all fields and re-submit
    - "Confirm and Analyze" submits to /api/analyze-manual
    - FileUpload routes to /confirm when needsConfirmation is true
  </done>
</task>

## Success Criteria
- [ ] Results page shows score ring, violation cards, extinguisher table
- [ ] Violations sorted by severity (high → low)
- [ ] Confirmation screen shows editable form with AI pre-fill
- [ ] Confidence flags displayed as warnings
- [ ] Flow: upload → (low confidence) → confirm → results
- [ ] Flow: upload → (high confidence) → results directly
- [ ] `npx tsc --noEmit` compiles clean
