# backend/ai/openai_provider.py
# GPT-4o Vision Provider for Floor Plan Analysis
#
# Uses OpenAI's structured output (response_format: json_schema)
# to enforce BuildingInput shape from image analysis.

from __future__ import annotations

import json
import os

from openai import OpenAI

from models import BuildingInput

EXTRACTION_PROMPT = """You are a fire safety engineering assistant analyzing a building floor plan image.

Extract the following building metadata for IS 2190:2024 fire extinguisher compliance checking.

RULES:
1. Extract ONLY what you can see or reasonably infer from the floor plan.
2. Determine buildingType naturally based on the plan (e.g., 'Hospital', 'Office', 'Residential', 'School', 'Mall', 'Factory', 'Warehouse').
3. Estimate occupantCount: 1 person per 10m² for offices, 1 per 3m² for assembly areas.
4. Estimate buildingHeight: floor count × 3.5m if not visible in the plan.
5. Set boolean flags based on visible room labels (kitchen, server room, storage, electrical panel, etc.).
6. Use 0 for any numeric value you cannot determine with any confidence.
7. floorAreas array must have exactly numberOfFloors entries.
8. If this appears to be a multi-floor plan, try to identify each floor's area separately."""

BUILDING_INPUT_SCHEMA = {
    "name": "building_input",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "buildingName": {"type": "string", "description": "Name or identifier of the building"},
            "buildingType": {"type": "string", "description": "General functional type of the building"},
            "totalFloorArea": {"type": "number", "description": "Total floor area in m²"},
            "numberOfFloors": {"type": "number", "description": "Total number of floors including ground"},
            "floorAreas": {"type": "array", "items": {"type": "number"}, "description": "Area per floor in m²"},
            "buildingHeight": {"type": "number", "description": "Building height in metres"},
            "occupantCount": {"type": "number", "description": "Estimated max occupant count"},
            "hasKitchen": {"type": "boolean"},
            "cookingAreaM2": {"type": "number", "description": "Cooking appliance area in m²"},
            "hasFlammableLiquids": {"type": "boolean"},
            "flammableLiquidsLitres": {"type": "number"},
            "hasFlammableGases": {"type": "boolean"},
            "flammableGasesLitres": {"type": "number"},
            "hasCombustibleMetals": {"type": "boolean"},
            "hasElectricalHazards": {"type": "boolean"},
        },
        "required": [
            "buildingName", "buildingType", "totalFloorArea", "numberOfFloors",
            "floorAreas", "buildingHeight", "occupantCount", "hasKitchen",
            "cookingAreaM2", "hasFlammableLiquids", "flammableLiquidsLitres",
            "hasFlammableGases", "flammableGasesLitres", "hasCombustibleMetals",
            "hasElectricalHazards",
        ],
        "additionalProperties": False,
    },
}


class OpenAIProvider:
    name = "gpt-4o"

    def __init__(self) -> None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY environment variable is required")
        self.client = OpenAI(api_key=api_key)

    async def analyze_floor_plan(
        self, documents: list[dict]
    ) -> dict:
        """
        documents: list of {"data": base64_str, "mime_type": str}
        Returns {"success": bool, "data": BuildingInput|None, ...}
        """
        # OpenAI Vision requires images, not PDFs
        image_docs = [d for d in documents if d["mime_type"].startswith("image/")]

        if not image_docs:
            return {
                "success": False,
                "data": None,
                "raw_response": "",
                "provider": self.name,
                "error": "OpenAI requires images for floor plan analysis. PDFs are natively unsupported by GPT-4o Vision API without conversion.",
            }

        try:
            image_parts = [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{img['mime_type']};base64,{img['data']}",
                        "detail": "high",
                    },
                }
                for img in image_docs
            ]

            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": EXTRACTION_PROMPT},
                            *image_parts,
                        ],
                    },
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": BUILDING_INPUT_SCHEMA,
                },
                max_tokens=2000,
            )

            text = response.choices[0].message.content or ""
            if not text:
                return {
                    "success": False,
                    "data": None,
                    "raw_response": "",
                    "provider": self.name,
                    "error": "GPT-4o returned empty response.",
                }

            parsed_dict = json.loads(text)
            parsed = BuildingInput(**parsed_dict)

            # Fix floor areas if missing
            if not parsed.floor_areas or len(parsed.floor_areas) == 0:
                parsed.floor_areas = [parsed.total_floor_area or 0]
                parsed.number_of_floors = 1

            return {
                "success": True,
                "data": parsed,
                "raw_response": text,
                "provider": self.name,
            }

        except Exception as err:
            return {
                "success": False,
                "data": None,
                "raw_response": "",
                "provider": self.name,
                "error": str(err),
            }
