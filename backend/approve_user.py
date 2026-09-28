
import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")


async def approve_user():
    email = input("Enter the email to approve: ").strip().lower()

    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    result = await db.users.update_one(
        {"email": email},
        {"$set": {"account_status": "ACTIVE"}}
    )

    if result.modified_count == 1:
        print("Account approved successfully!")
    else:
        print("Account not found or already active.")

    client.close()


asyncio.run(approve_user())