from datetime import datetime, timezone
from pathlib import Path
import os
import uuid

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


async def main():
    # ---------------------------------------------------------
    # Clean only our demo records
    # ---------------------------------------------------------
    await db.job_posts.delete_many({
        "id": {
            "$regex": "^demo-job-"
        }
    })

    await db.job_applications.delete_many({
        "id": {
            "$regex": "^demo-app-"
        }
    })

    # ---------------------------------------------------------
    # Get existing employers
    # ---------------------------------------------------------
    employers = await db.users.find(
        {
            "role": "EMPLOYER"
        },
        {
            "_id": 0,
            "id": 1,
            "full_name": 1,
        },
    ).to_list(100)

    # ---------------------------------------------------------
    # Get existing careers
    # ---------------------------------------------------------
    careers = await db.careers.find(
        {},
        {
            "_id": 0,
            "id": 1,
            "name": 1,
        },
    ).sort(
        "name",
        1,
    ).to_list(100)

    # ---------------------------------------------------------
    # Get existing trainees
    # ---------------------------------------------------------
    trainees = await db.users.find(
        {
            "role": "TRAINEE"
        },
        {
            "_id": 0,
            "id": 1,
            "full_name": 1,
        },
    ).to_list(200)

    if not employers:
        print("ERROR: No employer accounts found.")
        return

    if not careers:
        print("ERROR: No careers found.")
        return

    if not trainees:
        print("ERROR: No trainee accounts found.")
        return

    now = datetime.now(
        timezone.utc
    ).isoformat()

    # ---------------------------------------------------------
    # Demo job data
    # ---------------------------------------------------------
    locations = [
        ("AP", "GUNTUR"),
        ("AP", "VIJAYAWADA"),
        ("AP", "VISAKHAPATNAM"),
        ("AP", "GUNTUR"),
        ("AP", "VIJAYAWADA"),
        ("AP", "VISAKHAPATNAM"),
        ("AP", "GUNTUR"),
        ("AP", "VIJAYAWADA"),
    ]

    job_titles = [
        "Junior Data Analyst",
        "Python Developer",
        "Machine Learning Associate",
        "Data Science Intern",
        "Backend Developer",
        "AI/ML Engineer",
        "Business Data Analyst",
        "Software Engineer",
    ]

    openings_list = [
        8,
        6,
        5,
        10,
        7,
        4,
        9,
        6,
    ]

    jobs = []

    for index in range(8):

        career = careers[
            index % len(careers)
        ]

        employer = employers[
            index % len(employers)
        ]

        state_code, district_code = locations[
            index
        ]

        jobs.append({
            "id": f"demo-job-{uuid.uuid4()}",
            "employer_user_id": employer["id"],
            "title": job_titles[index],
            "description": (
                f"Demo workforce opportunity for "
                f"{career['name']} candidates."
            ),
            "career_id": career["id"],
            "state_code": state_code,
            "district_code": district_code,
            "openings": openings_list[index],
            "status": "OPEN",
            "created_at": now,
            "is_demo": True,
        })

    if jobs:
        await db.job_posts.insert_many(
            jobs
        )

    # ---------------------------------------------------------
    # Demo applications
    # ---------------------------------------------------------
    applications = []

    application_statuses = [
        "HIRED",
        "HIRED",
        "APPLIED",
        "SHORTLISTED",
        "REJECTED",
    ]

    trainee_index = 0

    for job_index, job in enumerate(jobs):

        # Number of applications differs by job
        application_count = 4 + (
            job_index % 3
        )

        for applicant_index in range(
            application_count
        ):

            trainee = trainees[
                trainee_index % len(trainees)
            ]

            trainee_index += 1

            status = application_statuses[
                (
                    applicant_index
                    + job_index
                )
                % len(application_statuses)
            ]

            hired_at = (
                now
                if status == "HIRED"
                else None
            )

            applications.append({
                "id": f"demo-app-{uuid.uuid4()}",
                "job_id": job["id"],
                "trainee_user_id": trainee["id"],
                "status": status,
                "applied_at": now,
                "hired_at": hired_at,
                "is_demo": True,
            })

    if applications:
        await db.job_applications.insert_many(
            applications
        )

    hired_count = sum(
        1
        for item in applications
        if item["status"] == "HIRED"
    )

    total_openings = sum(
        job["openings"]
        for job in jobs
    )

    print("===================================")
    print("Government job demo seeded")
    print(f"Employers available: {len(employers)}")
    print(f"Careers available: {len(careers)}")
    print(f"Trainees available: {len(trainees)}")
    print(f"Demo jobs: {len(jobs)}")
    print(f"Demo openings: {total_openings}")
    print(f"Demo applications: {len(applications)}")
    print(f"Demo placements: {hired_count}")
    print("===================================")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())