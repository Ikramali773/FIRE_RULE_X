# backend/tests/test_confidence_scorer.py
# Port of confidenceScorer.test.ts

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import BuildingInput
from confidence_scorer import score_confidence

_good_input = BuildingInput(
    building_name="Good Building",
    building_type="Office",
    total_floor_area=500,
    number_of_floors=2,
    floor_areas=[250, 250],
    building_height=7,
    occupant_count=50,
    has_kitchen=False,
    has_flammable_liquids=False,
    has_flammable_gases=False,
    has_combustible_metals=False,
    has_electrical_hazards=False,
)


class TestConfidenceScorer:
    def test_high_confidence_for_complete_data(self):
        result = score_confidence(_good_input)
        assert result.overall == "high"
        assert result.score >= 70

    def test_penalizes_missing_floor_area(self):
        inp = _good_input.model_copy(update={"total_floor_area": 0})
        result = score_confidence(inp)
        assert result.score < _good_input.total_floor_area  # Less than 100
        assert any("floor area" in f.lower() for f in result.flags)

    def test_penalizes_mismatched_floor_count(self):
        inp = _good_input.model_copy(update={"number_of_floors": 5})
        result = score_confidence(inp)
        assert any("doesn't match" in f for f in result.flags)

    def test_penalizes_high_density(self):
        inp = _good_input.model_copy(update={"occupant_count": 500})
        result = score_confidence(inp)
        assert any("density" in f.lower() for f in result.flags)

    def test_full_score_for_perfect_data(self):
        result = score_confidence(_good_input)
        assert result.score == 100
        assert len(result.flags) == 0
