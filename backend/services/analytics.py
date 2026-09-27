from typing import Any


def _get_demand_level(
    count: int,
    max_count: int,
) -> str:
    """
    Classify demand as HIGH, MEDIUM, or LOW.
    """

    if max_count <= 0:
        return "LOW"

    if count == max_count:
        return "HIGH"

    if count > (max_count * 0.50):
        return "MEDIUM"

    return "LOW"


def calculate_skill_demand(
    jobs: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Count how many jobs require each skill and classify
    the demand as HIGH, MEDIUM, or LOW.
    """

    demand: dict[str, int] = {}

    for job in jobs:
        for skill in job.get("skills", []):
            skill_id = skill.get("skill_id")

            if not skill_id:
                continue

            demand[skill_id] = demand.get(skill_id, 0) + 1

    max_count = max(demand.values(), default=0)

    results = []

    for skill_id, count in demand.items():
        results.append({
            "skill_id": skill_id,
            "demand_count": count,
            "demand_level": _get_demand_level(
                count,
                max_count,
            ),
        })

    results.sort(
        key=lambda item: item["demand_count"],
        reverse=True,
    )

    return results


def calculate_district_skill_demand(
    jobs: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Calculate job demand and required skill demand
    for each district/location.
    """

    district_data: dict[str, dict[str, Any]] = {}

    for job in jobs:
        location = job.get("location")

        if not location:
            continue

        district = str(location).strip()

        if not district:
            continue

        if district not in district_data:
            district_data[district] = {
                "demand_count": 0,
                "skills": {},
            }

        district_data[district]["demand_count"] += 1

        for skill in job.get("skills", []):
            skill_id = skill.get("skill_id")

            if not skill_id:
                continue

            skills = district_data[district]["skills"]

            skills[skill_id] = skills.get(skill_id, 0) + 1

    results = []

    for district, data in district_data.items():
        skills = data["skills"]

        max_skill_count = max(
            skills.values(),
            default=0,
        )

        skill_results = []

        for skill_id, count in skills.items():
            skill_results.append({
                "skill_id": skill_id,
                "demand_count": count,
                "demand_level": _get_demand_level(
                    count,
                    max_skill_count,
                ),
            })

        skill_results.sort(
            key=lambda item: item["demand_count"],
            reverse=True,
        )

        results.append({
            "district": district,
            "demand_count": data["demand_count"],
            "skills": skill_results,
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
        required_level = required.get(
            "required_level",
            "BEGINNER",
        )

        current_level = trainee_by_id.get(
            skill_id,
            "NONE",
        )

        required_rank = proficiency_rank.get(
            required_level,
            0,
        )

        current_rank = proficiency_rank.get(
            current_level,
            0,
        )

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