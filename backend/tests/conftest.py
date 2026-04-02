# backend/tests/conftest.py
# Pytest configuration — adds backend/ to sys.path so imports work

import sys
from pathlib import Path

# Add backend dir to path so we can import modules
sys.path.insert(0, str(Path(__file__).parent.parent))
