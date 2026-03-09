// src/lib/nbcChecker.ts
// NBC 2016 Part IV — Building Classification & Safety Rule Checker
//
// Evaluates NBC compliance for:
//   1. Occupant Load (Table 3) — max occupants based on floor area & group
//   2. Exit Capacity (Table 4) — required exit widths for stairways, corridors, doors
//   3. Travel Distance (Table 5) — max travel distance to nearest exit
//   4. Firefighting Installations (Table 7) — required fire protection systems
//
// All functions are pure and deterministic — no side effects.

import type { BuildingInput, OccupancyGroup, ConstructionType, FirefightingInstallationRequirement } from '@/types';
import nbcData from '@/data/nbc_building_classification.json';

// ── Types ──────────────────────────────────────────────────────────────

export interface OccupantLoadResult {
    maxOccupants: number;
    loadFactor: number;          // m² per person
    floorAreaUsed: number;       // m² used for calculation
    group: OccupancyGroup;
    clauseRef: string;
}

export interface ExitCapacityResult {
    stairwayUnits: number;       // required unit widths
    corridorUnits: number;
    doorUnits: number;
    stairwayWidthMm: number;     // unit widths × 500mm
    corridorWidthMm: number;
    doorWidthMm: number;
    occupantCount: number;
    group: OccupancyGroup;
    clauseRef: string;
}

export interface TravelDistanceResult {
    maxDistanceM: number;        // max allowed travel distance (metres)
    baseDistanceM: number;       // before sprinkler bonus
    sprinklerApplied: boolean;
    constructionType: ConstructionType;
    group: OccupancyGroup;
    clauseRef: string;
}

export interface NBCViolation {
    ruleId: string;
    clauseRef: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    fixSuggestion: string;
}

export interface NBCCheckResult {
    occupantLoad?: OccupantLoadResult;
    exitCapacity?: ExitCapacityResult;
    travelDistance?: TravelDistanceResult;
    firefightingInstallations?: FirefightingInstallationRequirement;
    violations: NBCViolation[];
    passedRules: string[];
}

// ── Constants ──────────────────────────────────────────────────────────

const UNIT_WIDTH_MM = 500;  // One unit exit width = 500mm per NBC

// ── Helper: get occupant load factor ────────────────────────────────

function getOccupantLoadFactor(group: OccupancyGroup, subType?: string): number | null {
    const factors = nbcData.occupantLoadFactors.factors as Record<string, Record<string, unknown>>;
    const groupFactors = factors[group];
    if (!groupFactors) return null;

    // Groups with sub-types (C, D, F)
    if (subType && typeof groupFactors[subType] === 'number') {
        return groupFactors[subType] as number;
    }

    // Default factor
    if (typeof groupFactors['default'] === 'number') {
        return groupFactors['default'] as number;
    }

    // For groups with only sub-types, pick the first numeric one
    for (const key of Object.keys(groupFactors)) {
        if (key !== 'unit' && typeof groupFactors[key] === 'number') {
            return groupFactors[key] as number;
        }
    }

    return null;
}

// ── 1. Occupant Load (Table 3) ─────────────────────────────────────

export function calculateOccupantLoad(
    group: OccupancyGroup,
    floorAreaM2: number,
    subType?: string
): OccupantLoadResult | null {
    const factor = getOccupantLoadFactor(group, subType);
    if (factor === null) return null;

    const maxOccupants = Math.floor(floorAreaM2 / factor);

    return {
        maxOccupants,
        loadFactor: factor,
        floorAreaUsed: floorAreaM2,
        group,
        clauseRef: 'NBC 2016 Part IV, Table 3',
    };
}

// ── 2. Exit Capacity (Table 4) ─────────────────────────────────────

export function calculateExitCapacity(
    group: OccupancyGroup,
    occupantCount: number
): ExitCapacityResult | null {
    const factors = nbcData.capacityFactors.factors as Record<
        string,
        { stairways: number; corridors: number; doors: number }
    >;
    const groupFactors = factors[group];
    if (!groupFactors) return null;

    const stairwayUnits = Math.ceil(occupantCount / groupFactors.stairways);
    const corridorUnits = Math.ceil(occupantCount / groupFactors.corridors);
    const doorUnits = Math.ceil(occupantCount / groupFactors.doors);

    return {
        stairwayUnits,
        corridorUnits,
        doorUnits,
        stairwayWidthMm: stairwayUnits * UNIT_WIDTH_MM,
        corridorWidthMm: corridorUnits * UNIT_WIDTH_MM,
        doorWidthMm: doorUnits * UNIT_WIDTH_MM,
        occupantCount,
        group,
        clauseRef: 'NBC 2016 Part IV, Table 4',
    };
}

// ── 3. Travel Distance (Table 5) ───────────────────────────────────

export function checkTravelDistance(
    group: OccupancyGroup,
    constructionType: ConstructionType,
    hasSprinklers: boolean,
    subdivision?: string
): TravelDistanceResult | null {
    const distances = nbcData.travelDistance.distances as Record<
        string,
        { type12: number | string; type34: number | string }
    >;

    // Industrial groups G-1, G-2, G-3 have separate entries
    let lookupKey = group as string;
    if (group === 'G' && subdivision && distances[subdivision]) {
        lookupKey = subdivision;
    }

    const entry = distances[lookupKey];
    if (!entry) return null;

    const baseValue = constructionType === 'type12' ? entry.type12 : entry.type34;

    // NOT_PERMITTED case (Storage H, Hazardous J with type34)
    if (baseValue === 'NOT_PERMITTED') {
        return {
            maxDistanceM: -1,   // -1 signals NOT_PERMITTED
            baseDistanceM: -1,
            sprinklerApplied: false,
            constructionType,
            group,
            clauseRef: 'NBC 2016 Part IV, Table 5',
        };
    }

    const baseDistance = baseValue as number;
    const sprinklerBonus = nbcData.travelDistance.sprinklerBonus;
    const maxDistance = hasSprinklers ? baseDistance * sprinklerBonus : baseDistance;

    return {
        maxDistanceM: maxDistance,
        baseDistanceM: baseDistance,
        sprinklerApplied: hasSprinklers,
        constructionType,
        group,
        clauseRef: 'NBC 2016 Part IV, Table 5',
    };
}

// ── 4. Firefighting Installations (Table 7) ────────────────────────

export function checkFirefightingInstallations(
    group: OccupancyGroup,
    subdivision: string | undefined,
    buildingHeightM: number
): { result?: FirefightingInstallationRequirement; violation?: NBCViolation } {
    const fiData = (nbcData as Record<string, unknown>).firefightingInstallations as {
        heightNotPermitted: Record<string, number>;
        requirements: Record<string, Array<{
            maxHeightM: number;
            label: string;
            fireExtinguisher: boolean;
            firstAidHoseReel: boolean;
            wetRiser: boolean;
            downComer: boolean;
            yardHydrant: boolean;
            automaticSprinkler: boolean;
            manualFireAlarm: boolean;
            autoDetectionAlarm: boolean;
            undergroundTankLitres: number | null;
            terraceTankLitres: number | null;
            undergroundPumpLpm: number | null;
            terracePumpLpm: number | null;
        }>>;
    };

    if (!fiData) return {};

    // Check height-not-permitted limits
    const maxHeight = fiData.heightNotPermitted[group];
    if (maxHeight !== undefined && buildingHeightM > maxHeight) {
        return {
            violation: {
                ruleId: 'NBC-FI-HEIGHT-NOT-PERMITTED',
                clauseRef: 'NBC 2016 Part IV, Table 7',
                severity: 'high',
                description: `Building height (${buildingHeightM}m) exceeds the maximum permitted height (${maxHeight}m) for Group ${group} occupancy.`,
                fixSuggestion: `Group ${group} buildings must not exceed ${maxHeight}m. Reduce building height or reclassify the occupancy.`,
            },
        };
    }

    // Look up requirements — try subdivision first, then group
    let tiers = fiData.requirements[subdivision ?? ''];
    if (!tiers) {
        tiers = fiData.requirements[group];
    }
    if (!tiers || tiers.length === 0) return {};

    // Find matching height tier (first tier where buildingHeight ≤ maxHeightM)
    const tier = tiers.find(t => buildingHeightM <= t.maxHeightM);
    if (!tier) {
        // Height exceeds all defined tiers — use the last (highest) tier
        const lastTier = tiers[tiers.length - 1];
        return {
            result: {
                fireExtinguisher: lastTier.fireExtinguisher,
                firstAidHoseReel: lastTier.firstAidHoseReel,
                wetRiser: lastTier.wetRiser,
                downComer: lastTier.downComer,
                yardHydrant: lastTier.yardHydrant,
                automaticSprinkler: lastTier.automaticSprinkler,
                manualFireAlarm: lastTier.manualFireAlarm,
                autoDetectionAlarm: lastTier.autoDetectionAlarm,
                undergroundTankLitres: lastTier.undergroundTankLitres,
                terraceTankLitres: lastTier.terraceTankLitres,
                undergroundPumpLpm: lastTier.undergroundPumpLpm,
                terracePumpLpm: lastTier.terracePumpLpm,
                heightTierLabel: lastTier.label,
                occupancyLabel: subdivision ?? group,
                clauseRef: 'NBC 2016 Part IV, Table 7',
            },
        };
    }

    return {
        result: {
            fireExtinguisher: tier.fireExtinguisher,
            firstAidHoseReel: tier.firstAidHoseReel,
            wetRiser: tier.wetRiser,
            downComer: tier.downComer,
            yardHydrant: tier.yardHydrant,
            automaticSprinkler: tier.automaticSprinkler,
            manualFireAlarm: tier.manualFireAlarm,
            autoDetectionAlarm: tier.autoDetectionAlarm,
            undergroundTankLitres: tier.undergroundTankLitres,
            terraceTankLitres: tier.terraceTankLitres,
            undergroundPumpLpm: tier.undergroundPumpLpm,
            terracePumpLpm: tier.terracePumpLpm,
            heightTierLabel: tier.label,
            occupancyLabel: subdivision ?? group,
            clauseRef: 'NBC 2016 Part IV, Table 7',
        },
    };
}

// ── Orchestrator ───────────────────────────────────────────────────

export function runNBCChecks(input: BuildingInput): NBCCheckResult {
    const violations: NBCViolation[] = [];
    const passedRules: string[] = [];
    let occupantLoad: OccupantLoadResult | undefined;
    let exitCapacity: ExitCapacityResult | undefined;
    let travelDistance: TravelDistanceResult | undefined;
    let firefightingInstallations: FirefightingInstallationRequirement | undefined;

    const group = input.occupancyGroup;
    if (!group) {
        return { violations, passedRules };
    }

    // ── Occupant Load ──
    const loadResult = calculateOccupantLoad(group, input.totalFloorArea);
    if (loadResult) {
        occupantLoad = loadResult;

        if (input.occupantCount > loadResult.maxOccupants) {
            violations.push({
                ruleId: 'NBC-OL-EXCEED',
                clauseRef: 'NBC 2016 Part IV, Table 3',
                severity: 'high',
                description: `Occupant count (${input.occupantCount}) exceeds maximum allowed (${loadResult.maxOccupants}) for Group ${group} with ${input.totalFloorArea}m² floor area (factor: ${loadResult.loadFactor} m²/person).`,
                fixSuggestion: `Reduce occupant count to max ${loadResult.maxOccupants}, or increase floor area to at least ${input.occupantCount * loadResult.loadFactor}m².`,
            });
        } else {
            passedRules.push(`Occupant load OK: ${input.occupantCount} ≤ ${loadResult.maxOccupants} max (Group ${group}, ${loadResult.loadFactor} m²/person)`);
        }
    }

    // ── Exit Capacity ──
    const capacityResult = calculateExitCapacity(group, input.occupantCount);
    if (capacityResult) {
        exitCapacity = capacityResult;
        passedRules.push(
            `Exit capacity calculated: stairways ${capacityResult.stairwayUnits} units (${capacityResult.stairwayWidthMm}mm), ` +
            `corridors ${capacityResult.corridorUnits} units (${capacityResult.corridorWidthMm}mm), ` +
            `doors ${capacityResult.doorUnits} units (${capacityResult.doorWidthMm}mm)`
        );
    }

    // ── Travel Distance ──
    if (input.constructionType) {
        const distResult = checkTravelDistance(
            group,
            input.constructionType,
            input.hasSprinklers ?? false,
            input.occupancySubdivision ?? undefined
        );

        if (distResult) {
            travelDistance = distResult;

            if (distResult.maxDistanceM === -1) {
                // NOT_PERMITTED
                violations.push({
                    ruleId: 'NBC-TD-NOT-PERMITTED',
                    clauseRef: 'NBC 2016 Part IV, Table 5',
                    severity: 'high',
                    description: `Type 3/4 construction is NOT PERMITTED for Group ${group} occupancy.`,
                    fixSuggestion: `Building must use Type 1 or Type 2 (fire-resistive/non-combustible) construction for Group ${group}.`,
                });
            } else if (input.travelDistanceM && input.travelDistanceM > distResult.maxDistanceM) {
                violations.push({
                    ruleId: 'NBC-TD-EXCEED',
                    clauseRef: 'NBC 2016 Part IV, Table 5',
                    severity: 'high',
                    description: `Travel distance (${input.travelDistanceM}m) exceeds maximum allowed (${distResult.maxDistanceM}m) for Group ${group}, ${input.constructionType} construction${distResult.sprinklerApplied ? ' (with sprinkler bonus)' : ''}.`,
                    fixSuggestion: `Reduce travel distance to ≤${distResult.maxDistanceM}m, or add additional exits.${!input.hasSprinklers ? ' Installing sprinklers increases the allowance by 50%.' : ''}`,
                });
            } else {
                const distNote = input.travelDistanceM
                    ? `${input.travelDistanceM}m ≤ ${distResult.maxDistanceM}m max`
                    : `max ${distResult.maxDistanceM}m allowed`;
                passedRules.push(
                    `Travel distance OK: ${distNote} (Group ${group}, ${input.constructionType}${distResult.sprinklerApplied ? ', sprinklered' : ''})`
                );
            }
        }
    }

    // ── Firefighting Installations (Table 7) ──
    if (input.buildingHeight > 0) {
        const fiCheck = checkFirefightingInstallations(
            group,
            input.occupancySubdivision ?? undefined,
            input.buildingHeight
        );

        if (fiCheck.violation) {
            violations.push(fiCheck.violation);
        }

        if (fiCheck.result) {
            firefightingInstallations = fiCheck.result;

            // Count required installations
            const requiredItems: string[] = [];
            if (fiCheck.result.fireExtinguisher) requiredItems.push('Fire Extinguisher');
            if (fiCheck.result.firstAidHoseReel) requiredItems.push('Hose Reel');
            if (fiCheck.result.wetRiser) requiredItems.push('Wet Riser');
            if (fiCheck.result.downComer) requiredItems.push('Down Comer');
            if (fiCheck.result.yardHydrant) requiredItems.push('Yard Hydrant');
            if (fiCheck.result.automaticSprinkler) requiredItems.push('Sprinkler System');
            if (fiCheck.result.manualFireAlarm) requiredItems.push('Manual Fire Alarm');
            if (fiCheck.result.autoDetectionAlarm) requiredItems.push('Auto Detection & Alarm');

            passedRules.push(
                `Firefighting installations identified (Table 7, ${fiCheck.result.heightTierLabel}): ${requiredItems.join(', ')}`
            );
        }
    }

    return {
        occupantLoad,
        exitCapacity,
        travelDistance,
        firefightingInstallations,
        violations,
        passedRules,
    };
}
