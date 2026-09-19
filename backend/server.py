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
        if input.role in {Role.EMPLOYER, Role.GOVERNMENT}
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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
