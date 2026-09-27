from backend.services.analytics import (
    calculate_district_skill_demand,
    calculate_skill_demand,
)


def test_calculate_skill_demand():
    jobs = [
        {
            "skills": [
                {"skill_id": "python"},
                {"skill_id": "sql"},
            ]
        },
        {
            "skills": [
                {"skill_id": "python"},
                {"skill_id": "react"},
            ]
        },
        {
            "skills": [
                {"skill_id": "python"},
            ]
        },
    ]

    result = calculate_skill_demand(jobs)

    assert result == [
        {
            "skill_id": "python",
            "demand_count": 3,
            "demand_level": "HIGH",
        },
        {
            "skill_id": "sql",
            "demand_count": 1,
            "demand_level": "LOW",
        },
        {
            "skill_id": "react",
            "demand_count": 1,
            "demand_level": "LOW",
        },
    ]


def test_calculate_district_skill_demand():
    jobs = [
        {
            "location": "Hyderabad",
            "skills": [
                {"skill_id": "python"},
                {"skill_id": "sql"},
            ],
        },
        {
            "location": "Hyderabad",
            "skills": [
                {"skill_id": "python"},
            ],
        },
        {
            "location": "Bengaluru",
            "skills": [
                {"skill_id": "java"},
            ],
        },
    ]

    result = calculate_district_skill_demand(jobs)

    assert result == [
        {
            "district": "Hyderabad",
            "demand_count": 2,
            "skills": [
                {
                    "skill_id": "python",
                    "demand_count": 2,
                    "demand_level": "HIGH",
                },
                {
                    "skill_id": "sql",
                    "demand_count": 1,
                    "demand_level": "LOW",
                },
            ],
        },
        {
            "district": "Bengaluru",
            "demand_count": 1,
            "skills": [
                {
                    "skill_id": "java",
                    "demand_count": 1,
                    "demand_level": "HIGH",
                },
            ],
        },
    ]