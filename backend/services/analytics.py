from typing import Any

def calculate_skill_demand(
    jobs: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Count how many jobs require each skill.
    """

    demand: dict[str, int] = {}

    for job in jobs:
        for skill in job.get("skills", []):
            skill_id = skill.get("skill_id")

            if not skill_id:
                continue

            demand[skill_id] = demand.get(skill_id, 0) + 1

    results = []

    for skill_id, count in demand.items():
        results.append({
            "skill_id": skill_id,
            "demand_count": count,
        })

    results.sort(
        key=lambda item: item["demand_count"],
        reverse=True,
    )

    return results

def calculate_skill_gap(
    required_skills: list[dict[str, Any]],
    trainee_skills: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Compare the skills required by a job/career with the trainee's
    current skills.

    required_skills example:
    [
        {"skill_id": "skill-python", "required_level": "INTERMEDIATE"},
        {"skill_id": "skill-sql", "required_level": "BEGINNER"}
    ]

    trainee_skills example:
    [
        {"skill_id": "skill-python", "level": "BEGINNER"},
        {"skill_id": "skill-sql", "level": "INTERMEDIATE"}
    ]
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

    matched = []
    gaps = []

    for required in required_skills:
        skill_id = required.get("skill_id")
        required_level = required.get("required_level", "BEGINNER")

        current_level = trainee_by_id.get(skill_id, "NONE")

        required_rank = proficiency_rank.get(required_level, 0)
        current_rank = proficiency_rank.get(current_level, 0)

        item = {
            "skill_id": skill_id,
            "required_level": required_level,
            "candidate_level": current_level,
        }

        if current_rank >= required_rank:
            matched.append(item)
        else:
            gaps.append(item)

    total = len(required_skills)
    matched_count = len(matched)

    match_percentage = (
        round((matched_count / total) * 100, 2)
        if total > 0
        else 0.0
    )

    return {
        "match_percentage": match_percentage,
        "matched": matched,
        "gaps": gaps,
        "total_required": total,
        "total_matched": matched_count,
    }


def rank_recommendations(
    items: list[dict[str, Any]],
    score_key: str = "match_percentage",
) -> list[dict[str, Any]]:
    """
    Sort recommendation results by their matching score.
    """

    return sorted(
        items,
        key=lambda item: item.get(score_key, 0),
        reverse=True,
    )