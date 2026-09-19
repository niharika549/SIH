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

# Create the main app without a prefix
app = FastAPI()

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
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=jwt_expire_minutes)
    payload = {'sub': document['id'], 'role': document['role'], 'exp': expires_at}
    return jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)


async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    if not credentials or credentials.scheme.lower() != 'bearer':
        raise HTTPException(status_code=401, detail='Authentication required')
    try:
        payload = jwt.decode(credentials.credentials, jwt_secret, algorithms=[jwt_algorithm])
        user_id = payload.get('sub')
    except jwt.PyJWTError as exc:
        logger.info('Rejected token: %s', exc)
        raise HTTPException(status_code=401, detail='Invalid or expired token') from exc
    document = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not document:
        raise HTTPException(status_code=401, detail='User account not found')
    if document['account_status'] != AccountStatus.ACTIVE.value:
        raise HTTPException(status_code=403, detail=f"Account is {document['account_status'].lower()}")
    return document


def require_roles(*roles: Role):
    async def dependency(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
        if user['role'] not in {role.value for role in roles}:
            raise HTTPException(status_code=403, detail='Insufficient role permissions')
        return user

    return dependency


@api_router.get("/")
async def root():
    return {'app': 'SkillAlign', 'status': 'ready', 'api_version': '1.0'}


@api_router.get('/auth/roles')
async def available_roles():
    return [
        {'value': Role.TRAINEE.value, 'label': 'Trainee'},
        {'value': Role.TRAINER.value, 'label': 'Trainer'},
        {'value': Role.EMPLOYER.value, 'label': 'Employer'},
        {'value': Role.GOVERNMENT.value, 'label': 'Government'},
    ]


@api_router.post('/auth/register', response_model=AuthResponse, status_code=201)
async def register(input: RegisterRequest):
    email = str(input.email).lower()
    if input.role == Role.ADMIN:
        raise HTTPException(status_code=403, detail='Admin accounts cannot be self-registered')
    existing = await db.users.find_one({'email': email}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=409, detail='An account with this email already exists')
    account_status = (
        AccountStatus.PENDING
        if input.role in {Role.EMPLOYER, Role.GOVERNMENT, Role.TRAINER}
        else AccountStatus.ACTIVE
    )
    document = {
        'id': str(uuid.uuid4()),
        'full_name': input.full_name.strip(),
        'email': email,
        'password_hash': bcrypt.hashpw(input.password.encode(), bcrypt.gensalt()).decode(),
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
        raise HTTPException(status_code=409, detail='An account with this email already exists') from exc
    user = public_user(document)
    if account_status != AccountStatus.ACTIVE:
        return AuthResponse(
            user=user,
            message='Account created and awaiting administrator verification',
        )
    return AuthResponse(access_token=token_for(document), user=user)


@api_router.post('/auth/login', response_model=AuthResponse)
async def login(input: LoginRequest):
    document = await db.users.find_one({'email': str(input.email).lower()}, {'_id': 0})
    if not document or not bcrypt.checkpw(input.password.encode(), document['password_hash'].encode()):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    if document['account_status'] != AccountStatus.ACTIVE.value:
        raise HTTPException(
            status_code=403,
            detail=f"Account is {document['account_status'].lower()}; contact an administrator",
        )
    return AuthResponse(access_token=token_for(document), user=public_user(document))


@api_router.get('/auth/me', response_model=UserPublic)
async def me(user: dict[str, Any] = Depends(current_user)):
    return public_user(user)


@api_router.get('/admin/access-check')
async def admin_access_check(user: dict[str, Any] = Depends(require_roles(Role.ADMIN))):
    return {'authorized': True, 'role': user['role']}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {'_id': 0}).to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# ============================================================================
# PHASE 2 — TRAINEE MVP
# ============================================================================


class Proficiency(str, Enum):
    NONE = 'NONE'
    BEGINNER = 'BEGINNER'
    INTERMEDIATE = 'INTERMEDIATE'
    ADVANCED = 'ADVANCED'


PROFICIENCY_RANK = {'NONE': 0, 'BEGINNER': 1, 'INTERMEDIATE': 2, 'ADVANCED': 3}


class Difficulty(str, Enum):
    BEGINNER = 'BEGINNER'
    INTERMEDIATE = 'INTERMEDIATE'
    ADVANCED = 'ADVANCED'


DIFFICULTY_WEIGHT = {'BEGINNER': 1, 'INTERMEDIATE': 2, 'ADVANCED': 3}
DIFFICULTY_ORDER = {'BEGINNER': 0, 'INTERMEDIATE': 1, 'ADVANCED': 2}


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
    category_details: dict = Field(default_factory=dict)
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


def calc_proficiency(pct: float) -> Proficiency:
    if pct < 25:
        return Proficiency.NONE
    if pct < 50:
        return Proficiency.BEGINNER
    if pct < 75:
        return Proficiency.INTERMEDIATE
    return Proficiency.ADVANCED


require_trainee = require_roles(Role.TRAINEE)


# ---- Catalog (any authenticated user) --------------------------------------


@api_router.get('/catalog/skills')
async def catalog_skills(_user: dict[str, Any] = Depends(current_user)):
    return await db.skills.find({}, {'_id': 0}).sort('name', 1).to_list(500)


@api_router.get('/catalog/careers')
async def catalog_careers(_user: dict[str, Any] = Depends(current_user)):
    return await db.careers.find({}, {'_id': 0}).sort('name', 1).to_list(200)


@api_router.get('/catalog/careers/{career_id}')
async def catalog_career_detail(career_id: str, _user: dict[str, Any] = Depends(current_user)):
    career = await db.careers.find_one({'id': career_id}, {'_id': 0})
    if not career:
        raise HTTPException(status_code=404, detail='Career not found')
    ids = [rs['skill_id'] for rs in career.get('required_skills', [])]
    skills = await db.skills.find({'id': {'$in': ids}}, {'_id': 0}).to_list(500)
    name_by_id = {s['id']: s['name'] for s in skills}
    career['required_skills'] = [
        {**rs, 'skill_name': name_by_id.get(rs['skill_id'], rs['skill_id'])}
        for rs in career.get('required_skills', [])
    ]
    return career


@api_router.get('/catalog/trainings')
async def catalog_trainings(skill_id: str | None = None, _user: dict[str, Any] = Depends(current_user)):
    query = {'skills.skill_id': skill_id} if skill_id else {}
    return await db.trainings.find(query, {'_id': 0}).sort('title', 1).to_list(200)


# ---- Trainee profile -------------------------------------------------------


@api_router.get('/trainee/profile')
async def trainee_profile(user: dict[str, Any] = Depends(require_trainee)):
    return await db.trainee_profiles.find_one({'user_id': user['id']}, {'_id': 0})


@api_router.post('/trainee/profile')
async def upsert_profile(input: TraineeProfileUpsert, user: dict[str, Any] = Depends(require_trainee)):
    career = await db.careers.find_one({'id': input.career_goal_id}, {'_id': 0})
    if not career:
        raise HTTPException(status_code=400, detail='Invalid career_goal_id')
    now = datetime.now(timezone.utc).isoformat()
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
        {'user_id': user['id']},
        {'$set': payload, '$setOnInsert': {'created_at': now}},
        upsert=True,
    )
    await db.users.update_one(
        {'id': user['id']},
        {'$set': {
            'profile_complete': True,
            'state_code': input.state_code,
            'district_code': input.district_code,
        }},
    )
    return {**payload, 'created_at': now}


# ---- Trainee skills --------------------------------------------------------


@api_router.get('/trainee/skills')
async def list_trainee_skills(user: dict[str, Any] = Depends(require_trainee)):
    return await db.trainee_skills.find(
        {'user_id': user['id']},
        {'_id': 0, 'user_id': 0},
    ).to_list(500)


@api_router.post('/trainee/skills')
async def declare_trainee_skill(input: TraineeSkillUpsert, user: dict[str, Any] = Depends(require_trainee)):
    if not await db.skills.find_one({'id': input.skill_id}, {'_id': 0}):
        raise HTTPException(status_code=400, detail='Invalid skill_id')
    existing = await db.trainee_skills.find_one(
        {'user_id': user['id'], 'skill_id': input.skill_id},
        {'_id': 0},
    )
    if existing and existing['source'] in {SkillSource.ASSESSED.value, SkillSource.TRAINER_VERIFIED.value}:
        raise HTTPException(
            status_code=409,
            detail=f"Skill already recorded as {existing['source']}; retake assessment to change it",
        )
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        'user_id': user['id'],
        'skill_id': input.skill_id,
        'level': input.level.value,
        'source': SkillSource.SELF_DECLARED.value,
        'updated_at': now,
    }
    await db.trainee_skills.update_one(
        {'user_id': user['id'], 'skill_id': input.skill_id},
        {'$set': payload},
        upsert=True,
    )
    return {k: v for k, v in payload.items() if k != 'user_id'}


# ---- Assessment ------------------------------------------------------------


@api_router.post('/assessment/start', response_model=AssessmentStartResponse)
async def assessment_start(input: AssessmentStartRequest, user: dict[str, Any] = Depends(require_trainee)):
    if not await db.skills.find_one({'id': input.skill_id}, {'_id': 0}):
        raise HTTPException(status_code=400, detail='Invalid skill_id')
    questions = await db.questions.find({'skill_id': input.skill_id}, {'_id': 0}).to_list(200)
    if len(questions) < 3:
        raise HTTPException(status_code=503, detail='Assessment not yet available for this skill')
    questions.sort(key=lambda q: DIFFICULTY_ORDER[q['difficulty']])
    attempt_id = str(uuid.uuid4())
    await db.assessment_attempts.insert_one({
        'id': attempt_id,
        'user_id': user['id'],
        'skill_id': input.skill_id,
        'question_ids': [q['id'] for q in questions],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'submitted_at': None,
        'score': None,
        'max_score': None,
        'percentage': None,
        'proficiency': None,
    })
    return AssessmentStartResponse(
        attempt_id=attempt_id,
        skill_id=input.skill_id,
        questions=[
            AssessmentQuestionPublic(
                id=q['id'], difficulty=q['difficulty'], prompt=q['prompt'], choices=q['choices'],
            )
            for q in questions
        ],
    )


@api_router.post('/assessment/submit')
async def assessment_submit(input: AssessmentSubmitRequest, user: dict[str, Any] = Depends(require_trainee)):
    attempt = await db.assessment_attempts.find_one(
        {'id': input.attempt_id, 'user_id': user['id']}, {'_id': 0},
    )
    if not attempt:
        raise HTTPException(status_code=404, detail='Attempt not found')
    if attempt.get('score') is not None:
        raise HTTPException(status_code=409, detail='Attempt already submitted')
    if len(input.answers) != len(attempt['question_ids']):
        raise HTTPException(status_code=400, detail='Answer count does not match question count')
    q_docs = await db.questions.find(
        {'id': {'$in': attempt['question_ids']}}, {'_id': 0},
    ).to_list(200)
    q_by_id = {q['id']: q for q in q_docs}
    score = 0
    max_score = 0
    breakdown: list[dict] = []
    for qid, ans in zip(attempt['question_ids'], input.answers):
        q = q_by_id[qid]
        weight = DIFFICULTY_WEIGHT[q['difficulty']]
        max_score += weight
        correct = ans == q['correct_index']
        if correct:
            score += weight
        breakdown.append({
            'question_id': qid,
            'difficulty': q['difficulty'],
            'correct': correct,
            'chosen_index': ans,
            'correct_index': q['correct_index'],
            'explanation': q.get('explanation', ''),
        })
    pct = round(100.0 * score / max_score, 1) if max_score else 0.0
    proficiency = calc_proficiency(pct)
    now = datetime.now(timezone.utc).isoformat()
    await db.assessment_attempts.update_one(
        {'id': input.attempt_id},
        {'$set': {
            'answers': input.answers,
            'score': score,
            'max_score': max_score,
            'percentage': pct,
            'proficiency': proficiency.value,
            'submitted_at': now,
        }},
    )
    await db.trainee_skills.update_one(
        {'user_id': user['id'], 'skill_id': attempt['skill_id']},
        {'$set': {
            'user_id': user['id'],
            'skill_id': attempt['skill_id'],
            'level': proficiency.value,
            'source': SkillSource.ASSESSED.value,
            'updated_at': now,
            'last_attempt_id': input.attempt_id,
        }},
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
async def assessment_history(user: dict[str, Any] = Depends(require_trainee)):
    return await db.assessment_attempts.find(
        {'user_id': user['id'], 'score': {'$ne': None}},
        {'_id': 0, 'user_id': 0, 'question_ids': 0, 'answers': 0},
    ).sort('submitted_at', -1).to_list(200)


# ---- Skill gap + recommendations -------------------------------------------


@api_router.get('/trainee/skill-gap')
async def skill_gap(user: dict[str, Any] = Depends(require_trainee)):
    profile = await db.trainee_profiles.find_one({'user_id': user['id']}, {'_id': 0})
    if not profile or not profile.get('career_goal_id'):
        raise HTTPException(status_code=404, detail='Set a career goal to see your skill gap')
    career = await db.careers.find_one({'id': profile['career_goal_id']}, {'_id': 0})
    if not career:
        raise HTTPException(status_code=404, detail='Career not found')
    skills_by_id = {
        s['id']: s for s in
        await db.skills.find(
            {'id': {'$in': [rs['skill_id'] for rs in career['required_skills']]}},
            {'_id': 0},
        ).to_list(200)
    }
    current_by_id = {
        s['skill_id']: s for s in
        await db.trainee_skills.find({'user_id': user['id']}, {'_id': 0}).to_list(500)
    }
    items = []
    matched = 0
    for rs in career['required_skills']:
        cur = current_by_id.get(rs['skill_id'])
        current_level = cur['level'] if cur else 'NONE'
        current_source = cur['source'] if cur else None
        rank_gap = PROFICIENCY_RANK[rs['required_level']] - PROFICIENCY_RANK[current_level]
        if rank_gap <= 0:
            status_label = 'MET'
            matched += 1
        elif current_level == 'NONE':
            status_label = 'NOT_STARTED'
        else:
            status_label = 'GAP'
        items.append({
            'skill_id': rs['skill_id'],
            'skill_name': skills_by_id.get(rs['skill_id'], {}).get('name', rs['skill_id']),
            'required_level': rs['required_level'],
            'current_level': current_level,
            'source': current_source,
            'gap': max(0, rank_gap),
            'status': status_label,
        })
    return {
        'career_id': career['id'],
        'career_name': career['name'],
        'items': items,
        'matched': matched,
        'total': len(items),
    }


@api_router.get('/trainee/recommendations')
async def trainee_recommendations(user: dict[str, Any] = Depends(require_trainee)):
    profile = await db.trainee_profiles.find_one({'user_id': user['id']}, {'_id': 0})
    if not profile or not profile.get('career_goal_id'):
        return {'items': []}
    career = await db.careers.find_one({'id': profile['career_goal_id']}, {'_id': 0})
    if not career:
        return {'items': []}
    current_by_id = {
        s['skill_id']: s for s in
        await db.trainee_skills.find({'user_id': user['id']}, {'_id': 0}).to_list(500)
    }
    gap_ids = []
    for rs in career['required_skills']:
        current_level = current_by_id.get(rs['skill_id'], {}).get('level', 'NONE')
        if PROFICIENCY_RANK[current_level] < PROFICIENCY_RANK[rs['required_level']]:
            gap_ids.append(rs['skill_id'])
    if not gap_ids:
        return {'items': []}
    trainings = await db.trainings.find(
        {'skills.skill_id': {'$in': gap_ids}}, {'_id': 0},
    ).to_list(200)
    name_by_id = {
        s['id']: s['name'] for s in
        await db.skills.find({'id': {'$in': gap_ids}}, {'_id': 0}).to_list(200)
    }
    items = []
    for t in trainings:
        covered = [cs['skill_id'] for cs in t.get('skills', []) if cs['skill_id'] in gap_ids]
        if not covered:
            continue
        names = [name_by_id.get(sid, sid) for sid in covered]
        items.append({
            'training': t,
            'covered_gaps': covered,
            'reason': f"Closes gap in {', '.join(names)}",
        })
    items.sort(key=lambda x: len(x['covered_gaps']), reverse=True)
    return {'items': items[:8]}


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
    headline: str = Field(min_length=2, max_length=120)
    bio: str = Field(default='', max_length=800)
    specializations: List[str] = Field(default_factory=list, max_length=20)
    skill_ids: List[str] = Field(default_factory=list, max_length=30)
    qualifications: str = Field(default='', max_length=300)
    experience_years: int = Field(ge=0, le=60)
    institution: str = Field(default='', max_length=120)
    state_code: str | None = None
    district_code: str | None = None
    availability: str = Field(default='FLEXIBLE', max_length=40)


class TrainingSkillInput(BaseModel):
    skill_id: str
    target_level: Proficiency


class TrainingUpsert(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=1000)
    skills: List[TrainingSkillInput] = Field(min_length=1, max_length=10)
    duration_hours: int = Field(ge=1, le=1000)
    mode: str = Field(default='ONLINE')
    seats: int = Field(ge=1, le=10000)
    status: TrainingStatus = TrainingStatus.PUBLISHED


class SkillVerifyInput(BaseModel):
    skill_id: str
    level: Proficiency
    note: str = Field(default='', max_length=300)


class EnrollmentCreate(BaseModel):
    training_id: str


class EnrollmentCompleteInput(BaseModel):
    trainer_notes: str = Field(default='', max_length=500)


require_trainer = require_roles(Role.TRAINER)
require_admin = require_roles(Role.ADMIN)


async def _validate_skill_ids(skill_ids: List[str]) -> None:
    if not skill_ids:
        return
    unique = list(set(skill_ids))
    found = await db.skills.count_documents({'id': {'$in': unique}})
    if found != len(unique):
        raise HTTPException(status_code=400, detail='One or more skill_ids are invalid')


# ---- Admin approvals -------------------------------------------------------


@api_router.get('/admin/pending-users')
async def admin_pending_users(_user: dict[str, Any] = Depends(require_admin)):
    return await db.users.find(
        {'account_status': AccountStatus.PENDING.value},
        {'_id': 0, 'password_hash': 0},
    ).sort('created_at', 1).to_list(500)


@api_router.get('/admin/users')
async def admin_list_users(status: str | None = None, _user: dict[str, Any] = Depends(require_admin)):
    query = {'account_status': status} if status else {}
    return await db.users.find(query, {'_id': 0, 'password_hash': 0}).sort('created_at', -1).to_list(500)


@api_router.post('/admin/users/{user_id}/approve')
async def admin_approve(user_id: str, _user: dict[str, Any] = Depends(require_admin)):
    target = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')
    if target['role'] == Role.ADMIN.value:
        raise HTTPException(status_code=400, detail='Admin accounts are managed separately')
    if target['account_status'] not in {
        AccountStatus.PENDING.value,
        AccountStatus.REJECTED.value,
        AccountStatus.SUSPENDED.value,
    }:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve account in {target['account_status']} state",
        )
    await db.users.update_one({'id': user_id}, {'$set': {'account_status': AccountStatus.ACTIVE.value}})
    return {'user_id': user_id, 'account_status': AccountStatus.ACTIVE.value}


@api_router.post('/admin/users/{user_id}/reject')
async def admin_reject(user_id: str, _user: dict[str, Any] = Depends(require_admin)):
    target = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')
    if target['role'] == Role.ADMIN.value:
        raise HTTPException(status_code=400, detail='Admin accounts are managed separately')
    await db.users.update_one({'id': user_id}, {'$set': {'account_status': AccountStatus.REJECTED.value}})
    return {'user_id': user_id, 'account_status': AccountStatus.REJECTED.value}


# ---- Trainer profile -------------------------------------------------------


@api_router.get('/trainer/profile')
async def trainer_profile(user: dict[str, Any] = Depends(require_trainer)):
    return await db.trainer_profiles.find_one({'user_id': user['id']}, {'_id': 0})


@api_router.post('/trainer/profile')
async def upsert_trainer_profile(input: TrainerProfileUpsert, user: dict[str, Any] = Depends(require_trainer)):
    await _validate_skill_ids(input.skill_ids)
    now = datetime.now(timezone.utc).isoformat()
    payload = {**input.model_dump(), 'user_id': user['id'], 'updated_at': now}
    await db.trainer_profiles.update_one(
        {'user_id': user['id']},
        {'$set': payload, '$setOnInsert': {'created_at': now}},
        upsert=True,
    )
    await db.users.update_one({'id': user['id']}, {'$set': {
        'profile_complete': True,
        'state_code': input.state_code,
        'district_code': input.district_code,
    }})
    return {**payload, 'created_at': now}


# ---- Trainer trainings -----------------------------------------------------


@api_router.get('/trainer/trainings')
async def trainer_trainings(user: dict[str, Any] = Depends(require_trainer)):
    return await db.trainings.find(
        {'provider_user_id': user['id']}, {'_id': 0},
    ).sort('created_at', -1).to_list(200)


@api_router.post('/trainer/trainings', status_code=201)
async def create_training(input: TrainingUpsert, user: dict[str, Any] = Depends(require_trainer)):
    await _validate_skill_ids([s.skill_id for s in input.skills])
    now = datetime.now(timezone.utc).isoformat()
    prof = await db.trainer_profiles.find_one({'user_id': user['id']}, {'_id': 0})
    doc = {
        'id': str(uuid.uuid4()),
        'title': input.title.strip(),
        'description': input.description.strip(),
        'skills': [s.model_dump() for s in input.skills],
        'duration_hours': input.duration_hours,
        'mode': input.mode,
        'seats': input.seats,
        'provider': (prof or {}).get('institution') or user['full_name'],
        'provider_user_id': user['id'],
        'status': input.status.value,
        'is_sample': False,
        'created_at': now,
        'updated_at': now,
    }
    await db.trainings.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api_router.patch('/trainer/trainings/{training_id}')
async def update_training(training_id: str, input: TrainingUpsert, user: dict[str, Any] = Depends(require_trainer)):
    existing = await db.trainings.find_one(
        {'id': training_id, 'provider_user_id': user['id']}, {'_id': 0},
    )
    if not existing:
        raise HTTPException(status_code=404, detail='Training not found')
    await _validate_skill_ids([s.skill_id for s in input.skills])
    payload = {
        'title': input.title.strip(),
        'description': input.description.strip(),
        'skills': [s.model_dump() for s in input.skills],
        'duration_hours': input.duration_hours,
        'mode': input.mode,
        'seats': input.seats,
        'status': input.status.value,
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.trainings.update_one({'id': training_id}, {'$set': payload})
    return {**existing, **payload}


# ---- Trainee enrollments ---------------------------------------------------


@api_router.get('/trainee/enrollments')
async def list_trainee_enrollments(user: dict[str, Any] = Depends(require_trainee)):
    enrolls = await db.enrollments.find(
        {'trainee_user_id': user['id']}, {'_id': 0},
    ).sort('enrolled_at', -1).to_list(200)
    if not enrolls:
        return []
    training_ids = list({e['training_id'] for e in enrolls})
    trainings_by_id = {
        t['id']: t for t in
        await db.trainings.find({'id': {'$in': training_ids}}, {'_id': 0}).to_list(200)
    }
    for e in enrolls:
        e['training'] = trainings_by_id.get(e['training_id'])
    return enrolls


@api_router.post('/trainee/enrollments', status_code=201)
async def create_enrollment(input: EnrollmentCreate, user: dict[str, Any] = Depends(require_trainee)):
    training = await db.trainings.find_one({'id': input.training_id}, {'_id': 0})
    if not training:
        raise HTTPException(status_code=404, detail='Training not found')
    if training.get('status') == TrainingStatus.CLOSED.value:
        raise HTTPException(status_code=400, detail='Training is closed for new enrollments')
    existing = await db.enrollments.find_one(
        {'trainee_user_id': user['id'], 'training_id': input.training_id}, {'_id': 0},
    )
    if existing and existing['status'] != EnrollmentStatus.DROPPED.value:
        raise HTTPException(status_code=409, detail=f"Already enrolled ({existing['status']})")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        'id': str(uuid.uuid4()),
        'trainee_user_id': user['id'],
        'training_id': input.training_id,
        'trainer_user_id': training.get('provider_user_id'),
        'status': EnrollmentStatus.ENROLLED.value,
        'enrolled_at': now,
        'completed_at': None,
        'trainer_notes': '',
        'verified_skills': [],
    }
    await db.enrollments.insert_one(doc)
    doc.pop('_id', None)
    return doc


# ---- Trainer enrollments + verification ------------------------------------


@api_router.get('/trainer/enrollments')
async def list_trainer_enrollments(user: dict[str, Any] = Depends(require_trainer)):
    trainings = await db.trainings.find(
        {'provider_user_id': user['id']}, {'_id': 0},
    ).to_list(500)
    training_ids = [t['id'] for t in trainings]
    if not training_ids:
        return []
    enrolls = await db.enrollments.find(
        {'training_id': {'$in': training_ids}}, {'_id': 0},
    ).sort('enrolled_at', -1).to_list(500)
    if not enrolls:
        return []
    trainings_by_id = {t['id']: t for t in trainings}
    trainee_ids = list({e['trainee_user_id'] for e in enrolls})
    trainees_by_id = {
        u['id']: u for u in await db.users.find(
            {'id': {'$in': trainee_ids}}, {'_id': 0, 'password_hash': 0},
        ).to_list(500)
    }
    for e in enrolls:
        e['training'] = trainings_by_id.get(e['training_id'])
        t = trainees_by_id.get(e['trainee_user_id']) or {}
        e['trainee'] = {
            'id': t.get('id'),
            'full_name': t.get('full_name'),
            'email': t.get('email'),
            'state_code': t.get('state_code'),
            'district_code': t.get('district_code'),
        }
    return enrolls


@api_router.post('/trainer/enrollments/{enrollment_id}/verify-skill')
async def trainer_verify_skill(
    enrollment_id: str,
    input: SkillVerifyInput,
    user: dict[str, Any] = Depends(require_trainer),
):
    enroll = await db.enrollments.find_one({'id': enrollment_id}, {'_id': 0})
    if not enroll:
        raise HTTPException(status_code=404, detail='Enrollment not found')
    training = await db.trainings.find_one({'id': enroll['training_id']}, {'_id': 0})
    if not training or training.get('provider_user_id') != user['id']:
        raise HTTPException(status_code=403, detail='You do not own this training')
    covered_ids = {s['skill_id'] for s in training.get('skills', [])}
    if input.skill_id not in covered_ids:
        raise HTTPException(status_code=400, detail='Skill is not covered by this training')
    now = datetime.now(timezone.utc).isoformat()
    verified_entry = {
        'skill_id': input.skill_id,
        'level': input.level.value,
        'note': input.note,
        'verified_at': now,
        'trainer_user_id': user['id'],
    }
    await db.enrollments.update_one(
        {'id': enrollment_id},
        {'$pull': {'verified_skills': {'skill_id': input.skill_id}}},
    )
    await db.enrollments.update_one(
        {'id': enrollment_id},
        {'$push': {'verified_skills': verified_entry}},
    )
    await db.trainee_skills.update_one(
        {'user_id': enroll['trainee_user_id'], 'skill_id': input.skill_id},
        {'$set': {
            'user_id': enroll['trainee_user_id'],
            'skill_id': input.skill_id,
            'level': input.level.value,
            'source': SkillSource.TRAINER_VERIFIED.value,
            'updated_at': now,
            'verified_by': user['id'],
        }},
        upsert=True,
    )
    return {'enrollment_id': enrollment_id, 'verified': verified_entry}


@api_router.post('/trainer/enrollments/{enrollment_id}/complete')
async def trainer_complete_enrollment(
    enrollment_id: str,
    input: EnrollmentCompleteInput,
    user: dict[str, Any] = Depends(require_trainer),
):
    enroll = await db.enrollments.find_one({'id': enrollment_id}, {'_id': 0})
    if not enroll:
        raise HTTPException(status_code=404, detail='Enrollment not found')
    training = await db.trainings.find_one({'id': enroll['training_id']}, {'_id': 0})
    if not training or training.get('provider_user_id') != user['id']:
        raise HTTPException(status_code=403, detail='You do not own this training')
    now = datetime.now(timezone.utc).isoformat()
    await db.enrollments.update_one(
        {'id': enrollment_id},
        {'$set': {
            'status': EnrollmentStatus.COMPLETED.value,
            'completed_at': now,
            'trainer_notes': input.trainer_notes,
        }},
    )
    return {'enrollment_id': enrollment_id, 'status': EnrollmentStatus.COMPLETED.value, 'completed_at': now}







# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event('startup')
async def ensure_indexes():
    await db.users.create_index('email', unique=True)
    await db.trainee_profiles.create_index('user_id', unique=True)
    await db.trainee_skills.create_index([('user_id', 1), ('skill_id', 1)], unique=True)
    await db.assessment_attempts.create_index('user_id')
    await db.skills.create_index('id', unique=True)
    await db.careers.create_index('id', unique=True)
    await db.questions.create_index([('skill_id', 1), ('difficulty', 1)])
    await db.trainings.create_index('id', unique=True)
    await db.trainings.create_index('provider_user_id')
    await db.trainer_profiles.create_index('user_id', unique=True)
    await db.enrollments.create_index([('trainee_user_id', 1), ('training_id', 1)])
    await db.enrollments.create_index('training_id')


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
