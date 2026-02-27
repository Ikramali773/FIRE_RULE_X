---
phase: 3
plan: 3
wave: 2
---

# Plan 3.3: Loading States + Polish + Browser Validation

## Objective
Add loading/progress states during analysis, error handling screens, final responsive polish, and validate the full UI flow in the browser.

## Context
- All components from Plans 3.1 + 3.2
- `/api/analyze` — From Phase 2 (may take 10-30s due to GroupDocs + GPT-4o)
- Long analysis time means loading UX is critical

## Tasks

<task type="auto">
  <name>Add loading states and error handling</name>
  <files>
    src/components/AnalysisProgress.tsx,
    src/components/ErrorState.tsx,
    src/components/FileUpload.tsx (update)
  </files>
  <action>
    ### 1. src/components/AnalysisProgress.tsx
    Full-screen loading overlay during analysis:
    - Animated progress steps:
      1. "Uploading your floor plan..." (with spinner)
      2. "Converting to image..." (if DWG/PDF)
      3. "AI is analyzing your floor plan..." (pulsing brain icon)
      4. "Running IS 2190:2024 compliance checks..."
    - Each step appears sequentially (timed intervals, ~5s each)
    - Subtle animation: progress bar or step indicators
    - Estimated time: "Usually takes 15-30 seconds"
    - Cancel button → returns to upload

    ### 2. src/components/ErrorState.tsx
    Error display component:
    - For API errors, network failures, unsupported files
    - Shows: error icon, title, description, "Try Again" button
    - Different variants: upload_error, conversion_error, analysis_error, network_error

    ### 3. Update FileUpload.tsx
    Wire up:
    - Show AnalysisProgress while waiting for /api/analyze response
    - Show ErrorState on failure
    - Handle network timeout (set 60s timeout on fetch)
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    npm run dev
    ```
    Trigger upload → verify loading screen appears → verify error state on failure
  </verify>
  <done>
    - AnalysisProgress shows animated step progression
    - ErrorState handles all failure types with clear messages
    - FileUpload shows loading during API call
    - Cancel button works during analysis
    - 60s timeout on fetch
  </done>
</task>

<task type="checkpoint:human-verify">
  <name>Full UI flow browser validation</name>
  <files>none (browser test)</files>
  <action>
    ### Test the complete flow in the browser:

    1. Open http://localhost:3000
    2. Verify landing page: hero, upload zone, how-it-works, footer
    3. Try drag-and-drop a file onto upload zone
    4. Try clicking upload zone to select file
    5. Try uploading an unsupported file (e.g. .txt) — should reject
    6. Try uploading a file > 10MB — should reject
    7. Test mobile responsiveness (resize browser to 375px width)

    ### Test results page with mock data:
    8. Navigate to /results with data in sessionStorage
    9. Verify score ring, grade, NOC readiness
    10. Verify violation cards with severity badges
    11. Verify extinguisher table

    ### Test confirmation screen:
    12. Navigate to /confirm with mock low-confidence data
    13. Verify form is pre-filled with AI values
    14. Verify confidence warnings are shown
    15. Edit a field and click "Confirm and Analyze"

    ### Test loading/error states:
    16. Upload without API keys → verify error state
    17. Verify loading screen animations
  </action>
  <verify>
    User visually confirms all screens look polished and professional.
  </verify>
  <done>
    - All pages render correctly
    - Upload flow works (drag-drop + click)
    - Results page shows all data correctly
    - Confirmation screen editable and functional
    - Loading states animate smoothly
    - Error states have clear messages
    - Responsive on mobile and desktop
  </done>
</task>

## Success Criteria
- [ ] Loading screen shows animated step progression during analysis
- [ ] Error states handle all failure modes gracefully
- [ ] Full flow works: upload → loading → (confirm?) → results
- [ ] All pages are responsive (375px - 1440px)
- [ ] Typography, colors, and spacing are consistent
- [ ] `npx tsc --noEmit` compiles clean
- [ ] User confirms visual quality in browser
