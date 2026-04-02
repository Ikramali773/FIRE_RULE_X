# backend/tests/test_rule_engine.py
# Port of ruleEngine.test.ts — same test cases and assertions

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import BuildingInput
from rule_engine import run_rule_engine

# ── Test fixtures ──

small_office = BuildingInput(
    building_name="Small Office",
    building_type="Office",
    total_floor_area=150,
    number_of_floors=1,
    floor_areas=[150],
    building_height=4,
    occupant_count=10,
    has_kitchen=False,
    has_flammable_liquids=False,
    has_combustible_metals=False,
    has_electrical_hazards=False,
    has_flammable_gases=False,
)

large_commercial = BuildingInput(
    building_name="Large Mall",
    building_type="Warehouse",
    total_floor_area=5000,
    number_of_floors=4,
    floor_areas=[1250, 1250, 1250, 1250],
    building_height=16,
    occupant_count=500,
    has_kitchen=True,
    cooking_area_m2=0.06,
    has_flammable_liquids=True,
    flammable_liquids_litres=1200,
    has_combustible_metals=False,
    has_electrical_hazards=True,
    has_flammable_gases=False,
)


class TestSmallOffice:
    def test_classifies_as_low_hazard(self):
        result = run_rule_engine(small_office)
        assert result.hazard_type == "low"

    def test_requires_2a_rated_extinguishers(self):
        result = run_rule_engine(small_office)
        class_a = next((r for r in result.required_extinguishers if r.fire_class == "A"), None)
        assert class_a is not None
        assert class_a.minimum_rating == "2A"

    def test_requires_minimum_2_extinguishers(self):
        result = run_rule_engine(small_office)
        class_a = next((r for r in result.required_extinguishers if r.fire_class == "A"), None)
        assert class_a is not None
        # 150m² / 300m² = 0.5 → ceil = 1, but minimum is 2 (150m² >= 100m²)
        assert class_a.count_required == 2

    def test_no_high_violations(self):
        result = run_rule_engine(small_office)
        high_violations = [v for v in result.violations if v.severity == "high"]
        assert len(high_violations) == 0

    def test_compliance_score_100(self):
        result = run_rule_engine(small_office)
        assert result.compliance_score == 100


class TestLargeCommercial:
    def test_classifies_as_high_hazard(self):
        result = run_rule_engine(large_commercial)
        assert result.hazard_type == "high"

    def test_requires_4a_extinguishers(self):
        result = run_rule_engine(large_commercial)
        class_a_reqs = [r for r in result.required_extinguishers if r.fire_class == "A"]
        for req in class_a_reqs:
            assert req.minimum_rating == "4A"

    def test_requires_233b_extinguishers(self):
        result = run_rule_engine(large_commercial)
        class_b = next((r for r in result.required_extinguishers if r.fire_class == "B"), None)
        assert class_b is not None
        assert class_b.minimum_rating == "233B"

    def test_requires_25f_for_kitchen(self):
        result = run_rule_engine(large_commercial)
        class_f = next((r for r in result.required_extinguishers if r.fire_class == "F"), None)
        assert class_f is not None
        assert class_f.minimum_rating == "25F"

    def test_requires_electrical_extinguisher(self):
        result = run_rule_engine(large_commercial)
        elec = next((r for r in result.required_extinguishers if r.fire_class == "C"), None)
        assert elec is not None
        assert "6.3.7" in elec.clause_ref

    def test_correct_class_a_count_per_floor(self):
        result = run_rule_engine(large_commercial)
        class_a_reqs = [r for r in result.required_extinguishers if r.fire_class == "A"]
        # 1250m² / 100m² = 12.5 → ceil = 13
        for req in class_a_reqs:
            assert req.count_required == 13


class TestKitchenWithoutArea:
    def test_creates_medium_violation(self):
        inp = small_office.model_copy(update={"has_kitchen": True, "cooking_area_m2": None})
        result = run_rule_engine(inp)
        violation = next((v for v in result.violations if v.rule_id == "F-MISSING-AREA"), None)
        assert violation is not None
        assert violation.severity == "medium"


class TestCombustibleMetals:
    def test_creates_high_violation(self):
        inp = small_office.model_copy(update={"has_combustible_metals": True})
        result = run_rule_engine(inp)
        violation = next((v for v in result.violations if v.rule_id == "D-PROFESSIONAL"), None)
        assert violation is not None
        assert violation.severity == "high"
