import asyncio
import os
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

NOTIFICATIONS = [
    {
        "id": "gov-notification-1",
        "title": "High Python Skill Demand",
        "message": "Python-related trainee demand has increased in the monitored workforce data.",
        "type": "SKILL_DEMAND",
        "priority": "HIGH",
        "is_demo": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "gov-notification-2",
        "title": "District Training Update",
        "message": "New training activity is available for monitored districts.",
        "type": "TRAINING",
        "priority": "MEDIUM",
        "is_demo": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "gov-notification-3",
        "title": "New Skill Analytics Data",
        "message": "Skill demand and trainee skill records have been updated.",
        "type": "ANALYTICS",
        "priority": "MEDIUM",
        "is_demo": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "gov-notification-4",
        "title": "Employer Participation Update",
        "message": "Employer participation data has been updated in the government analytics dashboard.",
        "type": "EMPLOYER",
        "priority": "LOW",
        "is_demo": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]


async def main():
    for notification in NOTIFICATIONS:
        await db.notifications.update_one(
            {"id": notification["id"]},
            {"$set": notification},
            upsert=True,
        )

    print(f"Seeded {len(NOTIFICATIONS)} government notifications.")


if __name__ == "__main__":
    asyncio.run(main())