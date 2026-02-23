---
phase: 1
plan: 2
wave: 1
---

# Plan 1.2: Rule Engine Core — Hazard Classification & Class A

## Objective
Build the core of the IS 2190:2024 rule engine: hazard type determination (Table 6) and Class A fire extinguisher requirements calculation (Table 1). This is the most critical business logic in Phase 1 — every other rule builds on top of it.

## Context
- `.gsd/SPEC.md` — Rule source: IS 2190:2024, commercial buildings, number/type of extinguishers only
- `.gsd/DECISIONS.md` — Input format: Option A (structured), not travel distance, not placement
- `src/data/nbc_rules.json` — Full IS 2190 rules (already written); reference `hazardClassification` and `placementRules.classA` sections
- `src/types/index.ts` — BuildingInput, AnalysisResult, Violation, ExtinguisherRequirement types

## Tasks

<task type="auto">
  <name>Implement hazard classifier (IS 2190 Annex B, Table 6)</name>
  <files>src/lib/hazardClassifier.ts</files>
  <action>
    Create `src/lib/hazardClassifier.ts` that determines the hazard type (low/moderate/high) from building inputs exactly as specified in IS 2190:2024 Annex B Table 6.

    **Logic:** A building is classified as the HIGHEST hazard level where ANY single criterion puts it there. Apply criteria in this priority order: high first, then moderate, then low as default.

    ```typescript
    // src/lib/hazardClassifier.ts
    import type { BuildingInput, HazardType } from '@/types';

    interface HazardCriteria {
      buildingHeightM: number;
      occupantCount: number;
      totalFloorAreaM2: number;
      flammableGasesLitres: number;
      flammableLiquidsLitres: number;
    }

    export function determineHazardType(input: BuildingInput): {
      hazardType: HazardType;
      reasons: string[];
      clauseRef: string;
    } {
      const reasons: string[] = [];
      const clauseRef = 'IS 2190:2024, Annex B (Table 6)';

      const criteria: HazardCriteria = {
        buildingHeightM: input.buildingHeight,
        occupantCount: input.occupantCount,
        totalFloorAreaM2: input.totalFloorArea,
        flammableGasesLitres: input.flammableGasesLitres ?? 0,
        flammableLiquidsLitres: input.flammableLiquidsLitres ?? 0,
      };

      // HIGH hazard: any single criterion exceeds high threshold
      if (criteria.buildingHeightM > 15)
        reasons.push(`Building height ${criteria.buildingHeightM}m > 15m`);
      if (criteria.occupantCount > 250)
        reasons.push(`Occupant count ${criteria.occupantCount} > 250`);
      if (criteria.totalFloorAreaM2 > 3000)
        reasons.push(`Total floor area ${criteria.totalFloorAreaM2}m² > 3000m²`);
      if (criteria.flammableGasesLitres > 3000)
        reasons.push(`Flammable gases ${criteria.flammableGasesLitres}L > 3000L`);
      if (criteria.flammableLiquidsLitres > 1000)
        reasons.push(`Flammable liquids ${criteria.flammableLiquidsLitres}L > 1000L`);

      if (reasons.length > 0) {
        return { hazardType: 'high', reasons, clauseRef };
      }

      // MODERATE hazard: any criterion in moderate range
      const moderateReasons: string[] = [];
      if (criteria.occupantCount >= 15 && criteria.occupantCount <= 250)
        moderateReasons.push(`Occupant count ${criteria.occupantCount} (15–250)`);
      if (criteria.totalFloorAreaM2 >= 300 && criteria.totalFloorAreaM2 <= 3000)
        moderateReasons.push(`Floor area ${criteria.totalFloorAreaM2}m² (300–3000m²)`);
      if (criteria.flammableGasesLitres >= 500 && criteria.flammableGasesLitres <= 3000)
        moderateReasons.push(`Flammable gases ${criteria.flammableGasesLitres}L (500–3000L)`);
      if (criteria.flammableLiquidsLitres >= 250 && criteria.flammableLiquidsLitres <= 1000)
        moderateReasons.push(`Flammable liquids ${criteria.flammableLiquidsLitres}L (250–1000L)`);

      if (moderateReasons.length > 0) {
        return { hazardType: 'moderate', reasons: moderateReasons, clauseRef };
      }

      // LOW hazard: default
      return {
        hazardType: 'low',
        reasons: ['All criteria within low hazard thresholds'],
        clauseRef,
      };
    }
    ```

    IMPORTANT: Do not implement any travel distance or placement logic here — decided out of MVP scope.
  </action>
  <verify>
    After writing the file, run the TypeScript compiler check:
    ```powershell
    npx tsc --noEmit
    ```
    Must output nothing (no errors).
  </verify>
  <done>
    - src/lib/hazardClassifier.ts compiles without TypeScript errors
    - determineHazardType function exported correctly
    - Building with height=20m → 'high'
    - Building with area=500m², 50 occupants → 'moderate'
    - Building with area=100m², 10 occupants → 'low'
  </done>
</task>

<task type="auto">
  <name>Implement Class A extinguisher calculator (IS 2190 Table 1)</name>
  <files>src/lib/classAChecker.ts</files>
  <action>
    Create `src/lib/classAChecker.ts` that calculates the required Class A fire extinguisher count and rating per floor as per IS 2190:2024 Table 1 and clauses 7.2.1–7.2.3.

    **Table 1 values to hardcode (sourced from IS 2190:2024):**
    - Low hazard: rating=2A, maxArea=300 m²/extinguisher
    - Moderate hazard: rating=3A, maxArea=150 m²/extinguisher
    - High hazard: rating=4A, maxArea=100 m²/extinguisher

    **Rules to implement:**
    1. requiredCount = Math.ceil(floorArea / maxAreaPerExtinguisher)
    2. Minimum 2 extinguishers per floor (exception: if floorArea < 100m², minimum is 1)
    3. Apply this calculation independently for each floor

    ```typescript
    // src/lib/classAChecker.ts
    import type { HazardType, ExtinguisherRequirement, Violation } from '@/types';

    const CLASS_A_TABLE: Record<HazardType, { rating: string; maxAreaM2: number }> = {
      low:      { rating: '2A', maxAreaM2: 300 },
      moderate: { rating: '3A', maxAreaM2: 150 },
      high:     { rating: '4A', maxAreaM2: 100 },
    };

    export interface ClassAResult {
      requirements: ExtinguisherRequirement[];
      violations: Violation[];
    }

    export function checkClassA(
      floorAreas: number[],
      hazardType: HazardType
    ): ClassAResult {
      const { rating, maxAreaM2 } = CLASS_A_TABLE[hazardType];
      const requirements: ExtinguisherRequirement[] = [];
      const violations: Violation[] = [];

      floorAreas.forEach((area, idx) => {
        const floorLabel = idx === 0 ? 'Ground Floor' : `Floor ${idx}`;
        const calculated = Math.ceil(area / maxAreaM2);
        const minimum = area < 100 ? 1 : 2;                    // cl 7.2.2
        const countRequired = Math.max(calculated, minimum);

        requirements.push({
          fireClass: 'A',
          minimumRating: rating,
          countRequired,
          perFloor: true,
          clauseRef: `IS 2190:2024, Table 1 (${hazardType} hazard), cl 7.2.1–7.2.2`,
          note: `Floor area ${area}m²: needs ${calculated} by area, min ${minimum} by rule`,
        });

        // Violation only if the building claims 0 extinguishers (checked in engine)
        // This function calculates requirements, violations raised by the engine
      });

      return { requirements, violations };
    }
    ```

    NOTE: Violations about provided vs required count are raised by the main engine (Plan 1.3), not here. This function calculates what IS REQUIRED. The engine will compare against what's provided (from AI extraction in Phase 2). For Phase 1, we focus on computing requirements from input data.
  </action>
  <verify>
    ```powershell
    npx tsc --noEmit
    ```
    Must output nothing.
  </verify>
  <done>
    - src/lib/classAChecker.ts compiles without errors
    - checkClassA(['ground', 400m²], 'moderate') returns countRequired=3 (ceil(400/150)=3, ≥2 ✓)
    - checkClassA(['ground', 80m²], 'low') returns countRequired=1 (ceil(80/300)=1, area<100 so min=1)
    - All floors independently calculated
  </done>
</task>

## Success Criteria
- [ ] `src/lib/hazardClassifier.ts` compiles and correctly maps Table 6 criteria to hazard types
- [ ] `src/lib/classAChecker.ts` compiles and correctly implements Table 1 per-floor count calculation
- [ ] `npx tsc --noEmit` outputs no errors after both files created
