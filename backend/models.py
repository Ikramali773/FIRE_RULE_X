# backend/models.py
# Pydantic data models — mirrors src/types/index.ts
#
# All models use snake_case field names with aliases for camelCase JSON
# compatibility with the existing frontend.

from __future__ import annotations

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ── Enums / Literal Types ─────────────────────────────────────────────

HazardType = Literal["low", "moderate", "high"]
FireClass = Literal["A", "B", "C", "D", "F"]
OccupancyGroup = Literal["A", "B", "C", "D", "E", "F", "G", "H", "J"]
OccupancySubdivision = Literal[
    "A-1", "A-2", "A-3", "A-4", "A-5", "A-6",
    "B-1", "B-2",
    "C-1", "C-2", "C-3",
    "D-1", "D-2", "D-3", "D-4", "D-5", "D-6", "D-7",
    "E-1", "E-2", "E-3", "E-4", "E-5",
    "F-1", "F-2", "F-3",
    "G-1", "G-2", "G-3",
    "H", "J",
]
ConstructionType = Literal["type12", "type34"]
ConfidenceLevel = Literal["high", "medium", "low"]
AnalysisMethod = Literal["structured_input", "ai_vision", "manual_override"]
Grade = Literal["A", "B", "C", "D"]
NOCReadiness = Literal["READY", "CONDITIONAL", "NOT_READY"]


# ── Core Input ─────────────────────────────────────────────────────────


class BuildingInput(BaseModel):
    """Core building data — input to the rule engine."""

    model_config = {"populate_by_name": True}

    building_name: str = Field(alias="buildingName", default="")
    building_type: str = Field(alias="buildingType", default="")
    total_floor_area: float = Field(alias="totalFloorArea", default=0)
    number_of_floors: int = Field(alias="numberOfFloors", default=0)
    floor_areas: list[float] = Field(alias="floorAreas", default_factory=list)
    building_height: float = Field(alias="buildingHeight", default=0)
    occupant_count: int = Field(alias="occupantCount", default=0)
    has_kitchen: bool = Field(alias="hasKitchen", default=False)
    cooking_area_m2: Optional[float] = Field(alias="cookingAreaM2", default=None)
    has_flammable_liquids: bool = Field(alias="hasFlammableLiquids", default=False)
    flammable_liquids_litres: Optional[float] = Field(alias="flammableLiquidsLitres", default=None)
    has_flammable_gases: bool = Field(alias="hasFlammableGases", default=False)
    flammable_gases_litres: Optional[float] = Field(alias="flammableGasesLitres", default=None)
    has_combustible_metals: bool = Field(alias="hasCombustibleMetals", default=False)
    has_electrical_hazards: bool = Field(alias="hasElectricalHazards", default=False)
    state: Optional[str] = None

    # NBC 2016 Part IV fields (optional)
    occupancy_group: Optional[OccupancyGroup] = Field(alias="occupancyGroup", default=None)
    occupancy_subdivision: Optional[str] = Field(alias="occupancySubdivision", default=None)
    construction_type: Optional[ConstructionType] = Field(alias="constructionType", default=None)
    has_sprinklers: Optional[bool] = Field(alias="hasSprinklers", default=None)
    travel_distance_m: Optional[float] = Field(alias="travelDistanceM", default=None)
    basement_area: float = Field(alias="basementArea", default=0)


# ── Rule Engine Output Models ──────────────────────────────────────────


class ExtinguisherRequirement(BaseModel):
    model_config = {"populate_by_name": True}

    fire_class: FireClass = Field(alias="fireClass")
    minimum_rating: str = Field(alias="minimumRating")
    count_required: int = Field(alias="countRequired")
    per_floor: Optional[bool] = Field(alias="perFloor", default=None)
    clause_ref: str = Field(alias="clauseRef")
    note: Optional[str] = None


class Violation(BaseModel):
    model_config = {"populate_by_name": True}

    rule_id: str = Field(alias="ruleId")
    clause_ref: str = Field(alias="clauseRef")
    severity: Literal["high", "medium", "low"]
    description: str
    fix_suggestion: str = Field(alias="fixSuggestion")
    floor: Optional[str] = None


# ── NBC Compliance Detail ──────────────────────────────────────────────


class EvaluatedNote(BaseModel):
    """A Table 7 note that has been evaluated against actual building inputs."""
    model_config = {"populate_by_name": True}

    note_id: int = Field(alias="noteId")
    field: Optional[str] = Field(default=None, description="Which installation field this note applies to, e.g. 'automaticSprinkler'")
    condition: str = Field(description="Machine-readable condition key, e.g. 'basement_area_gt_200'")
    is_met: bool = Field(alias="isMet", description="Whether the condition is satisfied by the building inputs")
    description: str = Field(description="Full text of the note from NBC 2016")
    additional_value: Optional[float] = Field(alias="additionalValue", default=None, description="Extra value to add when condition is met (e.g. +5000 litres)")


class FirefightingInstallationRequirement(BaseModel):
    model_config = {"populate_by_name": True}

    fire_extinguisher: bool = Field(alias="fireExtinguisher")
    first_aid_hose_reel: bool = Field(alias="firstAidHoseReel")
    wet_riser: bool = Field(alias="wetRiser")
    down_comer: bool = Field(alias="downComer")
    yard_hydrant: bool = Field(alias="yardHydrant")
    automatic_sprinkler: bool = Field(alias="automaticSprinkler")
    manual_fire_alarm: bool = Field(alias="manualFireAlarm")
    auto_detection_alarm: bool = Field(alias="autoDetectionAlarm")
    underground_tank_litres: Optional[int] = Field(alias="undergroundTankLitres", default=None)
    terrace_tank_litres: Optional[int] = Field(alias="terraceTankLitres", default=None)
    underground_pump_lpm: Optional[int] = Field(alias="undergroundPumpLpm", default=None)
    terrace_pump_lpm: Optional[int] = Field(alias="terracePumpLpm", default=None)
    height_tier_label: str = Field(alias="heightTierLabel")
    occupancy_label: str = Field(alias="occupancyLabel")
    clause_ref: str = Field(alias="clauseRef")
    notes: Optional[str] = Field(default=None)
    evaluated_notes: list[EvaluatedNote] = Field(alias="evaluatedNotes", default_factory=list)


class OccupantLoadData(BaseModel):
    model_config = {"populate_by_name": True}

    max_occupants: int = Field(alias="maxOccupants")
    load_factor: float = Field(alias="loadFactor")
    floor_area_used: float = Field(alias="floorAreaUsed")
    group: OccupancyGroup


class ExitCapacityData(BaseModel):
    model_config = {"populate_by_name": True}

    stairway_units: int = Field(alias="stairwayUnits")
    corridor_units: int = Field(alias="corridorUnits")
    door_units: int = Field(alias="doorUnits")
    stairway_width_mm: int = Field(alias="stairwayWidthMm")
    corridor_width_mm: int = Field(alias="corridorWidthMm")
    door_width_mm: int = Field(alias="doorWidthMm")
    occupant_count: int = Field(alias="occupantCount")
    group: OccupancyGroup


class TravelDistanceData(BaseModel):
    model_config = {"populate_by_name": True}

    max_distance_m: float = Field(alias="maxDistanceM")
    base_distance_m: float = Field(alias="baseDistanceM")
    sprinkler_applied: bool = Field(alias="sprinklerApplied")
    construction_type: ConstructionType = Field(alias="constructionType")
    group: OccupancyGroup


class NBCComplianceData(BaseModel):
    model_config = {"populate_by_name": True}

    occupant_load: Optional[OccupantLoadData] = Field(alias="occupantLoad", default=None)
    exit_capacity: Optional[ExitCapacityData] = Field(alias="exitCapacity", default=None)
    travel_distance: Optional[TravelDistanceData] = Field(alias="travelDistance", default=None)
    firefighting_installations: Optional[FirefightingInstallationRequirement] = Field(
        alias="firefightingInstallations", default=None
    )


class AnalysisResult(BaseModel):
    model_config = {"populate_by_name": True}

    hazard_type: HazardType = Field(alias="hazardType")
    compliance_score: int = Field(alias="complianceScore")
    grade: Grade
    noc_readiness: NOCReadiness = Field(alias="nocReadiness")
    required_extinguishers: list[ExtinguisherRequirement] = Field(alias="requiredExtinguishers")
    violations: list[Violation]
    passed_rules: list[str] = Field(alias="passedRules")
    analysis_method: AnalysisMethod = Field(alias="analysisMethod")
    nbc_compliance: Optional[NBCComplianceData] = Field(alias="nbcCompliance", default=None)


# ── Extraction & API Response ──────────────────────────────────────────


class ExtractionConfidence(BaseModel):
    overall: ConfidenceLevel
    score: int
    flags: list[str]


class AnalyzeMeta(BaseModel):
    model_config = {"populate_by_name": True}

    file_name: str = Field(alias="fileName")
    file_size: int = Field(alias="fileSize")
    file_type: str = Field(alias="fileType")
    original_format: str = Field(alias="originalFormat")
    was_converted: bool = Field(alias="wasConverted")
    ai_provider: str = Field(alias="aiProvider")
    analyzed_at: str = Field(alias="analyzedAt")


class AnalyzeResponse(BaseModel):
    model_config = {"populate_by_name": True}

    extraction: BuildingInput
    analysis: AnalysisResult
    confidence: ExtractionConfidence
    needs_confirmation: bool = Field(alias="needsConfirmation")
    meta: AnalyzeMeta
