// src/types/index.ts
// Core TypeScript types for the FireRuleX rule engine

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
