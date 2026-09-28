import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

DISTRICTS = [
    ("GUNTUR", 5, 2, 1),
    ("VIJAYAWADA", 8, 3, 2),
    ("VISAKHAPATNAM", 6, 2, 1),
]

async def main():
    total_users = 0

    for district, trainees, trainers, employers in DISTRICTS:

        for i in range(1, trainees + 1):
            user = {
                "id": f"demo-trainee-{district.lower()}-{i}",
                "full_name": f"Demo Trainee {district} {i}",
                "email": f"demo.trainee.{district.lower()}.{i}@demo.skillalign",
                "role": "TRAINEE",
                "account_status": "ACTIVE",
                "profile_complete": True,
                "state_code": "AP",
                "district_code": district,
                "is_demo": True,
            }

            await db.users.update_one(
                {"id": user["id"]},
                {"$set": user},
                upsert=True,
            )
            total_users += 1

        for i in range(1, trainers + 1):
            user = {
                "id": f"demo-trainer-{district.lower()}-{i}",
                "full_name": f"Demo Trainer {district} {i}",
                "email": f"demo.trainer.{district.lower()}.{i}@demo.skillalign",
                "role": "TRAINER",
                "account_status": "ACTIVE",
                "profile_complete": True,
                "state_code": "AP",
                "district_code": district,
                "is_demo": True,
            }

            await db.users.update_one(
                {"id": user["id"]},
                {"$set": user},
                upsert=True,
            )
            total_users += 1

        for i in range(1, employers + 1):
            user = {
                "id": f"demo-employer-{district.lower()}-{i}",
                "full_name": f"Demo Employer {district} {i}",
                "email": f"demo.employer.{district.lower()}.{i}@demo.skillalign",
                "role": "EMPLOYER",
                "account_status": "ACTIVE",
                "profile_complete": True,
                "state_code": "AP",
                "district_code": district,
                "is_demo": True,
            }

            await db.users.update_one(
                {"id": user["id"]},
                {"$set": user},
                upsert=True,
            )
            total_users += 1

    trainings = [
        ("demo-training-guntur-1", "demo-trainer-guntur-1"),
        ("demo-training-guntur-2", "demo-trainer-guntur-2"),
        ("demo-training-vijayawada-1", "demo-trainer-vijayawada-1"),
        ("demo-training-vijayawada-2", "demo-trainer-vijayawada-2"),
        ("demo-training-visakhapatnam-1", "demo-trainer-visakhapatnam-1"),
    ]

    for training_id, provider_id in trainings:
        await db.trainings.update_one(
            {"id": training_id},
            {
                "$set": {
                    "id": training_id,
                    "title": "SkillAlign Demo Training",
                    "description": "Demo training for Government Analytics",
                    "provider_user_id": provider_id,
                    "is_demo": True,
                    "is_sample": True,
                }
            },
            upsert=True,
        )

    print("Demo users seeded:", total_users)
    print("Demo trainings seeded:", len(trainings))

if __name__ == "__main__":
    asyncio.run(main())