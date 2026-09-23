from fastapi.middleware.cors import CORSMiddleware
from enum import Enum
from datetime import datetime, timedelta, timezone
from typing import Any, List

import bcrypt
import jwt
from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import os
import logging
logger = logging.getLogger(__name__)
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
import uuid


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

jwt_secret = os.environ['JWT_SECRET']
jwt_expire_minutes = int(os.environ.get('JWT_EXPIRE_MINUTES', '1440'))
jwt_algorithm = 'HS256'
bearer_scheme = HTTPBearer(auto_error=False)

# Create the main app
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8082",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


class Role(str, Enum):
    TRAINEE = 'TRAINEE'
    EMPLOYER = 'EMPLOYER'
    TRAINER = 'TRAINER'
    GOVERNMENT = 'GOVERNMENT'
    ADMIN = 'ADMIN'


class AccountStatus(str, Enum):
    ACTIVE = 'ACTIVE'
    PENDING = 'PENDING'
    REJECTED = 'REJECTED'
    SUSPENDED = 'SUSPENDED'


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Role


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserPublic(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: Role
    account_status: AccountStatus
    profile_complete: bool
    state_code: str | None = None
    district_code: str | None = None
    created_at: str


class AuthResponse(BaseModel):
    access_token: str | None = None
    token_type: str = 'bearer'
    user: UserPublic
    message: str | None = None


class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


def public_user(document: dict[str, Any]) -> UserPublic:
    return UserPublic(
        id=document['id'],
        full_name=document['full_name'],
        email=document['email'],
        role=document['role'],
        account_status=document['account_status'],
        profile_complete=document.get('profile_complete', False),
        state_code=document.get('state_code'),
        district_code=document.get('district_code'),
        created_at=document['created_at'],
    )


def token_for(document: dict[str, Any]) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=jwt_expire_minutes
    )

    payload = {
        'sub': document['id'],
        'role': document['role'],
        'exp': expires_at,
    }

    return jwt.encode(
        payload,
        jwt_secret,
        algorithm=jwt_algorithm,
    )


async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
) -> dict[str, Any]:

    if not credentials or credentials.scheme.lower() != 'bearer':
        raise HTTPException(
            status_code=401,
            detail='Authentication required',
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            jwt_secret,
            algorithms=[jwt_algorithm],
        )

        user_id = payload.get('sub')

    except jwt.PyJWTError as exc:
        logger.info('Rejected token: %s', exc)

        raise HTTPException(
            status_code=401,
            detail='Invalid or expired token',
        ) from exc

    document = await db.users.find_one(
        {'id': user_id},
        {'_id': 0},
    )

    if not document:
        raise HTTPException(
            status_code=401,
            detail='User account not found',
        )

    if document['account_status'] != AccountStatus.ACTIVE.value:
        raise HTTPException(
            status_code=403,
            detail=f"Account is {document['account_status'].lower()}",
        )

    return document


def require_roles(*roles: Role):

    async def dependency(
        user: dict[str, Any] = Depends(current_user),
    ) -> dict[str, Any]:

        if user['role'] not in {
            role.value for role in roles
        }:
            raise HTTPException(
                status_code=403,
                detail='Insufficient role permissions',
            )

        return user

    return dependency


@api_router.get("/")
async def root():
    return {
        'app': 'SkillAlign',
        'status': 'ready',
        'api_version': '1.0',
    }


@api_router.get('/auth/roles')
async def available_roles():
    return [
        {
            'value': Role.TRAINEE.value,
            'label': 'Trainee',
        },
        {
            'value': Role.TRAINER.value,
            'label': 'Trainer',
        },
        {
            'value': Role.EMPLOYER.value,
            'label': 'Employer',
        },
        {
            'value': Role.GOVERNMENT.value,
            'label': 'Government',
        },
    ]


@api_router.post(
    '/auth/register',
    response_model=AuthResponse,
    status_code=201,
)
async def register(input: RegisterRequest):

    email = str(input.email).lower()

    if input.role == Role.ADMIN:
        raise HTTPException(
            status_code=403,
            detail='Admin accounts cannot be self-registered',
        )

    existing = await db.users.find_one(
        {'email': email},
        {'_id': 0},
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail='An account with this email already exists',
        )

    account_status = (
        AccountStatus.PENDING
        if input.role in {
            Role.EMPLOYER,
            Role.GOVERNMENT,
            Role.TRAINER,
        }
        else AccountStatus.ACTIVE
    )

    document = {
        'id': str(uuid.uuid4()),
        'full_name': input.full_name.strip(),
        'email': email,
        'password_hash': bcrypt.hashpw(
            input.password.encode(),
            bcrypt.gensalt(),
        ).decode(),
        'role': input.role.value,
        'account_status': account_status.value,
        'profile_complete': False,
        'state_code': None,
        'district_code': None,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }

    try:
        await db.users.insert_one(document)

    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=409,
            detail='An account with this email already exists',
        ) from exc

    user = public_user(document)

    if account_status != AccountStatus.ACTIVE:
        return AuthResponse(
            user=user,
            message='Account created and awaiting administrator verification',
        )

    return AuthResponse(
        access_token=token_for(document),
        user=user,
    )


@api_router.post(
    '/auth/login',
    response_model=AuthResponse,
)
async def login(input: LoginRequest):

    document = await db.users.find_one(
        {
            'email': str(input.email).lower(),
        },
        {
            '_id': 0,
        },
    )

    if (
        not document
        or not bcrypt.checkpw(
            input.password.encode(),
            document['password_hash'].encode(),
        )
    ):
        raise HTTPException(
            status_code=401,
            detail='Invalid email or password',
        )

    if document['account_status'] != AccountStatus.ACTIVE.value:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Account is "
                f"{document['account_status'].lower()}; "
                f"contact an administrator"
            ),
        )

    return AuthResponse(
        access_token=token_for(document),
        user=public_user(document),
    )


@api_router.get(
    '/auth/me',
    response_model=UserPublic,
)
async def me(
    user: dict[str, Any] = Depends(current_user),
):
    return public_user(user)


@api_router.get('/admin/access-check')
async def admin_access_check(
    user: dict[str, Any] = Depends(
        require_roles(Role.ADMIN)
    ),
):
    return {
        'authorized': True,
        'role': user['role'],
    }


@api_router.post(
    "/status",
    response_model=StatusCheck,
)
async def create_status_check(
    input: StatusCheckCreate,
):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)

    _ = await db.status_checks.insert_one(
        status_obj.dict()
    )

    return status_obj


@api_router.get(
    "/status",
    response_model=List[StatusCheck],
)
async def get_status_checks():

    status_checks = await db.status_checks.find(
        {},
        {
            '_id': 0,
        },
    ).to_list(1000)

    return [
        StatusCheck(**status_check)
        for status_check in status_checks
    ]


# ============================================================================
# PHASE 2 — TRAINEE MVP
# ============================================================================


class Proficiency(str, Enum):
    NONE = 'NONE'
    BEGINNER = 'BEGINNER'
    INTERMEDIATE = 'INTERMEDIATE'
    ADVANCED = 'ADVANCED'


PROFICIENCY_RANK = {
    'NONE': 0,
    'BEGINNER': 1,
    'INTERMEDIATE': 2,
    'ADVANCED': 3,
}


class Difficulty(str, Enum):
    BEGINNER = 'BEGINNER'
    INTERMEDIATE = 'INTERMEDIATE'
    ADVANCED = 'ADVANCED'


DIFFICULTY_WEIGHT = {
    'BEGINNER': 1,
    'INTERMEDIATE': 2,
    'ADVANCED': 3,
}


DIFFICULTY_ORDER = {
    'BEGINNER': 0,
    'INTERMEDIATE': 1,
    'ADVANCED': 2,
}


class TraineeCategory(str, Enum):
    STUDENT = 'STUDENT'
    JOB_HOLDER = 'JOB_HOLDER'
    CAREER_GAP = 'CAREER_GAP'


class SkillSource(str, Enum):
    SELF_DECLARED = 'SELF_DECLARED'
    ASSESSED = 'ASSESSED'
    TRAINER_VERIFIED = 'TRAINER_VERIFIED'


class TraineeProfileUpsert(BaseModel):
    category: TraineeCategory
    category_details: dict = Field(
        default_factory=dict
    )
    career_goal_id: str
    state_code: str | None = None
    district_code: str | None = None


class TraineeSkillUpsert(BaseModel):
    skill_id: str
    level: Proficiency


class AssessmentStartRequest(BaseModel):
    skill_id: str


class AssessmentQuestionPublic(BaseModel):
    id: str
    difficulty: Difficulty
    prompt: str
    choices: List[str]


class AssessmentStartResponse(BaseModel):
    attempt_id: str
    skill_id: str
    questions: List[AssessmentQuestionPublic]


class AssessmentSubmitRequest(BaseModel):
    attempt_id: str
    answers: List[int]


def calc_proficiency(
    pct: float,
) -> Proficiency:

    if pct < 25:
        return Proficiency.NONE

    if pct < 50:
        return Proficiency.BEGINNER

    if pct < 75:
        return Proficiency.INTERMEDIATE

    return Proficiency.ADVANCED


require_trainee = require_roles(Role.TRAINEE)


# ---- Catalog ---------------------------------------------------------------


@api_router.get('/catalog/skills')
async def catalog_skills(
    _user: dict[str, Any] = Depends(current_user),
):
    return await db.skills.find(
        {},
        {
            '_id': 0,
        },
    ).sort(
        'name',
        1,
    ).to_list(500)


@api_router.get('/catalog/careers')
async def catalog_careers(
    _user: dict[str, Any] = Depends(current_user),
):
    return await db.careers.find(
        {},
        {
            '_id': 0,
        },
    ).sort(
        'name',
        1,
    ).to_list(200)


@api_router.get('/catalog/careers/{career_id}')
async def catalog_career_detail(
    career_id: str,
    _user: dict[str, Any] = Depends(current_user),
):

    career = await db.careers.find_one(
        {'id': career_id},
        {'_id': 0},
    )

    if not career:
        raise HTTPException(
            status_code=404,
            detail='Career not found',
        )

    ids = [
        rs['skill_id']
        for rs in career.get(
            'required_skills',
            [],
        )
    ]

    skills = await db.skills.find(
        {
            'id': {
                '$in': ids,
            }
        },
        {
            '_id': 0,
        },
    ).to_list(500)

    name_by_id = {
        s['id']: s['name']
        for s in skills
    }

    career['required_skills'] = [
        {
            **rs,
            'skill_name': name_by_id.get(
                rs['skill_id'],
                rs['skill_id'],
            ),
        }
        for rs in career.get(
            'required_skills',
            [],
        )
    ]

    return career


@api_router.get('/catalog/trainings')
async def catalog_trainings(
    skill_id: str | None = None,
    _user: dict[str, Any] = Depends(current_user),
):

    query = (
        {
            'skills.skill_id': skill_id
        }
        if skill_id
        else {}
    )

    return await db.trainings.find(
        query,
        {
            '_id': 0,
        },
    ).sort(
        'title',
        1,
    ).to_list(200)


# ---- Trainee profile -------------------------------------------------------


@api_router.get('/trainee/profile')
async def trainee_profile(
    user: dict[str, Any] = Depends(require_trainee),
):

    return await db.trainee_profiles.find_one(
        {
            'user_id': user['id'],
        },
        {
            '_id': 0,
        },
    )


@api_router.post('/trainee/profile')
async def upsert_profile(
    input: TraineeProfileUpsert,
    user: dict[str, Any] = Depends(require_trainee),
):

    career = await db.careers.find_one(
        {
            'id': input.career_goal_id,
        },
        {
            '_id': 0,
        },
    )

    if not career:
        raise HTTPException(
            status_code=400,
            detail='Invalid career_goal_id',
        )

    now = datetime.now(
        timezone.utc
    ).isoformat()

    payload = {
        'user_id': user['id'],
        'category': input.category.value,
        'category_details': input.category_details,
        'career_goal_id': input.career_goal_id,
        'state_code': input.state_code,
        'district_code': input.district_code,
        'updated_at': now,
    }

    await db.trainee_profiles.update_one(
        {
            'user_id': user['id'],
        },
        {
            '$set': payload,
            '$setOnInsert': {
                'created_at': now,
            },
        },
        upsert=True,
    )

    await db.users.update_one(
        {
            'id': user['id'],
        },
        {
            '$set': {
                'profile_complete': True,
                'state_code': input.state_code,
                'district_code': input.district_code,
            },
        },
    )

    return {
        **payload,
        'created_at': now,
    }


# ---- Trainee skills --------------------------------------------------------


@api_router.get('/trainee/skills')
async def list_trainee_skills(
    user: dict[str, Any] = Depends(require_trainee),
):

    return await db.trainee_skills.find(
        {
            'user_id': user['id'],
        },
        {
            '_id': 0,
            'user_id': 0,
        },
    ).to_list(500)


@api_router.post('/trainee/skills')
async def declare_trainee_skill(
    input: TraineeSkillUpsert,
    user: dict[str, Any] = Depends(require_trainee),
):

    if not await db.skills.find_one(
        {
            'id': input.skill_id,
        },
        {
            '_id': 0,
        },
    ):
        raise HTTPException(
            status_code=400,
            detail='Invalid skill_id',
        )

    existing = await db.trainee_skills.find_one(
        {
            'user_id': user['id'],
            'skill_id': input.skill_id,
        },
        {
            '_id': 0,
        },
    )

    if (
        existing
        and existing['source']
        in {
            SkillSource.ASSESSED.value,
            SkillSource.TRAINER_VERIFIED.value,
        }
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Skill already recorded as "
                f"{existing['source']}; "
                f"retake assessment to change it"
            ),
        )

    now = datetime.now(
        timezone.utc
    ).isoformat()

    payload = {
        'user_id': user['id'],
        'skill_id': input.skill_id,
        'level': input.level.value,
        'source': SkillSource.SELF_DECLARED.value,
        'updated_at': now,
    }

    await db.trainee_skills.update_one(
        {
            'user_id': user['id'],
            'skill_id': input.skill_id,
        },
        {
            '$set': payload,
        },
        upsert=True,
    )

    return {
        k: v
        for k, v in payload.items()
        if k != 'user_id'
    }


# ---- Assessment ------------------------------------------------------------


@api_router.post(
    '/assessment/start',
    response_model=AssessmentStartResponse,
)
async def assessment_start(
    input: AssessmentStartRequest,
    user: dict[str, Any] = Depends(require_trainee),
):

    if not await db.skills.find_one(
        {
            'id': input.skill_id,
        },
        {
            '_id': 0,
        },
    ):
        raise HTTPException(
            status_code=400,
            detail='Invalid skill_id',
        )

    questions = await db.questions.find(
        {
            'skill_id': input.skill_id,
        },
        {
            '_id': 0,
        },
    ).to_list(200)

    if len(questions) < 3:
        raise HTTPException(
            status_code=503,
            detail='Assessment not yet available for this skill',
        )

    questions.sort(
        key=lambda q: DIFFICULTY_ORDER[
            q['difficulty']
        ]
    )

    attempt_id = str(
        uuid.uuid4()
    )

    await db.assessment_attempts.insert_one(
        {
            'id': attempt_id,
            'user_id': user['id'],
            'skill_id': input.skill_id,
            'question_ids': [
                q['id']
                for q in questions
            ],
            'created_at': datetime.now(
                timezone.utc
            ).isoformat(),
            'submitted_at': None,
            'score': None,
            'max_score': None,
            'percentage': None,
            'proficiency': None,
        }
    )

    return AssessmentStartResponse(
        attempt_id=attempt_id,
        skill_id=input.skill_id,
        questions=[
            AssessmentQuestionPublic(
                id=q['id'],
                difficulty=q['difficulty'],
                prompt=q['prompt'],
                choices=q['choices'],
            )
            for q in questions
        ],
    )


@api_router.post('/assessment/submit')
async def assessment_submit(
    input: AssessmentSubmitRequest,
    user: dict[str, Any] = Depends(require_trainee),
):

    attempt = await db.assessment_attempts.find_one(
        {
            'id': input.attempt_id,
            'user_id': user['id'],
        },
        {
            '_id': 0,
        },
    )

    if not attempt:
        raise HTTPException(
            status_code=404,
            detail='Attempt not found',
        )

    if attempt.get('score') is not None:
        raise HTTPException(
            status_code=409,
            detail='Attempt already submitted',
        )

    if len(input.answers) != len(
        attempt['question_ids']
    ):
        raise HTTPException(
            status_code=400,
            detail='Answer count does not match question count',
        )

    q_docs = await db.questions.find(
        {
            'id': {
                '$in': attempt['question_ids']
            }
        },
        {
            '_id': 0,
        },
    ).to_list(200)

    q_by_id = {
        q['id']: q
        for q in q_docs
    }

    score = 0
    max_score = 0
    breakdown: list[dict] = []

    for qid, ans in zip(
        attempt['question_ids'],
        input.answers,
    ):

        q = q_by_id[qid]
        weight = DIFFICULTY_WEIGHT[
            q['difficulty']
        ]

        max_score += weight

        correct = (
            ans == q['correct_index']
        )

        if correct:
            score += weight

        breakdown.append(
            {
                'question_id': qid,
                'difficulty': q['difficulty'],
                'correct': correct,
                'chosen_index': ans,
                'correct_index': q['correct_index'],
                'explanation': q.get(
                    'explanation',
                    '',
                ),
            }
        )

    pct = (
        round(
            100.0 * score / max_score,
            1,
        )
        if max_score
        else 0.0
    )

    proficiency = calc_proficiency(pct)

    now = datetime.now(
        timezone.utc
    ).isoformat()

    await db.assessment_attempts.update_one(
        {
            'id': input.attempt_id,
        },
        {
            '$set': {
                'answers': input.answers,
                'score': score,
                'max_score': max_score,
                'percentage': pct,
                'proficiency': proficiency.value,
                'submitted_at': now,
            }
        },
    )

    await db.trainee_skills.update_one(
        {
            'user_id': user['id'],
            'skill_id': attempt['skill_id'],
        },
        {
            '$set': {
                'user_id': user['id'],
                'skill_id': attempt['skill_id'],
                'level': proficiency.value,
                'source': SkillSource.ASSESSED.value,
                'updated_at': now,
                'last_attempt_id': input.attempt_id,
            }
        },
        upsert=True,
    )

    return {
        'attempt_id': input.attempt_id,
        'skill_id': attempt['skill_id'],
        'score': score,
        'max_score': max_score,
        'percentage': pct,
        'proficiency': proficiency.value,
        'breakdown': breakdown,
    }


@api_router.get('/assessment/history')
async def assessment_history(
    user: dict[str, Any] = Depends(require_trainee),
):

    return await db.assessment_attempts.find(
        {
            'user_id': user['id'],
            'score': {
                '$ne': None
            },
        },
        {
            '_id': 0,
            'user_id': 0,
            'question_ids': 0,
            'answers': 0,
        },
    ).sort(
        'submitted_at',
        -1,
    ).to_list(200)


# ---- Skill gap + recommendations -------------------------------------------


@api_router.get('/trainee/skill-gap')
async def skill_gap(
    user: dict[str, Any] = Depends(require_trainee),
):

    profile = await db.trainee_profiles.find_one(
        {
            'user_id': user['id'],
        },
        {
            '_id': 0,
        },
    )

    if not profile or not profile.get(
        'career_goal_id'
    ):
        raise HTTPException(
            status_code=404,
            detail='Set a career goal to see your skill gap',
        )

    career = await db.careers.find_one(
        {
            'id': profile['career_goal_id'],
        },
        {
            '_id': 0,
        },
    )

    if not career:
        raise HTTPException(
            status_code=404,
            detail='Career not found',
        )

    skills_by_id = {
        s['id']: s
        for s in await db.skills.find(
            {
                'id': {
                    '$in': [
                        rs['skill_id']
                        for rs in career['required_skills']
                    ]
                }
            },
            {
                '_id': 0,
            },
        ).to_list(200)
    }

    current_by_id = {
        s['skill_id']: s
        for s in await db.trainee_skills.find(
            {
                'user_id': user['id'],
            },
            {
                '_id': 0,
            },
        ).to_list(500)
    }

    items = []
    matched = 0

    for rs in career['required_skills']:

        cur = current_by_id.get(
            rs['skill_id']
        )

        current_level = (
            cur['level']
            if cur
            else 'NONE'
        )

        current_source = (
            cur['source']
            if cur
            else None
        )

        rank_gap = (
            PROFICIENCY_RANK[
                rs['required_level']
            ]
            - PROFICIENCY_RANK[
                current_level
            ]
        )

        if rank_gap <= 0:
            status_label = 'MET'
            matched += 1

        elif current_level == 'NONE':
            status_label = 'NOT_STARTED'

        else:
            status_label = 'GAP'

        items.append(
            {
                'skill_id': rs['skill_id'],
                'skill_name': skills_by_id.get(
                    rs['skill_id'],
                    {},
                ).get(
                    'name',
                    rs['skill_id'],
                ),
                'required_level': rs[
                    'required_level'
                ],
                'current_level': current_level,
                'source': current_source,
                'gap': max(
                    0,
                    rank_gap,
                ),
                'status': status_label,
            }
        )

    return {
        'career_id': career['id'],
        'career_name': career['name'],
        'items': items,
        'matched': matched,
        'total': len(items),
    }


@api_router.get('/trainee/recommendations')
async def trainee_recommendations(
    user: dict[str, Any] = Depends(require_trainee),
):

    profile = await db.trainee_profiles.find_one(
        {
            'user_id': user['id'],
        },
        {
            '_id': 0,
        },
    )

    if not profile or not profile.get(
        'career_goal_id'
    ):
        return {
            'items': []
        }

    career = await db.careers.find_one(
        {
            'id': profile['career_goal_id'],
        },
        {
            '_id': 0,
        },
    )

    if not career:
        return {
            'items': []
        }

    current_by_id = {
        s['skill_id']: s
        for s in await db.trainee_skills.find(
            {
                'user_id': user['id'],
            },
            {
                '_id': 0,
            },
        ).to_list(500)
    }

    gap_ids = []

    for rs in career['required_skills']:

        current_level = current_by_id.get(
            rs['skill_id'],
            {},
        ).get(
            'level',
            'NONE',
        )

        if (
            PROFICIENCY_RANK[current_level]
            < PROFICIENCY_RANK[
                rs['required_level']
            ]
        ):
            gap_ids.append(
                rs['skill_id']
            )

    if not gap_ids:
        return {
            'items': []
        }

    trainings = await db.trainings.find(
        {
            'skills.skill_id': {
                '$in': gap_ids
            }
        },
        {
            '_id': 0,
        },
    ).to_list(200)

    name_by_id = {
        s['id']: s['name']
        for s in await db.skills.find(
            {
                'id': {
                    '$in': gap_ids
                }
            },
            {
                '_id': 0,
            },
        ).to_list(200)
    }

    items = []

    for t in trainings:

        covered = [
            cs['skill_id']
            for cs in t.get(
                'skills',
                []
            )
            if cs['skill_id'] in gap_ids
        ]

        if not covered:
            continue

        names = [
            name_by_id.get(
                sid,
                sid,
            )
            for sid in covered
        ]

        items.append(
            {
                'training': t,
                'covered_gaps': covered,
                'reason': (
                    f"Closes gap in "
                    f"{', '.join(names)}"
                ),
            }
        )

    items.sort(
        key=lambda x: len(
            x['covered_gaps']
        ),
        reverse=True,
    )

    return {
        'items': items[:8]
    }


# ============================================================================
# PHASE 3 — TRAINER PORTAL + ADMIN APPROVAL WORKFLOW
# ============================================================================


class TrainingStatus(str, Enum):
    PUBLISHED = 'PUBLISHED'
    CLOSED = 'CLOSED'


class EnrollmentStatus(str, Enum):
    ENROLLED = 'ENROLLED'
    COMPLETED = 'COMPLETED'
    DROPPED = 'DROPPED'


class TrainerProfileUpsert(BaseModel):
    headline: str = Field(
        min_length=2,
        max_length=120,
    )

    bio: str = Field(
        default='',
        max_length=800,
    )

    specializations: List[str] = Field(
        default_factory=list,
        max_length=20,
    )

    skill_ids: List[str] = Field(
        default_factory=list,
        max_length=30,
    )

    qualifications: str = Field(
        default='',
        max_length=300,
    )

    experience_years: int = Field(
        ge=0,
        le=60,
    )

    institution: str = Field(
        default='',
        max_length=120,
    )

    state_code: str | None = None
    district_code: str | None = None

    availability: str = Field(
        default='FLEXIBLE',
        max_length=40,
    )


class TrainingSkillInput(BaseModel):
    skill_id: str
    target_level: Proficiency


class TrainingUpsert(BaseModel):
    title: str = Field(
        min_length=3,
        max_length=120,
    )

    description: str = Field(
        min_length=10,
        max_length=1000,
    )

    skills: List[TrainingSkillInput] = Field(
        min_length=1,
        max_length=10,
    )

    duration_hours: int = Field(
        ge=1,
        le=1000,
    )

    mode: str = Field(
        default='ONLINE'
    )

    seats: int = Field(
        ge=1,
        le=10000,
    )

    status: TrainingStatus = TrainingStatus.PUBLISHED


class SkillVerifyInput(BaseModel):
    skill_id: str
    level: Proficiency
    note: str = Field(
        default='',
        max_length=300,
    )


class EnrollmentCreate(BaseModel):
    training_id: str


class EnrollmentCompleteInput(BaseModel):
    trainer_notes: str = Field(
        default='',
        max_length=500,
    )


require_trainer = require_roles(Role.TRAINER)
require_admin = require_roles(Role.ADMIN)
require_government = require_roles(
    Role.GOVERNMENT,
    Role.ADMIN,
)


# ============================================================================
# GOVERNMENT MODULE
# ============================================================================


@api_router.get("/government/dashboard")
async def government_dashboard(
    user: dict[str, Any] = Depends(require_government),
):

    total_users = await db.users.count_documents({})

    total_trainees = await db.users.count_documents(
        {
            "role": Role.TRAINEE.value
        }
    )

    total_trainers = await db.users.count_documents(
        {
            "role": Role.TRAINER.value
        }
    )

    total_employers = await db.users.count_documents(
        {
            "role": Role.EMPLOYER.value
        }
    )

    total_trainings = await db.trainings.count_documents(
        {}
    )

    total_enrollments = await db.enrollments.count_documents(
        {}
    )

    active_enrollments = await db.enrollments.count_documents(
        {
            "status": EnrollmentStatus.ENROLLED.value
        }
    )

    completed_enrollments = await db.enrollments.count_documents(
        {
            "status": EnrollmentStatus.COMPLETED.value
        }
    )

    return {
        "statistics": {
            "total_users": total_users,
            "total_trainees": total_trainees,
            "total_trainers": total_trainers,
            "total_employers": total_employers,
            "total_trainings": total_trainings,
            "total_enrollments": total_enrollments,
            "active_enrollments": active_enrollments,
            "completed_enrollments": completed_enrollments,
        }
    }


@api_router.get("/government/training-analytics")
async def government_training_analytics(
    user: dict[str, Any] = Depends(require_government),
):

    trainings = await db.trainings.find(
        {},
        {
            "_id": 0,
            "id": 1,
            "seats": 1,
        },
    ).to_list(5000)

    enrollments = await db.enrollments.find(
        {},
        {
            "_id": 0,
            "training_id": 1,
            "status": 1,
        },
    ).to_list(20000)

    total_capacity = sum(
        int(
            training.get(
                "seats",
                0,
            )
            or 0
        )
        for training in trainings
    )

    total_enrollments = len(
        enrollments
    )

    active_enrollments = sum(
        1
        for enrollment in enrollments
        if enrollment.get(
            "status"
        ) == "ENROLLED"
    )

    completed_enrollments = sum(
        1
        for enrollment in enrollments
        if enrollment.get(
            "status"
        ) == "COMPLETED"
    )

    used_capacity = (
        active_enrollments
        + completed_enrollments
    )

    utilization_rate = (
        round(
            (
                used_capacity
                / total_capacity
            )
            * 100,
            1,
        )
        if total_capacity > 0
        else 0
    )

    completion_rate = (
        round(
            (
                completed_enrollments
                / total_enrollments
            )
            * 100,
            1,
        )
        if total_enrollments > 0
        else 0
    )

    available_capacity = max(
        total_capacity
        - used_capacity,
        0,
    )

    return {
        "total_trainings": len(
            trainings
        ),
        "total_capacity": total_capacity,
        "used_capacity": used_capacity,
        "available_capacity": available_capacity,
        "total_enrollments": total_enrollments,
        "active_enrollments": active_enrollments,
        "completed_enrollments": completed_enrollments,
        "utilization_rate": utilization_rate,
        "completion_rate": completion_rate,
    }


@api_router.get("/government/district-analytics")
async def government_district_analytics(
    user: dict[str, Any] = Depends(require_government),
):

    districts = {}

    users = await db.users.find(
        {
            "role": {
                "$in": [
                    Role.TRAINEE.value,
                    Role.TRAINER.value,
                    Role.EMPLOYER.value,
                ]
            }
        },
        {
            "_id": 0,
            "role": 1,
            "district_code": 1,
            "state_code": 1,
        },
    ).to_list(5000)

    for item in users:

        state = (
            item.get("state_code")
            or "UNKNOWN"
        )

        district = (
            item.get("district_code")
            or "UNKNOWN"
        )

        key = f"{state}-{district}"

        if key not in districts:
            districts[key] = {
                "state_code": state,
                "district_code": district,
                "trainees": 0,
                "trainers": 0,
                "employers": 0,
                "trainings": 0,
            }

        role = item.get("role")

        if role == Role.TRAINEE.value:
            districts[key]["trainees"] += 1

        elif role == Role.TRAINER.value:
            districts[key]["trainers"] += 1

        elif role == Role.EMPLOYER.value:
            districts[key]["employers"] += 1

    trainings = await db.trainings.find(
        {},
        {
            "_id": 0,
            "provider_user_id": 1,
        },
    ).to_list(5000)

    for training in trainings:

        provider_id = training.get(
            "provider_user_id"
        )

        provider = await db.users.find_one(
            {
                "id": provider_id
            },
            {
                "_id": 0,
                "state_code": 1,
                "district_code": 1,
            },
        )

        if provider:

            state = (
                provider.get(
                    "state_code"
                )
                or "UNKNOWN"
            )

            district = (
                provider.get(
                    "district_code"
                )
                or "UNKNOWN"
            )

            key = f"{state}-{district}"

            if key not in districts:
                districts[key] = {
                    "state_code": state,
                    "district_code": district,
                    "trainees": 0,
                    "trainers": 0,
                    "employers": 0,
                    "trainings": 0,
                }

            districts[key]["trainings"] += 1

    return {
        "districts": list(
            districts.values()
        )
    }


@api_router.get("/government/skill-analytics")
async def government_skill_analytics(
    user: dict[str, Any] = Depends(require_government),
):

    skill_demand = {}

    skills = await db.skills.find(
        {},
        {
            "_id": 0,
            "id": 1,
            "name": 1,
            "domain": 1,
        },
    ).to_list(5000)

    for skill in skills:

        skill_id = skill["id"]

        skill_demand[skill_id] = {
            "skill_id": skill_id,
            "skill_name": skill.get(
                "name",
                skill_id,
            ),
            "domain": skill.get(
                "domain",
                "GENERAL",
            ),
            "trainee_count": 0,
            "training_count": 0,
            "enrollment_count": 0,
        }

    trainee_skills = await db.trainee_skills.find(
        {},
        {
            "_id": 0,
            "skill_id": 1,
        },
    ).to_list(10000)

    for record in trainee_skills:

        skill_id = record.get(
            "skill_id"
        )

        if skill_id in skill_demand:
            skill_demand[
                skill_id
            ]["trainee_count"] += 1

    trainings = await db.trainings.find(
        {},
        {
            "_id": 0,
            "id": 1,
            "skills": 1,
        },
    ).to_list(5000)

    training_skill_map = {}

    for training in trainings:

        training_id = training.get(
            "id"
        )

        for skill in training.get(
            "skills",
            [],
        ):

            skill_id = skill.get(
                "skill_id"
            )

            if skill_id in skill_demand:

                skill_demand[
                    skill_id
                ]["training_count"] += 1

                training_skill_map.setdefault(
                    training_id,
                    set(),
                ).add(skill_id)

    enrollments = await db.enrollments.find(
        {},
        {
            "_id": 0,
            "training_id": 1,
        },
    ).to_list(10000)

    for enrollment in enrollments:

        training_id = enrollment.get(
            "training_id"
        )

        for skill_id in training_skill_map.get(
            training_id,
            set(),
        ):

            skill_demand[
                skill_id
            ]["enrollment_count"] += 1

    result = list(
        skill_demand.values()
    )

    result.sort(
        key=lambda item: item[
            "trainee_count"
        ],
        reverse=True,
    )

    return {
        "skills": result
    }


@api_router.get("/government/skill-gaps")
async def government_skill_gaps(
    user: dict[str, Any] = Depends(require_government),
):

    skills = await db.skills.find(
        {},
        {
            "_id": 0,
            "id": 1,
            "name": 1,
            "domain": 1,
        },
    ).to_list(1000)

    skill_by_id = {
        skill["id"]: skill
        for skill in skills
    }

    careers = await db.careers.find(
        {},
        {
            "_id": 0,
            "id": 1,
            "name": 1,
            "required_skills": 1,
        },
    ).to_list(500)

    career_by_id = {
        career["id"]: career
        for career in careers
    }

    profiles = await db.trainee_profiles.find(
        {
            "career_goal_id": {
                "$exists": True,
                "$ne": None,
            }
        },
        {
            "_id": 0,
            "user_id": 1,
            "career_goal_id": 1,
            "state_code": 1,
            "district_code": 1,
        },
    ).to_list(10000)

    trainee_skills = await db.trainee_skills.find(
        {},
        {
            "_id": 0,
            "user_id": 1,
            "skill_id": 1,
            "level": 1,
        },
    ).to_list(20000)

    current_skills = {}

    for record in trainee_skills:

        user_id = record.get(
            "user_id"
        )

        skill_id = record.get(
            "skill_id"
        )

        level = record.get(
            "level",
            "NONE",
        )

        current_skills.setdefault(
            user_id,
            {},
        )[skill_id] = level

    overall = {}
    district_data = {}
    career_data = {}

    for profile in profiles:

        user_id = profile.get(
            "user_id"
        )

        career_id = profile.get(
            "career_goal_id"
        )

        career = career_by_id.get(
            career_id
        )

        if not career:
            continue

        state = (
            profile.get(
                "state_code"
            )
            or "UNKNOWN"
        )

        district = (
            profile.get(
                "district_code"
            )
            or "UNKNOWN"
        )

        district_key = (
            f"{state}-{district}"
        )

        district_data.setdefault(
            district_key,
            {
                "state_code": state,
                "district_code": district,
                "skills": {},
            },
        )

        career_data.setdefault(
            career_id,
            {
                "career_id": career_id,
                "career_name": career.get(
                    "name",
                    career_id,
                ),
                "skills": {},
            },
        )

        user_skill_map = current_skills.get(
            user_id,
            {},
        )

        for required in career.get(
            "required_skills",
            [],
        ):

            skill_id = required.get(
                "skill_id"
            )

            required_level = required.get(
                "required_level",
                "NONE",
            )

            skill = skill_by_id.get(
                skill_id
            )

            if not skill:
                continue

            current_level = user_skill_map.get(
                skill_id,
                "NONE",
            )

            required_rank = PROFICIENCY_RANK.get(
                required_level,
                0,
            )

            current_rank = PROFICIENCY_RANK.get(
                current_level,
                0,
            )

            missing = (
                current_rank
                < required_rank
            )

            overall_item = overall.setdefault(
                skill_id,
                {
                    "skill_id": skill_id,
                    "skill_name": skill.get(
                        "name",
                        skill_id,
                    ),
                    "domain": skill.get(
                        "domain",
                        "GENERAL",
                    ),
                    "required_count": 0,
                    "missing_count": 0,
                    "available_count": 0,
                },
            )

            overall_item[
                "required_count"
            ] += 1

            if missing:
                overall_item[
                    "missing_count"
                ] += 1
            else:
                overall_item[
                    "available_count"
                ] += 1

            district_skill = district_data[
                district_key
            ]["skills"].setdefault(
                skill_id,
                {
                    "skill_id": skill_id,
                    "skill_name": skill.get(
                        "name",
                        skill_id,
                    ),
                    "required_count": 0,
                    "missing_count": 0,
                    "available_count": 0,
                },
            )

            district_skill[
                "required_count"
            ] += 1

            if missing:
                district_skill[
                    "missing_count"
                ] += 1
            else:
                district_skill[
                    "available_count"
                ] += 1

            career_skill = career_data[
                career_id
            ]["skills"].setdefault(
                skill_id,
                {
                    "skill_id": skill_id,
                    "skill_name": skill.get(
                        "name",
                        skill_id,
                    ),
                    "required_count": 0,
                    "missing_count": 0,
                    "available_count": 0,
                },
            )

            career_skill[
                "required_count"
            ] += 1

            if missing:
                career_skill[
                    "missing_count"
                ] += 1
            else:
                career_skill[
                    "available_count"
                ] += 1

    overall_list = list(
        overall.values()
    )

    overall_list.sort(
        key=lambda item: item[
            "missing_count"
        ],
        reverse=True,
    )

    district_list = []

    for item in district_data.values():

        district_list.append(
            {
                "state_code": item[
                    "state_code"
                ],
                "district_code": item[
                    "district_code"
                ],
                "skills": sorted(
                    item[
                        "skills"
                    ].values(),
                    key=lambda skill: skill[
                        "missing_count"
                    ],
                    reverse=True,
                ),
            }
        )

    career_list = []

    for item in career_data.values():

        career_list.append(
            {
                "career_id": item[
                    "career_id"
                ],
                "career_name": item[
                    "career_name"
                ],
                "skills": sorted(
                    item[
                        "skills"
                    ].values(),
                    key=lambda skill: skill[
                        "missing_count"
                    ],
                    reverse=True,
                ),
            }
        )

    return {
        "overall": overall_list,
        "most_missing": overall_list[:10],
        "most_available": sorted(
            overall_list,
            key=lambda item: item[
                "available_count"
            ],
            reverse=True,
        )[:10],
        "districts": district_list,
        "careers": career_list,
    }

@api_router.get("/government/job-placement-analytics")
async def government_job_placement_analytics(
    user: dict[str, Any] = Depends(require_government),
    district_code: str | None = None,
    career_id: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
):
    job_query = {}

    if district_code:
        job_query["district_code"] = district_code

    if career_id:
        job_query["career_id"] = career_id

    jobs = await db.job_posts.find(
        job_query,
        {
            "_id": 0,
            "id": 1,
            "title": 1,
            "career_id": 1,
            "state_code": 1,
            "district_code": 1,
            "openings": 1,
            "status": 1,
            "created_at": 1,
        },
    ).to_list(10000)
    # Optional date filtering.
    # Expected format: YYYY-MM-DD
    if date_from or date_to:
        filtered_jobs = []

        for job in jobs:
            created_date = str(
                job.get("created_at", "")
            )[:10]

            if not created_date:
                continue

            if date_from and created_date < date_from:
                continue

            if date_to and created_date > date_to:
                continue

            filtered_jobs.append(job)

        jobs = filtered_jobs
    job_ids = [
        job["id"]
        for job in jobs
    ]

    applications = []

    if job_ids:
        applications = await db.job_applications.find(
            {
                "job_id": {
                    "$in": job_ids
                }
            },
            {
                "_id": 0,
                "id": 1,
                "job_id": 1,
                "trainee_user_id": 1,
                "status": 1,
                "applied_at": 1,
                "hired_at": 1,
            },
        ).to_list(50000)

    total_jobs = len(jobs)

    total_openings = sum(
        int(job.get("openings", 0) or 0)
        for job in jobs
    )

    total_applications = len(
        applications
    )

    total_placements = sum(
        1
        for application in applications
        if application.get("status") == "HIRED"
    )

    placement_rate = (
        round(
            (
                total_placements
                / total_applications
            )
            * 100,
            1,
        )
        if total_applications > 0
        else 0
    )

    district_data = {}

    for job in jobs:
        district = (
            job.get("district_code")
            or "UNKNOWN"
        )

        district_data.setdefault(
            district,
            {
                "district_code": district,
                "jobs": 0,
                "openings": 0,
                "placements": 0,
            },
        )

        district_data[district]["jobs"] += 1

        district_data[district]["openings"] += int(
            job.get("openings", 0) or 0
        )

    job_map = {
        job["id"]: job
        for job in jobs
    }

    for application in applications:
        if application.get("status") != "HIRED":
            continue

        job = job_map.get(
            application.get("job_id")
        )

        if not job:
            continue

        district = (
            job.get("district_code")
            or "UNKNOWN"
        )

        district_data.setdefault(
            district,
            {
                "district_code": district,
                "jobs": 0,
                "openings": 0,
                "placements": 0,
            },
        )

        district_data[district]["placements"] += 1

    career_ids = list(
        {
            job.get("career_id")
            for job in jobs
            if job.get("career_id")
        }
    )

    careers = await db.careers.find(
        {
            "id": {
                "$in": career_ids
            }
        },
        {
            "_id": 0,
            "id": 1,
            "name": 1,
        },
    ).to_list(500)

    career_names = {
        career["id"]: career.get(
            "name",
            career["id"],
        )
        for career in careers
    }

    career_data = {}

    for job in jobs:
        cid = job.get("career_id")

        if not cid:
            cid = "UNKNOWN"

        career_data.setdefault(
            cid,
            {
                "career_id": cid,
                "career_name": career_names.get(
                    cid,
                    cid,
                ),
                "jobs": 0,
                "openings": 0,
                "placements": 0,
            },
        )

        career_data[cid]["jobs"] += 1

        career_data[cid]["openings"] += int(
            job.get("openings", 0) or 0
        )

    for application in applications:
        if application.get("status") != "HIRED":
            continue

        job = job_map.get(
            application.get("job_id")
        )

        if not job:
            continue

        cid = job.get("career_id") or "UNKNOWN"

        career_data.setdefault(
            cid,
            {
                "career_id": cid,
                "career_name": career_names.get(
                    cid,
                    cid,
                ),
                "jobs": 0,
                "openings": 0,
                "placements": 0,
            },
        )

        career_data[cid]["placements"] += 1

    return {
        "summary": {
            "total_jobs": total_jobs,
            "total_openings": total_openings,
            "total_applications": total_applications,
            "total_placements": total_placements,
            "placement_rate": placement_rate,
        },
        "districts": sorted(
            district_data.values(),
            key=lambda item: item["jobs"],
            reverse=True,
        ),
        "careers": sorted(
            career_data.values(),
            key=lambda item: item["jobs"],
            reverse=True,
        ),
    }
@api_router.get("/government/analytics-summary")
async def government_analytics_summary(
    user: dict[str, Any] = Depends(require_government),
):

    district_codes = await db.users.distinct(
        "district_code"
    )

    valid_districts = [
        district
        for district in district_codes
        if district
    ]

    total_skills = await db.skills.count_documents(
        {}
    )

    total_trainee_skills = (
        await db.trainee_skills.count_documents(
            {}
        )
    )

    return {
        "summary": {
            "total_districts": len(
                valid_districts
            ),
            "total_skills": total_skills,
            "total_trainee_skill_records": (
                total_trainee_skills
            ),
        }
    }


@api_router.get("/government/notifications")
async def government_notifications(
    user: dict[str, Any] = Depends(require_government),
):

    notifications = await db.notifications.find(
        {},
        {
            "_id": 0
        },
    ).sort(
        "created_at",
        -1,
    ).to_list(100)

    return {
        "notifications": notifications
    }


# ============================================================================
# Include all API routes
# ============================================================================

app.include_router(api_router)