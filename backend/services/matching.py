from typing import Any


PROFICIENCY_RANK = {
    "NONE": 0,
    "BEGINNER": 1,
    "INTERMEDIATE": 2,
    "ADVANCED": 3,
    "EXPERT": 4,
}


def calculate_candidate_match(
    job: dict[str, Any],
    candidate_skills: list[dict[str, Any]],
    candidate_profile: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Calculate how well a trainee matches a job.

    Checks:
    - Required skills
    - Required skill proficiency
    - Experience
    - Qualification
    """

    candidate_profile = candidate_profile or {}

    candidate_by_skill = {
        skill.get("skill_id"): skill.get("level", "NONE")
        for skill in candidate_skills
    }

    required_skills = job.get("skills", [])

    matched_skills = []
    missing_skills = []

    for required in required_skills:
        skill_id = required.get("skill_id")
        required_level = required.get("required_level", "BEGINNER")

        candidate_level = candidate_by_skill.get(
            skill_id,
            "NONE",
        )

        required_rank = PROFICIENCY_RANK.get(
            required_level,
            0,
        )

        candidate_rank = PROFICIENCY_RANK.get(
            candidate_level,
            0,
        )

        skill_match = candidate_rank >= required_rank

        skill_result = {
            "skill_id": skill_id,
            "required_level": required_level,
            "candidate_level": candidate_level,
            "matched": skill_match,
        }

        if skill_match:
            matched_skills.append(skill_result)
        else:
            missing_skills.append(skill_result)

    total_skills = len(required_skills)

    skill_percentage = (
        (len(matched_skills) / total_skills) * 100
        if total_skills
        else 100
    )

    # Experience check
    required_experience = job.get(
        "experience_years",
        0,
    ) or 0

    candidate_experience = candidate_profile.get(
        "experience_years",
        0,
    ) or 0

    experience_match = candidate_experience >= required_experience

    # Qualification check
    required_qualification = job.get(
        "qualification"
    )

    candidate_qualification = candidate_profile.get(
        "qualification"
    )

    qualification_match = True

    if required_qualification:
        qualification_match = (
        bool(candidate_qualification)
        and candidate_qualification.lower()
        == required_qualification.lower()
    )

    # Final score
    score = skill_percentage

    if required_experience > 0 and not experience_match:
        score *= 0.8

    if required_qualification and not qualification_match:
        score *= 0.8

    score = round(score, 2)

    explanation = []

    if matched_skills:
        explanation.append(
            f"Matches {len(matched_skills)} of "
            f"{total_skills} required skills."
        )

    if missing_skills:
        explanation.append(
            f"Missing {len(missing_skills)} required skill(s)."
        )

    if required_experience:
        if experience_match:
            explanation.append(
                "Meets the required experience."
            )
        else:
            explanation.append(
                "Does not meet the required experience."
            )

    if required_qualification:
        if qualification_match:
            explanation.append(
                "Meets the required qualification."
            )
        else:
            explanation.append(
                "Does not meet the required qualification."
            )

    return {
        "job_id": job.get("id"),
        "match_percentage": score,
        "skill_match_percentage": round(
            skill_percentage,
            2,
        ),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "experience_match": experience_match,
        "qualification_match": qualification_match,
        "explanation": " ".join(explanation),
    }