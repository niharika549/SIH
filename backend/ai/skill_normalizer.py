import re


# Common variations of the same skill
SKILL_ALIASES = {
    "py": "python",
    "python3": "python",
    "python 3": "python",

    "js": "javascript",
    "javascript es6": "javascript",

    "ts": "typescript",

    "reactjs": "react",
    "react.js": "react",

    "nodejs": "node",
    "node.js": "node",

    "postgres": "postgresql",
    "postgre": "postgresql",

    "mongo": "mongodb",
    "mongo db": "mongodb",

    "ml": "machine learning",
    "machine-learning": "machine learning",

    "ai": "artificial intelligence",

    "dl": "deep learning",
    "deep-learning": "deep learning",

    "sql server": "sql",
}


def normalize_skill(skill: str) -> str:
    """
    Convert a skill name into a consistent format.
    """

    if not skill:
        return ""

    skill = skill.strip().lower()

    # Replace repeated spaces
    skill = re.sub(r"\s+", " ", skill)

    # Check known aliases
    if skill in SKILL_ALIASES:
        return SKILL_ALIASES[skill]

    return skill


def normalize_skill_list(skills: list[str]) -> list[str]:
    """
    Normalize a list of skills and remove duplicates.
    """

    normalized = []

    for skill in skills:
        cleaned = normalize_skill(skill)

        if cleaned and cleaned not in normalized:
            normalized.append(cleaned)

    return normalized