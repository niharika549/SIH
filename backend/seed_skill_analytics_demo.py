import asyncio
import os
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


SKILL_IDS = [
    "skill-python",
    "skill-sql",
    "skill-ml",
    "skill-javascript",
    "skill-react",
    "skill-node",
    "skill-cloud",
    "skill-git",
    "skill-html-css",
    "skill-dsa",
]


TRAINING_SKILLS = {
    "demo-training-guntur-1": [
        {"skill_id": "skill-python", "target_level": "INTERMEDIATE"},
        {"skill_id": "skill-sql", "target_level": "INTERMEDIATE"},
    ],
    "demo-training-guntur-2": [
        {"skill_id": "skill-ml", "target_level": "BEGINNER"},
        {"skill_id": "skill-python", "target_level": "INTERMEDIATE"},
    ],
    "demo-training-vijayawada-1": [
        {"skill_id": "skill-javascript", "target_level": "INTERMEDIATE"},
        {"skill_id": "skill-react", "target_level": "ADVANCED"},
    ],
    "demo-training-vijayawada-2": [
        {"skill_id": "skill-cloud", "target_level": "INTERMEDIATE"},
        {"skill_id": "skill-git", "target_level": "BEGINNER"},
    ],
    "demo-training-visakhapatnam-1": [
        {"skill_id": "skill-html-css", "target_level": "INTERMEDIATE"},
        {"skill_id": "skill-node", "target_level": "INTERMEDIATE"},
    ],
}


async def main():

    # Check that catalog skills already exist
    existing_skills = await db.skills.find(
        {"id": {"$in": SKILL_IDS}},
        {"_id": 0, "id": 1}
    ).to_list(100)

    existing_ids = {item["id"] for item in existing_skills}

    missing = [skill for skill in SKILL_IDS if skill not in existing_ids]

    if missing:
        print("Missing skills:", missing)
        print("Run seed_phase2.py first.")
        return

    # Get demo trainees
    trainees = await db.users.find(
        {
            "role": "TRAINEE",
            "is_demo": True
        },
        {
            "_id": 0,
            "id": 1
        }
    ).to_list(100)

    if not trainees:
        print("No demo trainees found.")
        print("Run seed_government_demo.py first.")
        return

    # Clear only our demo trainee skill records
    demo_trainee_ids = [user["id"] for user in trainees]

    await db.trainee_skills.delete_many(
        {
            "user_id": {"$in": demo_trainee_ids},
            "is_demo": True
        }
    )

    # Assign two skills to every demo trainee
    skill_records = []

    for index, trainee in enumerate(trainees):
        first_skill = SKILL_IDS[index % len(SKILL_IDS)]
        second_skill = SKILL_IDS[(index + 1) % len(SKILL_IDS)]

        skill_records.append({
            "user_id": trainee["id"],
            "skill_id": first_skill,
            "level": "INTERMEDIATE",
            "source": "SELF_DECLARED",
            "is_demo": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

        if second_skill != first_skill:
            skill_records.append({
                "user_id": trainee["id"],
                "skill_id": second_skill,
                "level": "BEGINNER",
                "source": "SELF_DECLARED",
                "is_demo": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })

    if skill_records:
        await db.trainee_skills.insert_many(skill_records)

    # Add skills to demo trainings
    for training_id, skills in TRAINING_SKILLS.items():
        await db.trainings.update_one(
            {"id": training_id},
            {
                "$set": {
                    "skills": skills,
                    "is_demo": True,
                    "is_sample": True,
                }
            },
            upsert=True,
        )

    # Demo enrollments
    await db.enrollments.delete_many(
        {"is_demo": True}
    )

    enrollment_docs = []

    for index, trainee in enumerate(trainees):
        training_id = list(TRAINING_SKILLS.keys())[
            index % len(TRAINING_SKILLS)
        ]

        enrollment_docs.append({
            "id": f"demo-enrollment-{index + 1}",
            "user_id": trainee["id"],
            "training_id": training_id,
            "status": "ACTIVE",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    if enrollment_docs:
        await db.enrollments.insert_many(enrollment_docs)

    print("======================================")
    print("Skill Analytics demo data seeded")
    print("======================================")
    print("Demo trainees:", len(trainees))
    print("Trainee skill records:", len(skill_records))
    print("Demo trainings updated:", len(TRAINING_SKILLS))
    print("Demo enrollments:", len(enrollment_docs))
    print("======================================")


if __name__ == "__main__":
    asyncio.run(main())