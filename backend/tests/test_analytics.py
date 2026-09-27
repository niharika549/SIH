import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

from services.analytics import calculate_skill_demand


def test_calculate_skill_demand():
    jobs = [
        {
            "skills": [
                {"skill_id": "python"},
                {"skill_id": "sql"},
            ]
        },
        {
            "skills": [
                {"skill_id": "python"},
                {"skill_id": "react"},
            ]
        },
        {
            "skills": [
                {"skill_id": "python"},
            ]
        },
    ]

    result = calculate_skill_demand(jobs)

    assert result == [
        {"skill_id": "python", "demand_count": 3},
        {"skill_id": "sql", "demand_count": 1},
        {"skill_id": "react", "demand_count": 1},
    ]