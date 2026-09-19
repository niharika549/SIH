"""Phase 2 Trainee MVP backend tests.

Covers: catalog, profile CRUD, self-declared skills, assessment flow,
scoring boundaries, skill-gap, recommendations, RBAC.

Uses the public preview URL (EXPO_PUBLIC_BACKEND_URL from frontend/.env
or EXPO_BACKEND_URL) since that is what the mobile client hits.
"""
import os
import uuid
import time
import pytest
import requests

# Prefer explicit EXPO_BACKEND_URL, else fall back to frontend/.env public url
BASE_URL = (
    os.environ.get('EXPO_BACKEND_URL')
    or os.environ.get('EXPO_PUBLIC_BACKEND_URL')
    or 'https://labor-match-9.preview.emergentagent.com'
).rstrip('/')

API = f"{BASE_URL}/api"

ADMIN = ('admin@skillalign.in', 'SkillAlign@Admin2026')
# We will register a NEW trainee for isolation (do NOT reset trainee.test)
TIMEOUT = 20


# ---------- helpers ---------------------------------------------------------

def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={'email': email, 'password': password}, timeout=TIMEOUT)
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    return r.json()['access_token']


def _register_trainee():
    email = f"test_p2_{uuid.uuid4().hex[:8]}@skillalign.in"
    password = "Trainee@Test2026"
    r = requests.post(f"{API}/auth/register", json={
        'full_name': 'Phase2 Test User',
        'email': email,
        'password': password,
        'role': 'TRAINEE',
    }, timeout=TIMEOUT)
    assert r.status_code == 201, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return email, password, data['access_token'], data['user']['id']


def _h(token):
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


# ---------- session-scoped fixtures ----------------------------------------

@pytest.fixture(scope='session')
def trainee():
    email, password, token, uid = _register_trainee()
    yield {'email': email, 'password': password, 'token': token, 'uid': uid}
    # cleanup handled by cleanup fixture below


@pytest.fixture(scope='session')
def admin_token():
    return _login(*ADMIN)


@pytest.fixture(scope='session', autouse=True)
def _cleanup(trainee):
    yield
    # Best-effort delete via direct Mongo (localhost)
    try:
        from pymongo import MongoClient
        from dotenv import load_dotenv
        load_dotenv('/app/backend/.env')
        mc = MongoClient(os.environ['MONGO_URL'])
        db = mc[os.environ['DB_NAME']]
        uid = trainee['uid']
        db.trainee_profiles.delete_many({'user_id': uid})
        db.trainee_skills.delete_many({'user_id': uid})
        db.assessment_attempts.delete_many({'user_id': uid})
        db.users.delete_many({'id': uid})
        mc.close()
    except Exception as e:
        print(f"cleanup warning: {e}")


# ---------- catalog ---------------------------------------------------------

class TestCatalog:
    def test_skills_count_10(self, trainee):
        r = requests.get(f"{API}/catalog/skills", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 10, f"expected 10 skills, got {len(data)}"
        assert all('id' in s and 'name' in s for s in data)

    def test_careers_count_4(self, trainee):
        r = requests.get(f"{API}/catalog/careers", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert r.status_code == 200
        assert len(r.json()) == 4

    def test_fullstack_expands_skill_name(self, trainee):
        r = requests.get(f"{API}/catalog/careers/career-fullstack", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert r.status_code == 200
        data = r.json()
        assert data['id'] == 'career-fullstack'
        req = data['required_skills']
        assert len(req) == 6
        for rs in req:
            assert 'skill_id' in rs and 'required_level' in rs and 'skill_name' in rs
            assert rs['skill_name'] and rs['skill_name'] != rs['skill_id']


# ---------- profile ---------------------------------------------------------

class TestProfile:
    def test_invalid_career_goal_400(self, trainee):
        r = requests.post(f"{API}/trainee/profile", headers=_h(trainee['token']), json={
            'category': 'STUDENT',
            'category_details': {'institution': 'X', 'degree': 'BE', 'branch': 'CS'},
            'career_goal_id': 'nope-does-not-exist',
        }, timeout=TIMEOUT)
        assert r.status_code == 400

    def test_student_profile_flips_complete(self, trainee):
        r = requests.post(f"{API}/trainee/profile", headers=_h(trainee['token']), json={
            'category': 'STUDENT',
            'category_details': {
                'institution': 'IIT Bombay', 'degree': 'BE', 'branch': 'CS',
                'graduation_year': 2027,
            },
            'career_goal_id': 'career-fullstack',
            'state_code': 'MH', 'district_code': 'MH-MUM',
        }, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        # verify /auth/me shows profile_complete=true
        me = requests.get(f"{API}/auth/me", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert me.status_code == 200
        assert me.json()['profile_complete'] is True
        assert me.json()['state_code'] == 'MH'

    def test_job_holder_profile(self, trainee):
        r = requests.post(f"{API}/trainee/profile", headers=_h(trainee['token']), json={
            'category': 'JOB_HOLDER',
            'category_details': {
                'organization': 'Acme', 'job_title': 'Analyst',
                'experience_years': 3, 'advancement_goal': 'Data role',
            },
            'career_goal_id': 'career-data-analyst',
        }, timeout=TIMEOUT)
        assert r.status_code == 200
        g = requests.get(f"{API}/trainee/profile", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert g.status_code == 200
        assert g.json()['category'] == 'JOB_HOLDER'

    def test_career_gap_profile(self, trainee):
        r = requests.post(f"{API}/trainee/profile", headers=_h(trainee['token']), json={
            'category': 'CAREER_GAP',
            'category_details': {
                'previous_role': 'Dev', 'gap_duration': '18mo',
                'reentry_path': 'Frontend', 'training_needs': 'React',
            },
            'career_goal_id': 'career-frontend',
        }, timeout=TIMEOUT)
        assert r.status_code == 200
        # reset to fullstack for downstream tests
        requests.post(f"{API}/trainee/profile", headers=_h(trainee['token']), json={
            'category': 'STUDENT',
            'category_details': {'institution': 'IIT Bombay', 'degree': 'BE', 'branch': 'CS'},
            'career_goal_id': 'career-fullstack',
            'state_code': 'MH', 'district_code': 'MH-MUM',
        }, timeout=TIMEOUT)


# ---------- skills self-declared -------------------------------------------

class TestSelfDeclaredSkills:
    def test_self_declare_and_list(self, trainee):
        r = requests.post(f"{API}/trainee/skills", headers=_h(trainee['token']), json={
            'skill_id': 'skill-git', 'level': 'BEGINNER',
        }, timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()['source'] == 'SELF_DECLARED'
        g = requests.get(f"{API}/trainee/skills", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert g.status_code == 200
        skills = g.json()
        assert any(s['skill_id'] == 'skill-git' for s in skills)


# ---------- assessment ------------------------------------------------------

class TestAssessment:
    def test_start_invalid_skill_400(self, trainee):
        r = requests.post(f"{API}/assessment/start", headers=_h(trainee['token']),
                          json={'skill_id': 'not-a-skill'}, timeout=TIMEOUT)
        assert r.status_code == 400

    def test_start_returns_5_sorted(self, trainee):
        r = requests.post(f"{API}/assessment/start", headers=_h(trainee['token']),
                          json={'skill_id': 'skill-python'}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data['skill_id'] == 'skill-python'
        assert 'attempt_id' in data
        qs = data['questions']
        assert len(qs) == 5
        order_rank = {'BEGINNER': 0, 'INTERMEDIATE': 1, 'ADVANCED': 2}
        ranks = [order_rank[q['difficulty']] for q in qs]
        assert ranks == sorted(ranks), f"questions not sorted by difficulty: {ranks}"

    def test_submit_all_correct_advanced_and_overrides_self_declared(self, trainee):
        # First self-declare skill-python at BEGINNER
        requests.post(f"{API}/trainee/skills", headers=_h(trainee['token']),
                      json={'skill_id': 'skill-python', 'level': 'BEGINNER'}, timeout=TIMEOUT)
        # start
        s = requests.post(f"{API}/assessment/start", headers=_h(trainee['token']),
                          json={'skill_id': 'skill-python'}, timeout=TIMEOUT)
        assert s.status_code == 200
        data = s.json()
        # correct answers: q-py-1=1, q-py-2=1, q-py-3=2, q-py-4=0, q-py-5=1
        answer_by_id = {
            'q-py-1': 1, 'q-py-2': 1, 'q-py-3': 2, 'q-py-4': 0, 'q-py-5': 1,
        }
        answers = [answer_by_id[q['id']] for q in data['questions']]
        sub = requests.post(f"{API}/assessment/submit", headers=_h(trainee['token']),
                            json={'attempt_id': data['attempt_id'], 'answers': answers}, timeout=TIMEOUT)
        assert sub.status_code == 200, sub.text
        r = sub.json()
        # Weighted max = 1+1+2+2+3 = 9
        assert r['max_score'] == 9
        assert r['score'] == 9
        assert r['percentage'] == 100.0
        assert r['proficiency'] == 'ADVANCED'
        assert len(r['breakdown']) == 5
        # verify trainee_skills override
        g = requests.get(f"{API}/trainee/skills", headers=_h(trainee['token']), timeout=TIMEOUT)
        py = next(s for s in g.json() if s['skill_id'] == 'skill-python')
        assert py['source'] == 'ASSESSED'
        assert py['level'] == 'ADVANCED'
        # store attempt id for later resubmit test
        pytest._py_attempt_id = data['attempt_id']

    def test_resubmit_same_attempt_409(self, trainee):
        aid = getattr(pytest, '_py_attempt_id', None)
        if not aid:
            pytest.skip('prev test did not set attempt id')
        r = requests.post(f"{API}/assessment/submit", headers=_h(trainee['token']),
                          json={'attempt_id': aid, 'answers': [0, 0, 0, 0, 0]}, timeout=TIMEOUT)
        assert r.status_code == 409

    def test_declaring_assessed_skill_409(self, trainee):
        # skill-python is ASSESSED now, try to self-declare
        r = requests.post(f"{API}/trainee/skills", headers=_h(trainee['token']),
                          json={'skill_id': 'skill-python', 'level': 'BEGINNER'}, timeout=TIMEOUT)
        assert r.status_code == 409

    def test_wrong_answer_count_400(self, trainee):
        s = requests.post(f"{API}/assessment/start", headers=_h(trainee['token']),
                          json={'skill_id': 'skill-sql'}, timeout=TIMEOUT)
        assert s.status_code == 200
        aid = s.json()['attempt_id']
        r = requests.post(f"{API}/assessment/submit", headers=_h(trainee['token']),
                          json={'attempt_id': aid, 'answers': [0, 0]}, timeout=TIMEOUT)
        assert r.status_code == 400

    def test_retake_creates_new_attempt(self, trainee):
        # Retake python — new attempt id, new score
        s = requests.post(f"{API}/assessment/start", headers=_h(trainee['token']),
                          json={'skill_id': 'skill-python'}, timeout=TIMEOUT)
        assert s.status_code == 200
        new_aid = s.json()['attempt_id']
        assert new_aid != getattr(pytest, '_py_attempt_id', None)
        # submit all wrong -> NONE
        answers = [0] * 5  # deliberately unmapped-to-correct
        # ensure at least one differs from correct: choose non-correct-index by picking 3 (usually wrong)
        answers = [3, 3, 3, 3, 3]
        r = requests.post(f"{API}/assessment/submit", headers=_h(trainee['token']),
                          json={'attempt_id': new_aid, 'answers': answers}, timeout=TIMEOUT)
        assert r.status_code == 200
        j = r.json()
        assert j['proficiency'] == 'NONE'
        assert j['score'] == 0

    def test_middle_band_intermediate(self, trainee):
        # skill-sql: correct answers q-sql-1=1, q-sql-2=2, q-sql-3=1, q-sql-4=1, q-sql-5=2
        # Weights: 1,1,2,2,3 = 9 total.
        # Score exactly 5/9 = 55.5% -> INTERMEDIATE (50-74%).
        # Answer both BEGINNER correct + one INTERMEDIATE correct + wrong on rest: 1+1+2 = 4/9 -> BEGINNER
        # Answer 1 BEG + both INT + wrong ADV: 1+2+2 = 5/9 -> INTERMEDIATE (~55.5%)
        s = requests.post(f"{API}/assessment/start", headers=_h(trainee['token']),
                          json={'skill_id': 'skill-sql'}, timeout=TIMEOUT)
        aid = s.json()['attempt_id']
        qs = s.json()['questions']
        correct = {'q-sql-1': 1, 'q-sql-2': 2, 'q-sql-3': 1, 'q-sql-4': 1, 'q-sql-5': 2}
        answers = []
        # target: skip q-sql-1 (BEG) wrong, q-sql-2 (BEG) correct, both INT correct, ADV wrong
        pick = {'q-sql-1': 0, 'q-sql-2': correct['q-sql-2'], 'q-sql-3': correct['q-sql-3'],
                'q-sql-4': correct['q-sql-4'], 'q-sql-5': 0}
        answers = [pick[q['id']] for q in qs]
        r = requests.post(f"{API}/assessment/submit", headers=_h(trainee['token']),
                          json={'attempt_id': aid, 'answers': answers}, timeout=TIMEOUT)
        assert r.status_code == 200
        j = r.json()
        # expected weighted score = 1 (q-sql-2 BEG) + 2 (q-sql-3 INT) + 2 (q-sql-4 INT) = 5
        assert j['score'] == 5
        assert j['max_score'] == 9
        assert 50 <= j['percentage'] < 75
        assert j['proficiency'] == 'INTERMEDIATE'


# ---------- skill-gap + recommendations ------------------------------------

class TestSkillGap:
    def test_skill_gap_shape(self, trainee):
        r = requests.get(f"{API}/trainee/skill-gap", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert r.status_code == 200
        data = r.json()
        assert data['career_id'] == 'career-fullstack'
        assert 'matched' in data and 'total' in data
        assert data['total'] == 6
        for item in data['items']:
            assert {'skill_id', 'skill_name', 'required_level', 'current_level',
                    'source', 'status'} <= set(item.keys())
            assert item['status'] in {'MET', 'GAP', 'NOT_STARTED'}

    def test_recommendations_present(self, trainee):
        r = requests.get(f"{API}/trainee/recommendations", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert r.status_code == 200
        data = r.json()
        # Fullstack has JS, React, Node, SQL, HTML/CSS, Git — mostly unlearned -> should have items
        assert 'items' in data
        assert len(data['items']) > 0
        first = data['items'][0]
        assert 'training' in first and 'covered_gaps' in first and 'reason' in first
        assert first['covered_gaps']


# ---------- RBAC ------------------------------------------------------------

class TestRBAC:
    def test_admin_blocked_from_trainee(self, admin_token):
        r = requests.get(f"{API}/trainee/profile", headers=_h(admin_token), timeout=TIMEOUT)
        assert r.status_code == 403

    def test_unauth_trainee_401(self):
        r = requests.get(f"{API}/trainee/profile", timeout=TIMEOUT)
        assert r.status_code == 401

    def test_admin_blocked_from_skills(self, admin_token):
        r = requests.get(f"{API}/trainee/skills", headers=_h(admin_token), timeout=TIMEOUT)
        assert r.status_code == 403
