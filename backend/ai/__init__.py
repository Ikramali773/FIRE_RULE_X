# backend/ai/__init__.py
# AI Provider Factory
#
# Returns the current AI provider. To swap providers:
# 1. Create a new provider in this package
# 2. Change get_ai_provider() to return the new implementation

from ai.gemini_provider import GeminiProvider


def get_ai_provider():
    """Active: Gemini 2.5 Flash — swap this to change the global AI provider."""
    return GeminiProvider()
