import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

from services.matching import calculate_candidate_match


def test_candidate_match():
    job = {
        "id": "job1",
        "skills": [
            {
                "skill_id": "python",
                "required_level": "INTERMEDIATE",
            },
            {
                "skill_id": "sql",
                "required_level": "BEGINNER",
            },
        ],
        "experience_years": 1,
        "qualification": "B.Tech",
    }

    candidate_skills = [
        {
            "skill_id": "python",
            "level": "ADVANCED",
        },
        {
            "skill_id": "sql",
            "level": "BEGINNER",
        },
    ]

    candidate_profile = {
        "experience_years": 2,
        "qualification": "B.Tech",
    }

    result = calculate_candidate_match(
        job,
        candidate_skills,
        candidate_profile,
    )

    assert result["match_percentage"] == 100.0
    assert len(result["matched_skills"]) == 2
    assert len(result["missing_skills"]) == 0
    assert result["experience_match"] is True
    assert result["qualification_match"] is True