# backend/tests/test_hazard_classifier.py
# Port of hazardClassifier.test.ts

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import BuildingInput
from hazard_classifier import determine_hazard_type

_base = BuildingInput(
    building_name="Test",
    building_type="Office",
    total_floor_area=100,
    number_of_floors=1,
    floor_areas=[100],
    building_height=3,
    occupant_count=5,
    has_kitchen=False,
    has_flammable_liquids=False,
    has_flammable_gases=False,
    has_combustible_metals=False,
    has_electrical_hazards=False,
)


class TestHazardClassifier:
    def test_low_hazard_small_building(self):
        result = determine_hazard_type(_base)
        assert result["hazard_type"] == "low"

    def test_moderate_by_occupant_count(self):
        inp = _base.model_copy(update={"occupant_count": 100})
        result = determine_hazard_type(inp)
        assert result["hazard_type"] == "moderate"

    def test_high_by_height(self):
        inp = _base.model_copy(update={"building_height": 20})
        result = determine_hazard_type(inp)
        assert result["hazard_type"] == "high"

    def test_high_by_area(self):
        inp = _base.model_copy(update={"total_floor_area": 5000})
        result = determine_hazard_type(inp)
        assert result["hazard_type"] == "high"

    def test_high_by_occupants(self):
        inp = _base.model_copy(update={"occupant_count": 500})
        result = determine_hazard_type(inp)
        assert result["hazard_type"] == "high"

    def test_high_by_flammable_liquids(self):
        inp = _base.model_copy(update={"flammable_liquids_litres": 1500})
        result = determine_hazard_type(inp)
        assert result["hazard_type"] == "high"
