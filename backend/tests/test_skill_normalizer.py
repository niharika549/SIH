import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)
from ai.skill_normalizer import (
    normalize_skill,
    normalize_skill_list,
)

def test_normalize_skill_aliases():
    assert normalize_skill("Python3") == "python"
    assert normalize_skill("React.js") == "react"
    assert normalize_skill("JS") == "javascript"
    assert normalize_skill("Mongo DB") == "mongodb"


def test_normalize_skill_list_removes_duplicates():
    skills = [
        "Python",
        "python3",
        "PYTHON",
        "React.js",
        "react",
    ]

    result = normalize_skill_list(skills)

    assert result == [
        "python",
        "react",
    ]