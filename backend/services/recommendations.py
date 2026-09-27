from typing import Any


def recommend_jobs(
    jobs: list[dict[str, Any]],
    trainee_skills: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Recommend jobs for a trainee based on skill matching.

    Each job should contain:
        {
            "id": "...",
            "title": "...",
            "skills": [
                {
                    "skill_id": "...",
                    "required_level": "BEGINNER"
                }
            ]
        }

    Each trainee skill should contain:
        {
            "skill_id": "...",
            "level": "BEGINNER"
        }
    """

    proficiency_rank = {
        "NONE": 0,
        "BEGINNER": 1,
        "INTERMEDIATE": 2,
        "ADVANCED": 3,
        "EXPERT": 4,
    }

    trainee_by_id = {
        skill.get("skill_id"): skill.get("level", "NONE")
        for skill in trainee_skills
    }

    recommendations = []

    for job in jobs:
        required_skills = job.get("skills", [])

        if not required_skills:
            continue

        matched_count = 0
        breakdown = []

        for required in required_skills:
            skill_id = required.get("skill_id")
            required_level = required.get(
                "required_level",
                "BEGINNER",
            )

            candidate_level = trainee_by_id.get(
                skill_id,
                "NONE",
            )

            required_rank = proficiency_rank.get(
                required_level,
                0,
            )

            candidate_rank = proficiency_rank.get(
                candidate_level,
                0,
            )

            matched = candidate_rank >= required_rank

            if matched:
                matched_count += 1

            breakdown.append(
                {
                    "skill_id": skill_id,
                    "required_level": required_level,
                    "candidate_level": candidate_level,
                    "matched": matched,
                }
            )

        match_percentage = round(
            (matched_count / len(required_skills)) * 100,
            2,
        )

        recommendations.append(
            {
                "job_id": job.get("id"),
                "title": job.get("title"),
                "description": job.get("description"),
                "location": job.get("location"),
                "company_name": job.get("company_name"),
                "experience_years": job.get("experience_years"),
                "qualification": job.get("qualification"),
                "salary_min": job.get("salary_min"),
                "salary_max": job.get("salary_max"),
                "match_percentage": match_percentage,
                "breakdown": breakdown,
            }
        )

    recommendations.sort(
        key=lambda item: item["match_percentage"],
        reverse=True,
    )

    return recommendations