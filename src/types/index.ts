// src/types/index.ts
// Core TypeScript types for the FireRuleX rule engine

export type HazardType = 'low' | 'moderate' | 'high';
export type FireClass = 'A' | 'B' | 'C' | 'D' | 'F';

// --- NBC 2016 Part IV Types ---
export type OccupancyGroup = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'J' | 'K';

export type OccupancySubdivision =
    | 'A-1' | 'A-2' | 'A-3' | 'A-4' | 'A-5' | 'A-6'
    | 'B-1' | 'B-2'
    | 'C-1' | 'C-2' | 'C-3'
    | 'D-1' | 'D-2' | 'D-3' | 'D-4' | 'D-5' | 'D-6' | 'D-7'
    | 'E-1' | 'E-2' | 'E-3' | 'E-4' | 'E-5'
    | 'E-I' | 'E-II'   // NBCS 2026 Section 3.1.6
    | 'F-1' | 'F-2' | 'F-3'
    | 'F-I' | 'F-II'   // NBCS 2026 Section 3.1.7
    | 'G-1' | 'G-2' | 'G-3'
    | 'H' | 'J'
    | 'K';              // NBCS 2026 Section 3.1.11 — Mixed Occupancy

// Type 1&2 = fire-resistive / non-combustible; Type 3&4 = ordinary / wood-frame
export type ConstructionType = 'type12' | 'type34';

export interface BuildingInput {
    buildingName: string;
    buildingType: string;                // e.g. Office, Hospital, Residential
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

    // --- Phase 1: Building Basics fields ---
    projectName?: string;
    city?: string;
    buildingStatus?: 'proposed' | 'existing' | 'under_construction';
    plotArea?: number;
    totalBuiltUpArea?: number;
    basementCount?: number;
    parkingType?: 'open' | 'stilt' | 'basement' | 'mlcp';
    sprinklerProposed?: boolean;

    // --- NBCS 2026 Part F fields ---
    hasEvParking?: boolean;              // EV parking in podium/basement — triggers CL-5
    deadEndCorridorM?: number;           // longest dead-end corridor (m)

    // --- NBC 2016 Part IV fields (optional, additive) ---
    occupancyGroup?: OccupancyGroup;
    occupancySubdivision?: OccupancySubdivision;
    constructionType?: ConstructionType;
    hasSprinklers?: boolean;
    travelDistanceM?: number;            // actual measured travel distance in metres
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

// --- NBC 2016 Part IV Compliance Detail ---
export interface EvaluatedNote {
    noteId: number;
    field?: string;
    condition: string;
    isMet: boolean;
    description: string;
    additionalValue?: number;
    setValue?: number;
}

export interface FirefightingInstallationRequirement {
    fireExtinguisher: boolean;
    firstAidHoseReel: boolean;
    wetRiser: boolean;
    downComer: boolean;
    yardHydrant: boolean;
    automaticSprinkler: boolean;
    manualFireAlarm: boolean;
    autoDetectionAlarm: boolean;
    publicAddressVoiceEvacuation: boolean; // NBCS 2026 Tables 7A–7J Col 10
    undergroundTankLitres: number | null;
    terraceTankLitres: number | null;
    undergroundPumpLpm: number | null;
    terracePumpLpm: number | null;
    heightTierLabel: string;
    occupancyLabel: string;
    clauseRef: string;
    notes?: string;
    evaluatedNotes?: EvaluatedNote[];
}

// --- NBCS 2026 Part F Tracking Types ---
export type NBCSProtectionLevel = 'HL-1' | 'HL-2' | 'HL-3' | 'CL-3' | 'CL-4' | 'CL-5' | 'SELF-CERT';

export interface NBCSFirefightingInstallationRequirement {
    fireExtinguisher: boolean;
    firstAidHoseReel: boolean;
    wetRiser: boolean;
    downComer: boolean;
    yardHydrant: boolean;
    automaticSprinkler: boolean;
    autoDetectionAlarm: boolean;
    publicAddressVoiceEvacuation: boolean;
    protectionLevel: NBCSProtectionLevel;
    nbcsTableRef: string;
    occupancyLabel: string;
    clauseRef: string;
    selfCertificationEligible: boolean;
    triggeredNotes: string[];
    differsFromNbc: boolean;
}

export interface NBCSOccupantLoadData {
    totalOccupants: number;
    loadFactorNet?: number;
    loadFactorGross?: number;
    note: string;
}

export interface NBCSExitCapacityData {
    stairwayMmPerPerson: number;
    levelMmPerPerson: number;
    maxStairwayWidthMm: number;
    maxLevelWidthMm: number;
    deadEndLimitM: number;
    note: string;
}

export interface NBCSTravelDistanceData {
    maxDistanceM?: number;
    note: string;
}

// --- Floor-wise Occupant Load ---
export interface FloorOccupantLoad {
    floorIndex: number;
    floorLabel: string;
    floorArea: number;
    occupantCount: number;
}

// --- Floor-wise Exit Capacity ---
export interface FloorExitCapacity {
    floorIndex: number;
    floorLabel: string;
    occupantCount: number;
    stairwayWidthMm: number;
    levelWidthMm: number;
}

// --- Floor-wise Detector Counts ---
export interface FloorDetectorCount {
    floorIndex: number;
    floorLabel: string;
    floorArea: number;
    sprinklerCount: number;
    smokeDetectorCount: number;
}

export interface DetectorCountData {
    totalSprinklers: number;
    totalSmokeDetectors: number;
    sprinklerSpacingM: number;
    smokeDetectorSpacingM: number;
    sprinklerCoverageM2: number;
    smokeDetectorCoverageM2: number;
    floorWise: FloorDetectorCount[];
}

export interface NBCSApplicabilityResult {
    isApplicable: boolean;
    reason: string;
    clauseRef: string;
    occupancyLabel: string;
    heightThresholdM?: number;
    areaThresholdM2?: number;
}

export interface NBCComplianceData {
    occupantLoad?: {
        totalOccupants: number;
        maxOccupants: number;
        loadFactor: number;
        floorAreaUsed: number;
        group: OccupancyGroup;
        floorWise: FloorOccupantLoad[];
    };
    exitCapacity?: {
        stairwayMmPerPerson: number;
        levelMmPerPerson: number;
        maxStairwayWidthMm: number;
        maxLevelWidthMm: number;
        totalOccupantCount: number;
        group: OccupancyGroup;
        floorWise: FloorExitCapacity[];
    };
    travelDistance?: {
        maxDistanceM: number;
        baseDistanceM: number;
        sprinklerApplied: boolean;
        constructionType: ConstructionType;
        group: OccupancyGroup;
    };
    firefightingInstallations?: FirefightingInstallationRequirement;
    detectorCounts?: DetectorCountData;
    nbcsApplicability?: NBCSApplicabilityResult;
    nbcsFirefightingInstallations?: NBCSFirefightingInstallationRequirement;
    nbcsOccupantLoad?: NBCSOccupantLoadData;
    nbcsExitCapacity?: NBCSExitCapacityData;
    nbcsTravelDistance?: NBCSTravelDistanceData;
}

export interface SystemCard {
    systemName: string;
    status: string;
    triggeredBy: string;
    relevantStandards: string[];
    missingInputs: string[];
    nextSteps: string[];
}

export interface AnalysisResult {
    hazardType: HazardType;
    complianceScore: number;
    grade: 'A' | 'B' | 'C' | 'D';
    nocReadiness: 'READY' | 'CONDITIONAL' | 'NOT_READY';
    requiredExtinguishers: ExtinguisherRequirement[];
    violations: Violation[];
    passedRules: string[];
    analysisMethod: 'structured_input' | 'ai_vision' | 'manual_override';
    nbcCompliance?: NBCComplianceData;
    systemCards?: SystemCard[];
}

// --- Phase 2: Extraction & API Types ---

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ExtractionConfidence {
    overall: ConfidenceLevel;
    score: number;              // 0-100
    flags: string[];            // reasons for low confidence
}

export interface AnalyzeResponse {
    extraction: BuildingInput;
    analysis: AnalysisResult;
    confidence: ExtractionConfidence;
    needsConfirmation: boolean;  // true if confidence < 70
    meta: {
        fileName: string;
        fileSize: number;
        fileType: string;
        originalFormat: string;
        wasConverted: boolean;
        aiProvider: string;
        analyzedAt: string;
    };
}
