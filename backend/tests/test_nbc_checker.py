# backend/tests/test_nbc_checker.py
# NBC 2016 Part IV compliance tests — updated for Table 7 rewrite

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import BuildingInput
from nbc_checker import (
    calculate_occupant_load,
    calculate_exit_capacity,
    check_travel_distance,
    check_firefighting_installations,
    run_nbc_checks,
)


class TestOccupantLoad:
    def test_group_e_office(self):
        result = calculate_occupant_load("E", 1000)
        assert result is not None
        assert result.max_occupants > 0
        assert result.group == "E"

    def test_returns_none_for_unknown_group(self):
        result = calculate_occupant_load("Z", 1000)
        assert result is None


class TestExitCapacity:
    def test_group_e(self):
        result = calculate_exit_capacity("E", 100)
        assert result is not None
        assert result.stairway_units > 0
        assert result.stairway_width_mm == result.stairway_units * 500

    def test_returns_none_for_unknown_group(self):
        result = calculate_exit_capacity("Z", 100)
        assert result is None


class TestTravelDistance:
    def test_group_e_type12(self):
        result = check_travel_distance("E", "type12", False)
        assert result is not None
        assert result.max_distance_m > 0

    def test_sprinkler_bonus(self):
        without = check_travel_distance("E", "type12", False)
        with_spr = check_travel_distance("E", "type12", True)
        assert without is not None and with_spr is not None
        assert with_spr.max_distance_m > without.max_distance_m
        assert with_spr.sprinkler_applied is True


class TestFirefightingInstallations:
    def test_group_e_low_building(self):
        result = check_firefighting_installations("E", None, 8)
        assert "result" in result
        fi = result["result"]
        assert fi.fire_extinguisher is True
        assert fi.first_aid_hose_reel is True
        assert fi.wet_riser is False
        assert fi.down_comer is True

    def test_a2_private_dwelling_all_nr(self):
        """A-2 private dwellings should have all NR per PDF"""
        result = check_firefighting_installations("A", "A-2", 10)
        assert "result" in result
        fi = result["result"]
        assert fi.fire_extinguisher is False
        assert fi.first_aid_hose_reel is False
        assert fi.wet_riser is False
        assert fi.automatic_sprinkler is False
        assert fi.manual_fire_alarm is False

    def test_a1_height_not_permitted(self):
        """A-1 lodging above 15m should not be permitted (Note 3)"""
        result = check_firefighting_installations("A", "A-1", 20)
        assert "violation" in result
        assert result["violation"].rule_id == "NBC-FI-HEIGHT-NOT-PERMITTED"

    def test_g1_height_not_permitted(self):
        """G-1 above 18m should not be permitted (Note 18)"""
        result = check_firefighting_installations("G", "G-1", 20)
        assert "violation" in result

    def test_a5_hotel_low_area(self):
        """A-5 hotel, <15m should match first tier"""
        result = check_firefighting_installations("A", "A-5", 10)
        assert "result" in result
        fi = result["result"]
        assert fi.fire_extinguisher is True
        assert fi.manual_fire_alarm is True

    def test_d6_mixed_assembly(self):
        """D-6 should have all required"""
        result = check_firefighting_installations("D", "D-6", 10)
        assert "result" in result
        fi = result["result"]
        assert fi.fire_extinguisher is True
        assert fi.wet_riser is True
        assert fi.automatic_sprinkler is True
        assert fi.underground_tank_litres == 200000

    def test_j_hazardous(self):
        """J hazardous should require everything"""
        result = check_firefighting_installations("J", None, 10)
        assert "result" in result
        fi = result["result"]
        assert fi.fire_extinguisher is True
        assert fi.wet_riser is True
        assert fi.yard_hydrant is True
        assert fi.automatic_sprinkler is True
        assert fi.underground_tank_litres == 250000

    def test_notes_field_present(self):
        """Tier results should include notes where applicable"""
        result = check_firefighting_installations("E", None, 8)
        assert "result" in result
        fi = result["result"]
        assert fi.notes is not None
        assert "Note" in fi.notes


class TestRunNBCChecks:
    def test_full_office_check(self):
        inp = BuildingInput(
            building_name="Test Office",
            building_type="Office",
            total_floor_area=1000,
            number_of_floors=3,
            floor_areas=[333, 333, 334],
            building_height=10.5,
            occupant_count=100,
            has_kitchen=False,
            has_flammable_liquids=False,
            has_flammable_gases=False,
            has_combustible_metals=False,
            has_electrical_hazards=False,
            occupancy_group="E",
            construction_type="type12",
            has_sprinklers=False,
        )
        result = run_nbc_checks(inp)
        assert result.occupant_load is not None
        assert result.exit_capacity is not None
        assert result.travel_distance is not None
        assert len(result.passed_rules) > 0

    def test_occupant_load_only_shows_max(self):
        """Occupant load should only show max, no violation even if count exceeds"""
        inp = BuildingInput(
            building_name="Test",
            building_type="Office",
            total_floor_area=100,
            number_of_floors=1,
            floor_areas=[100],
            building_height=3.5,
            occupant_count=500,  # Way too many for 100m², but no violation expected
            has_kitchen=False,
            has_flammable_liquids=False,
            has_flammable_gases=False,
            has_combustible_metals=False,
            has_electrical_hazards=False,
            occupancy_group="E",
        )
        result = run_nbc_checks(inp)
        # Should NOT have NBC-OL-EXCEED violation
        ol_violations = [v for v in result.violations if v.rule_id == "NBC-OL-EXCEED"]
        assert len(ol_violations) == 0
        # Should have max occupant info in passed_rules
        assert any("Max occupant load" in r for r in result.passed_rules)

    def test_exit_capacity_uses_max_load(self):
        """Exit capacity should use calculated max occupants, not input count"""
        inp = BuildingInput(
            building_name="Test",
            building_type="Office",
            total_floor_area=1000,
            number_of_floors=1,
            floor_areas=[1000],
            building_height=3.5,
            occupant_count=5,  # Low count, but exit capacity should use max from area
            has_kitchen=False,
            has_flammable_liquids=False,
            has_flammable_gases=False,
            has_combustible_metals=False,
            has_electrical_hazards=False,
            occupancy_group="E",
        )
        result = run_nbc_checks(inp)
        assert result.exit_capacity is not None
        # Max occupants for 1000m² Group E = 1000/10 = 100
        assert result.exit_capacity.occupant_count == 100

    def test_no_group_returns_empty(self):
        inp = BuildingInput(
            building_name="No Group",
            building_type="Office",
            total_floor_area=100,
            number_of_floors=1,
            floor_areas=[100],
            building_height=3.5,
            occupant_count=10,
            has_kitchen=False,
            has_flammable_liquids=False,
            has_flammable_gases=False,
            has_combustible_metals=False,
            has_electrical_hazards=False,
        )
        result = run_nbc_checks(inp)
        assert len(result.violations) == 0
        assert len(result.passed_rules) == 0
