import asyncio
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from backend.ai.skill_normalizer import normalize_skill


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

OUTPUT_FILE = (
    PROJECT_DIR
    / "data"
    / "processed"
    / "jobs_processed.json"
)


def clean_text(value: Any) -> str:
    """Clean extra spaces from text."""

    if value is None:
        return ""

    text = str(value)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def normalize_skills(
    skills: Any,
) -> list[dict[str, Any]]:
    """Normalize and clean job skills."""

    if not isinstance(skills, list):
        return []

    normalized = []

    for skill in skills:
        if not isinstance(skill, dict):
            continue

        skill_id = normalize_skill(
            skill.get("skill_id", "")
        )

        if not skill_id:
            continue

        required_level = clean_text(
            skill.get(
                "required_level",
                "BEGINNER",
            )
        ).upper()

        normalized.append({
            "skill_id": skill_id,
            "required_level": required_level,
        })

    unique_skills = []
    seen = set()

    for skill in normalized:
        key = (
            skill["skill_id"],
            skill["required_level"],
        )

        if key in seen:
            continue

        seen.add(key)
        unique_skills.append(skill)

    return unique_skills


def clean_job(
    job: dict[str, Any],
    industry: str = "",
) -> dict[str, Any]:
    """Create a cleaned version of a job document."""

    return {
        "id": clean_text(
            job.get("id")
        ),
        "title": clean_text(
            job.get("title")
        ),
        "description": clean_text(
            job.get("description")
        ),
        "skills": normalize_skills(
            job.get("skills", [])
        ),
        "location": clean_text(
            job.get("location")
        ),
        "industry": clean_text(
            industry
        ),
        "salary_min": job.get(
            "salary_min"
        ),
        "salary_max": job.get(
            "salary_max"
        ),
        "experience_years": job.get(
            "experience_years",
            0,
        ),
        "qualification": clean_text(
            job.get("qualification")
        ),
        "openings": job.get(
            "openings",
            1,
        ),
        "company_name": clean_text(
            job.get("company_name")
        ),
        "status": clean_text(
            job.get(
                "status",
                "OPEN",
            )
        ).upper(),
        "created_at": job.get(
            "created_at"
        ),
        "updated_at": job.get(
            "updated_at"
        ),
    }


async def process_jobs() -> None:
    client = AsyncIOMotorClient(
        MONGO_URL
    )

    try:
        db = client[DB_NAME]

        jobs = await db.jobs.find(
            {},
            {"_id": 0},
        ).to_list(5000)

        employer_profiles = (
            await db.employer_profiles.find(
                {},
                {
                    "_id": 0,
                    "user_id": 1,
                    "industry": 1,
                },
            ).to_list(5000)
        )

        industry_by_user = {
            profile.get("user_id"): clean_text(
                profile.get("industry")
            )
            for profile in employer_profiles
            if profile.get("user_id")
        }

        processed_jobs = []
        seen_job_ids = set()

        for job in jobs:
            job_id = clean_text(
                job.get("id")
            )

            if not job_id:
                continue

            if job_id in seen_job_ids:
                continue

            seen_job_ids.add(job_id)

            employer_user_id = job.get(
                "employer_user_id"
            )

            industry = industry_by_user.get(
                employer_user_id,
                "",
            )

            cleaned = clean_job(
                job,
                industry=industry,
            )

            processed_jobs.append(
                cleaned
            )

        output = {
            "processed_at": datetime.now(
                timezone.utc
            ).isoformat(),
            "total_jobs": len(
                processed_jobs
            ),
            "jobs": processed_jobs,
        }

        OUTPUT_FILE.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        with open(
            OUTPUT_FILE,
            "w",
            encoding="utf-8",
        ) as file:
            json.dump(
                output,
                file,
                indent=2,
                ensure_ascii=False,
                default=str,
            )

        print(
            f"Processed {len(processed_jobs)} jobs."
        )

        print(
            f"Saved to: {OUTPUT_FILE}"
        )

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(
        process_jobs()
    )