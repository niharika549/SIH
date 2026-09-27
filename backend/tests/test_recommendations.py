import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

from services.recommendations import recommend_jobs


def test_recommend_jobs():
    jobs = [
        {
            "id": "job1",
            "title": "Python Developer",
            "description": "Python development",
            "location": "Hyderabad",
            "company_name": "Test Company",
            "experience_years": 1,
            "qualification": "B.Tech",
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
        }
    ]

    trainee_skills = [
        {
            "skill_id": "python",
            "level": "ADVANCED",
        },
        {
            "skill_id": "sql",
            "level": "BEGINNER",
        },
    ]

    result = recommend_jobs(
        jobs=jobs,
        trainee_skills=trainee_skills,
    )

    assert len(result) == 1
    assert result[0]["job_id"] == "job1"
    assert result[0]["match_percentage"] == 100.0