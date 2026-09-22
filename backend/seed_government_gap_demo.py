import asyncio
import os
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

CAREERS = [
    "career-data-analyst",
    "career-fullstack",
    "career-cloud",
    "career-frontend",
]


async def main():
    trainees = await db.users.find(
        {
            "role": "TRAINEE",
            "is_demo": True,
        },
        {
            "_id": 0,
            "id": 1,
            "state_code": 1,
            "district_code": 1,
        },
    ).to_list(1000)

    if not trainees:
        print("No demo trainees found.")
        print("Run seed_government_demo.py first.")
        return

    count = 0

    for index, trainee in enumerate(trainees):
        career_id = CAREERS[index % len(CAREERS)]

        profile = {
            "user_id": trainee["id"],
            "category": "STUDENT",
            "category_details": {},
            "career_goal_id": career_id,
            "state_code": trainee.get("state_code"),
            "district_code": trainee.get("district_code"),
            "is_demo": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        await db.trainee_profiles.update_one(
            {"user_id": trainee["id"]},
            {"$set": profile},
            upsert=True,
        )

        count += 1

    print("===================================")
    print("Government skill-gap demo seeded")
    print("Trainee profiles:", count)
    print("===================================")


if __name__ == "__main__":
    asyncio.run(main())