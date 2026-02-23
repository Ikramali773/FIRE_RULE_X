---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Next.js 15 Project Scaffold

## Objective
Initialize the FireRuleX Next.js 15 application at the project root with TypeScript, Tailwind CSS, and the correct folder structure. This gives us a running local dev server and the file structure all subsequent plans build on.

## Context
- `.gsd/SPEC.md` — Stack: Next.js + Tailwind, deployed on Vercel
- `.gsd/ROADMAP.md` — Phase 1 task: "Initialize Next.js project with Tailwind CSS at project root"
- `nbc_rules.json` — Already exists at root; must be preserved and moved to `src/data/`

## Tasks

<task type="auto">
  <name>Initialize Next.js 15 project at root</name>
  <files>
    package.json, next.config.ts, tsconfig.json, tailwind.config.ts,
    postcss.config.mjs, .eslintrc.json, .gitignore
  </files>
  <action>
    Run the create-next-app command in non-interactive mode:

    ```powershell
    npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
    ```

    After scaffold completes:
    1. Verify `src/app/page.tsx` exists
    2. Verify `tailwind.config.ts` is present
    3. Verify `package.json` has `next: "^15"` as dependency

    DO NOT run `npm install` separately — create-next-app does it automatically.
    DO NOT use --turbopack (stability reasons for MVP).
  </action>
  <verify>
    ```powershell
    node -e "const p = require('./package.json'); console.log(p.dependencies.next)"
    ```
    Must output a version string starting with `15.` or `^15`.
  </verify>
  <done>
    - package.json exists with next 15.x dependency
    - src/app/page.tsx exists
    - tailwind.config.ts exists
  </done>
</task>

<task type="auto">
  <name>Set up project folder structure and move nbc_rules.json</name>
  <files>
    src/data/nbc_rules.json,
    src/lib/.gitkeep,
    src/types/index.ts,
    src/app/page.tsx (replace boilerplate)
  </files>
  <action>
    1. Create `src/data/` directory and move nbc_rules.json there:
       ```powershell
       New-Item -ItemType Directory -Path "src/data" -Force
       Move-Item -Path "nbc_rules.json" -Destination "src/data/nbc_rules.json"
       ```

    2. Create `src/lib/` directory (for rule engine and utilities):
       ```powershell
       New-Item -ItemType Directory -Path "src/lib" -Force
       ```

    3. Create `src/types/index.ts` with the core TypeScript types:
       ```typescript
       // src/types/index.ts
       export type HazardType = 'low' | 'moderate' | 'high';
       export type FireClass = 'A' | 'B' | 'C' | 'D' | 'F';

       export interface BuildingInput {
         buildingName: string;
         buildingType: 'commercial';          // MVP: commercial only
         totalFloorArea: number;              // m²
         numberOfFloors: number;
         floorAreas: number[];                // m² per floor, index 0 = ground
         buildingHeight: number;              // m
         occupantCount: number;
         hasKitchen: boolean;
         cookingAreaM2?: number;              // m² of cooking appliance area
         hasFlammableLiquids: boolean;
         flammableLiquidsLitres?: number;
         hasFlammableGases: boolean;
         flammableGasesLitres?: number;
         hasCombustibleMetals: boolean;
         hasElectricalHazards: boolean;       // server rooms, electrical panels
         state?: string;                      // e.g. 'MH' for Maharashtra
       }

       export interface ExtinguisherRequirement {
         fireClass: FireClass;
         minimumRating: string;              // e.g. '3A', '144B', '5F'
         countRequired: number;
         perFloor?: boolean;
         clauseRef: string;
         note?: string;
       }

       export interface Violation {
         ruleId: string;
         clauseRef: string;
         severity: 'high' | 'medium' | 'low';
         description: string;
         fixSuggestion: string;
         floor?: string;
       }

       export interface AnalysisResult {
         hazardType: HazardType;
         complianceScore: number;
         grade: 'A' | 'B' | 'C' | 'D';
         nocReadiness: 'READY' | 'CONDITIONAL' | 'NOT_READY';
         requiredExtinguishers: ExtinguisherRequirement[];
         violations: Violation[];
         passedRules: string[];
         analysisMethod: 'structured_input';
       }
       ```

    4. Replace `src/app/page.tsx` boilerplate with a simple placeholder:
       ```tsx
       export default function Home() {
         return (
           <main className="min-h-screen bg-gray-50 flex items-center justify-center">
             <h1 className="text-2xl font-bold text-gray-800">FireRuleX — Coming Soon</h1>
           </main>
         );
       }
       ```
  </action>
  <verify>
    ```powershell
    Test-Path "src/data/nbc_rules.json"
    Test-Path "src/types/index.ts"
    Test-Path "src/lib"
    ```
    All must output `True`.
  </verify>
  <done>
    - src/data/nbc_rules.json exists (moved from root)
    - src/types/index.ts exists with all 6 exported types
    - src/lib/ directory exists
    - npm run dev starts without errors
  </done>
</task>

<task type="checkpoint:human-verify">
  <name>Verify dev server starts cleanly</name>
  <action>
    Run:
    ```powershell
    npm run dev
    ```
    Open http://localhost:3000 in browser.
    Expected: Page loads showing "FireRuleX — Coming Soon" text.
    Stop the server with Ctrl+C after verifying.
  </action>
  <done>
    - Dev server starts without TypeScript or Tailwind errors
    - http://localhost:3000 shows the placeholder page
  </done>
</task>

## Success Criteria
- [ ] `npm run dev` starts without errors
- [ ] `src/data/nbc_rules.json` exists with IS 2190 rules
- [ ] `src/types/index.ts` defines BuildingInput, AnalysisResult, Violation types
- [ ] `src/lib/` directory ready for rule engine files
