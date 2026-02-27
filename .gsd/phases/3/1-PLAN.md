---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: Landing Page + Upload Component

## Objective
Replace the placeholder page with a premium landing page that sells FireRuleX's value proposition and provides drag-and-drop file upload (DWG, PDF, JPG, PNG). This is the user's first impression — it must look polished and professional.

## Context
- `src/app/page.tsx` — Current placeholder ("FireRuleX — Coming Soon")
- `src/app/globals.css` — Tailwind v4 with basic theme
- `src/app/layout.tsx` — Root layout with Geist fonts
- `.gsd/SPEC.md` — Users are builders/building owners, non-technical

## Tasks

<task type="auto">
  <name>Design system + global styles</name>
  <files>
    src/app/globals.css
  </files>
  <action>
    Replace globals.css with a complete design system for FireRuleX:

    ### Color palette (fire safety theme)
    - Primary: deep orange/amber gradient (#F97316 → #EA580C) — fire safety
    - Secondary: slate dark (#1E293B) — professional, trustworthy
    - Accent: emerald (#10B981) — compliance/pass indicators
    - Danger: red (#EF4444) — violations/fail
    - Warning: amber (#F59E0B) — medium severity
    - Background: slate-50 (#F8FAFC) light mode
    - Card: white with subtle shadow + rounded corners

    ### Typography
    - Use the Geist fonts already in layout.tsx
    - Heading sizes: hero 3xl-5xl, section 2xl, card xl
    - Body: base size, slate-600 color

    ### Utilities
    - `.card` — rounded-2xl bg-white shadow-lg border border-slate-100 p-6
    - `.btn-primary` — gradient bg, white text, rounded-xl, hover scale, shadow
    - `.btn-secondary` — outlined, slate border, hover fill
    - `.badge-pass` / `.badge-fail` / `.badge-warning` — compliance badges
    - `.score-ring` — circular score indicator styles
    - Smooth transitions on all interactive elements (300ms ease)

    IMPORTANT: Use Tailwind v4 syntax (@theme inline, not @layer). Keep the existing @import "tailwindcss" and @theme inline block. Add custom styles below.
  </action>
  <verify>
    ```powershell
    npm run dev
    ```
    Dev server starts without CSS errors.
  </verify>
  <done>
    - globals.css has complete design system
    - Fire safety color palette defined
    - Utility classes for cards, buttons, badges, score
    - Smooth transitions on interactive elements
  </done>
</task>

<task type="auto">
  <name>Build landing page with upload component</name>
  <files>
    src/app/page.tsx,
    src/components/FileUpload.tsx,
    src/components/Navbar.tsx,
    src/components/Footer.tsx
  </files>
  <action>
    ### 1. src/components/Navbar.tsx
    Simple top navigation:
    - FireRuleX logo/text (left)
    - "How it Works" anchor link (right)
    - Sticky top, blur backdrop, white/transparent

    ### 2. src/components/FileUpload.tsx
    Drag-and-drop upload component:
    - Large dashed-border drop zone with icon
    - Accepts: .dwg, .dxf, .pdf, .jpg, .jpeg, .png
    - File size validation (max 10MB)
    - Shows selected file name + size after selection
    - "Analyze" button to submit
    - Click anywhere in zone to open file picker
    - Drag hover state (border color change + background)
    - Uses React state — no form library needed
    - On submit: POST to /api/analyze with FormData, handle response
    - On success: redirect to /results page (pass data via URL params or state)

    ### 3. src/app/page.tsx — Landing page
    Sections (single-page scroll):

    **Hero Section:**
    - Headline: "Check Your Fire Safety Compliance in Seconds"
    - Subheadline: "Upload your floor plan. Get IS 2190:2024 compliance results instantly."
    - FileUpload component prominently placed
    - Trust badges: "IS 2190:2024", "Commercial Buildings", "AI-Powered"

    **How It Works Section (3 steps):**
    1. Upload — "Drop your DWG, PDF, or image floor plan"
    2. Analyze — "AI extracts building data, checks against IS 2190:2024 rules"
    3. Results — "Get your compliance score and fix violations"

    **Value Props Section:**
    - "80% of fire NOC rejections are preventable"
    - "Check before you submit — save time and money"
    - Supported by IS 2190:2024 clause references

    **Footer:**
    - "Powered by FireRuleX" + disclaimer text

    IMPORTANT:
    - Use Tailwind classes directly (this is a Next.js app, not plain HTML)
    - All interactive elements need unique IDs for testing
    - Responsive: stack on mobile, side-by-side on desktop
    - Use framer-motion or CSS animations for micro-interactions (prefer CSS to avoid deps)
    - Do NOT use placeholder images — use SVG icons or emoji for now
  </action>
  <verify>
    ```powershell
    npm run dev
    ```
    Then open http://localhost:3000 in browser. Verify:
    - Landing page renders with hero, upload zone, how-it-works, footer
    - Drag-and-drop works (file appears in zone)
    - File type validation rejects unsupported files
    - Upload zone has hover/drag states
  </verify>
  <done>
    - Landing page replaces placeholder with full layout
    - FileUpload component handles drag-and-drop + click
    - File validation for type and size
    - Navbar + Footer present
    - Responsive layout (desktop + mobile)
    - Dev server runs without errors
  </done>
</task>

## Success Criteria
- [ ] Landing page looks professional and polished (fire safety theme)
- [ ] FileUpload accepts DWG, PDF, JPG, PNG via drag-and-drop or click
- [ ] File validation rejects unsupported types and files > 10MB
- [ ] Page is responsive (desktop-first, mobile-friendly)
- [ ] `npm run dev` runs without errors
- [ ] `npx tsc --noEmit` compiles clean
