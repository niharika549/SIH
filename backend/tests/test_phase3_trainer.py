"""Phase 3 Trainer Portal + Admin approval workflow backend tests.

Covers:
- Trainer registration -> PENDING -> admin approve/reject -> login gating
- Admin RBAC on /admin/* (403 wrong role, 401 unauthenticated)
- Trainer profile upsert + validation + profile_complete flip
- Trainer trainings CRUD scoping (own only), status lifecycle, skill validation
- Trainee enrollments (201/409/400/404) with embedded training
- Trainer learners list (own trainings only, embedded trainee)
- Skill verification (covered/uncovered/owner checks, TRAINER_VERIFIED upsert,
  re-verify replaces entry, overrides SELF_DECLARED/ASSESSED)
- Enrollment completion (owner only)
- Light Phase 1+2 regression (health, catalog, skill-gap with TRAINER_VERIFIED)

Run serially:  pytest tests/test_phase3_trainer.py -v -n 0
(session-scoped fixtures do not survive xdist worker splits)
"""
import os
import uuid
import pytest
import requests

BASE_URL = (
    os.environ.get('EXPO_BACKEND_URL')
    or os.environ.get('EXPO_PUBLIC_BACKEND_URL')
    or 'https://labor-match-9.preview.emergentagent.com'
).rstrip('/')
API = f"{BASE_URL}/api"
TIMEOUT = 20

ADMIN = ('admin@skillalign.in', 'SkillAlign@Admin2026')


# ---------- helpers ---------------------------------------------------------

def _h(token):
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={'email': email, 'password': password}, timeout=TIMEOUT)
    assert r.status_code == 200, f"login {email} failed {r.status_code} {r.text}"
    return r.json()['access_token']


def _register(role, name):
    email = f"test_p3_{uuid.uuid4().hex[:8]}@skillalign.in"
    password = "TestP3@Pass2026"
    r = requests.post(f"{API}/auth/register", json={
        'full_name': name, 'email': email, 'password': password, 'role': role,
    }, timeout=TIMEOUT)
    assert r.status_code == 201, f"register {role} failed: {r.status_code} {r.text}"
    return email, password, r.json()


# ---------- session fixtures ------------------------------------------------

@pytest.fixture(scope='session')
def admin_token():
    return _login(*ADMIN)


@pytest.fixture(scope='session')
def trainer_a():
    """Fresh trainer, starts PENDING. Approved later by the approval-flow tests."""
    email, password, data = _register('TRAINER', 'Phase3 Trainer A')
    return {
        'email': email, 'password': password, 'uid': data['user']['id'],
        'reg': data, 'token': None,
    }


@pytest.fixture(scope='session')
def trainer_b(admin_token):
    """Second trainer, pre-approved, used for cross-trainer isolation checks."""
    email, password, data = _register('TRAINER', 'Phase3 Trainer B')
    uid = data['user']['id']
    r = requests.post(f"{API}/admin/users/{uid}/approve", headers=_h(admin_token), timeout=TIMEOUT)
    assert r.status_code == 200, f"approve trainer_b failed: {r.status_code} {r.text}"
    return {'email': email, 'password': password, 'uid': uid, 'token': _login(email, password)}


@pytest.fixture(scope='session')
def trainee():
    """Fresh trainee (auto-ACTIVE). Completes profile with career-fullstack."""
    email, password, data = _register('TRAINEE', 'Phase3 Trainee')
    t = {'email': email, 'password': password, 'uid': data['user']['id'], 'token': data['access_token']}
    r = requests.post(f"{API}/trainee/profile", headers=_h(t['token']), json={
        'category': 'STUDENT',
        'category_details': {'institution': 'Test Inst', 'degree': 'BTech'},
        'career_goal_id': 'career-fullstack',
        'state_code': 'MH', 'district_code': 'MH-MUM',
    }, timeout=TIMEOUT)
    assert r.status_code == 200, f"trainee profile failed: {r.status_code} {r.text}"
    return t


@pytest.fixture(scope='session', autouse=True)
def _cleanup(trainer_a, trainer_b, trainee):
    yield
    try:
        from pymongo import MongoClient
        from dotenv import load_dotenv
        load_dotenv('/app/backend/.env')
        mc = MongoClient(os.environ['MONGO_URL'])
        db = mc[os.environ['DB_NAME']]
        uids = [trainer_a['uid'], trainer_b['uid'], trainee['uid']]
        # also sweep any rejected-trainer users created by the tests
        extra = [u['id'] for u in db.users.find({'email': {'$regex': '^test_p3_'}}, {'id': 1})]
        uids = list(set(uids + extra))
        db.users.delete_many({'id': {'$in': uids}})
        db.trainer_profiles.delete_many({'user_id': {'$in': uids}})
        db.trainee_profiles.delete_many({'user_id': {'$in': uids}})
        db.trainee_skills.delete_many({'user_id': {'$in': uids}})
        db.assessment_attempts.delete_many({'user_id': {'$in': uids}})
        db.trainings.delete_many({'provider_user_id': {'$in': uids}})
        db.enrollments.delete_many({'$or': [
            {'trainee_user_id': {'$in': uids}}, {'trainer_user_id': {'$in': uids}},
        ]})
        mc.close()
    except Exception as e:
        print(f"cleanup warning: {e}")


# ---------- registration + admin approval flow ------------------------------

class TestRegistrationApprovalFlow:
    def test_register_trainer_pending_no_token(self, trainer_a):
        reg = trainer_a['reg']
        assert reg['user']['account_status'] == 'PENDING'
        assert reg['user']['role'] == 'TRAINER'
        assert reg.get('access_token') is None
        assert reg.get('message'), "expected pending notice message"

    def test_login_while_pending_403(self, trainer_a):
        r = requests.post(f"{API}/auth/login",
                          json={'email': trainer_a['email'], 'password': trainer_a['password']},
                          timeout=TIMEOUT)
        assert r.status_code == 403
        assert 'pending' in r.json()['detail'].lower()

    def test_pending_listed_for_admin(self, admin_token, trainer_a):
        r = requests.get(f"{API}/admin/pending-users", headers=_h(admin_token), timeout=TIMEOUT)
        assert r.status_code == 200
        ids = [u['id'] for u in r.json()]
        assert trainer_a['uid'] in ids
        assert all(u['account_status'] == 'PENDING' for u in r.json())
        assert all('password_hash' not in u for u in r.json())

    def test_approve_activates_and_login_works(self, admin_token, trainer_a):
        r = requests.post(f"{API}/admin/users/{trainer_a['uid']}/approve",
                          headers=_h(admin_token), timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()['account_status'] == 'ACTIVE'
        trainer_a['token'] = _login(trainer_a['email'], trainer_a['password'])

    def test_approve_already_active_400(self, admin_token, trainer_a):
        r = requests.post(f"{API}/admin/users/{trainer_a['uid']}/approve",
                          headers=_h(admin_token), timeout=TIMEOUT)
        assert r.status_code == 400

    def test_reject_blocks_login(self, admin_token):
        email, password, data = _register('TRAINER', 'Phase3 Reject Me')
        uid = data['user']['id']
        r = requests.post(f"{API}/admin/users/{uid}/reject", headers=_h(admin_token), timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()['account_status'] == 'REJECTED'
        r2 = requests.post(f"{API}/auth/login", json={'email': email, 'password': password}, timeout=TIMEOUT)
        assert r2.status_code == 403
        assert 'rejected' in r2.json()['detail'].lower()

    def test_approve_unknown_user_404(self, admin_token):
        r = requests.post(f"{API}/admin/users/{uuid.uuid4()}/approve",
                          headers=_h(admin_token), timeout=TIMEOUT)
        assert r.status_code == 404


# ---------- admin RBAC ------------------------------------------------------

class TestAdminRBAC:
    def test_unauthenticated_401(self):
        r = requests.get(f"{API}/admin/pending-users", timeout=TIMEOUT)
        assert r.status_code == 401

    def test_trainee_token_403(self, trainee):
        r = requests.get(f"{API}/admin/pending-users", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert r.status_code == 403

    def test_trainer_token_403(self, trainer_a):
        r = requests.get(f"{API}/admin/pending-users", headers=_h(trainer_a['token']), timeout=TIMEOUT)
        assert r.status_code == 403

    def test_trainee_cannot_approve(self, trainee, trainer_a):
        r = requests.post(f"{API}/admin/users/{trainer_a['uid']}/approve",
                          headers=_h(trainee['token']), timeout=TIMEOUT)
        assert r.status_code == 403


# ---------- trainer profile -------------------------------------------------

class TestTrainerProfile:
    def test_initial_profile_empty(self, trainer_a):
        r = requests.get(f"{API}/trainer/profile", headers=_h(trainer_a['token']), timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json() is None

    def test_short_headline_rejected(self, trainer_a):
        r = requests.post(f"{API}/trainer/profile", headers=_h(trainer_a['token']), json={
            'headline': 'x', 'experience_years': 3,
        }, timeout=TIMEOUT)
        assert r.status_code in (400, 422)

    def test_invalid_skill_ids_400(self, trainer_a):
        r = requests.post(f"{API}/trainer/profile", headers=_h(trainer_a['token']), json={
            'headline': 'Full-stack mentor', 'experience_years': 5,
            'skill_ids': ['skill-does-not-exist'],
        }, timeout=TIMEOUT)
        assert r.status_code == 400

    def test_upsert_and_readback_and_profile_complete(self, trainer_a):
        r = requests.post(f"{API}/trainer/profile", headers=_h(trainer_a['token']), json={
            'headline': 'Full-stack mentor, 8 yrs in product',
            'bio': 'Teaches modern web development with testing.',
            'institution': 'SkillAlign Test Academy',
            'qualifications': 'B.Tech CSE',
            'experience_years': 8,
            'skill_ids': ['skill-react', 'skill-javascript'],
        }, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body['headline'] == 'Full-stack mentor, 8 yrs in product'
        assert body['skill_ids'] == ['skill-react', 'skill-javascript']
        g = requests.get(f"{API}/trainer/profile", headers=_h(trainer_a['token']), timeout=TIMEOUT)
        assert g.status_code == 200
        assert g.json()['institution'] == 'SkillAlign Test Academy'
        me = requests.get(f"{API}/auth/me", headers=_h(trainer_a['token']), timeout=TIMEOUT)
        assert me.json()['profile_complete'] is True

    def test_trainee_cannot_write_trainer_profile(self, trainee):
        r = requests.post(f"{API}/trainer/profile", headers=_h(trainee['token']), json={
            'headline': 'Nope', 'experience_years': 1,
        }, timeout=TIMEOUT)
        assert r.status_code == 403


# ---------- trainings -------------------------------------------------------

class TestTrainings:
    def test_create_training_published_scoped(self, trainer_a):
        r = requests.post(f"{API}/trainer/trainings", headers=_h(trainer_a['token']), json={
            'title': 'React Zero to Hero (TEST_P3)',
            'description': 'Hands-on React with hooks, routing and testing.',
            'skills': [
                {'skill_id': 'skill-react', 'target_level': 'INTERMEDIATE'},
                {'skill_id': 'skill-javascript', 'target_level': 'ADVANCED'},
            ],
            'duration_hours': 40, 'mode': 'ONLINE', 'seats': 25,
        }, timeout=TIMEOUT)
        assert r.status_code == 201, r.text
        t = r.json()
        assert t['provider_user_id'] == trainer_a['uid']
        assert t['status'] == 'PUBLISHED'
        assert t['is_sample'] is False
        assert '_id' not in t
        trainer_a['training'] = t

    def test_create_training_invalid_skill_400(self, trainer_a):
        r = requests.post(f"{API}/trainer/trainings", headers=_h(trainer_a['token']), json={
            'title': 'Bad Skill Training', 'description': 'Should fail validation.',
            'skills': [{'skill_id': 'skill-nope', 'target_level': 'BEGINNER'}],
            'duration_hours': 10, 'seats': 10,
        }, timeout=TIMEOUT)
        assert r.status_code == 400

    def test_list_returns_only_own(self, trainer_a, trainer_b):
        r_b = requests.post(f"{API}/trainer/trainings", headers=_h(trainer_b['token']), json={
            'title': 'Python by Trainer B (TEST_P3)',
            'description': 'Trainer B private training for isolation check.',
            'skills': [{'skill_id': 'skill-python', 'target_level': 'BEGINNER'}],
            'duration_hours': 12, 'seats': 15,
        }, timeout=TIMEOUT)
        assert r_b.status_code == 201
        trainer_b['training'] = r_b.json()
        ra = requests.get(f"{API}/trainer/trainings", headers=_h(trainer_a['token']), timeout=TIMEOUT)
        assert ra.status_code == 200
        a_ids = [t['id'] for t in ra.json()]
        assert trainer_a['training']['id'] in a_ids
        assert trainer_b['training']['id'] not in a_ids

    def test_patch_own_training(self, trainer_a):
        tid = trainer_a['training']['id']
        r = requests.patch(f"{API}/trainer/trainings/{tid}", headers=_h(trainer_a['token']), json={
            'title': 'React Zero to Hero v2 (TEST_P3)',
            'description': 'Updated description with more detail.',
            'skills': [{'skill_id': 'skill-react', 'target_level': 'ADVANCED'}],
            'duration_hours': 60, 'mode': 'HYBRID', 'seats': 20, 'status': 'PUBLISHED',
        }, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        assert r.json()['title'] == 'React Zero to Hero v2 (TEST_P3)'
        assert r.json()['duration_hours'] == 60

    def test_patch_other_trainers_training_404(self, trainer_a, trainer_b):
        r = requests.patch(f"{API}/trainer/trainings/{trainer_b['training']['id']}",
                           headers=_h(trainer_a['token']), json={
                               'title': 'Hijack attempt', 'description': 'Should not work at all.',
                               'skills': [{'skill_id': 'skill-python', 'target_level': 'BEGINNER'}],
                               'duration_hours': 5, 'seats': 5,
                           }, timeout=TIMEOUT)
        assert r.status_code == 404

    def test_trainee_cannot_create_training(self, trainee):
        r = requests.post(f"{API}/trainer/trainings", headers=_h(trainee['token']), json={
            'title': 'Trainee Hijack', 'description': 'Should be forbidden.',
            'skills': [{'skill_id': 'skill-python', 'target_level': 'BEGINNER'}],
            'duration_hours': 5, 'seats': 5,
        }, timeout=TIMEOUT)
        assert r.status_code == 403


# ---------- enrollments -----------------------------------------------------

class TestEnrollments:
    def test_enroll_created_201(self, trainee, trainer_a):
        r = requests.post(f"{API}/trainee/enrollments", headers=_h(trainee['token']),
                          json={'training_id': trainer_a['training']['id']}, timeout=TIMEOUT)
        assert r.status_code == 201, r.text
        e = r.json()
        assert e['status'] == 'ENROLLED'
        assert e['trainee_user_id'] == trainee['uid']
        assert e['trainer_user_id'] == trainer_a['uid']
        assert e['verified_skills'] == []
        trainee['enrollment'] = e

    def test_duplicate_enroll_409(self, trainee, trainer_a):
        r = requests.post(f"{API}/trainee/enrollments", headers=_h(trainee['token']),
                          json={'training_id': trainer_a['training']['id']}, timeout=TIMEOUT)
        assert r.status_code == 409

    def test_enroll_unknown_training_404(self, trainee):
        r = requests.post(f"{API}/trainee/enrollments", headers=_h(trainee['token']),
                          json={'training_id': str(uuid.uuid4())}, timeout=TIMEOUT)
        assert r.status_code == 404

    def test_enroll_closed_training_400(self, trainee, trainer_a, trainer_b):
        tid = trainer_b['training']['id']
        r = requests.patch(f"{API}/trainer/trainings/{tid}", headers=_h(trainer_b['token']), json={
            'title': trainer_b['training']['title'],
            'description': trainer_b['training']['description'],
            'skills': trainer_b['training']['skills'],
            'duration_hours': 12, 'seats': 15, 'status': 'CLOSED',
        }, timeout=TIMEOUT)
        assert r.status_code == 200
        r2 = requests.post(f"{API}/trainee/enrollments", headers=_h(trainee['token']),
                           json={'training_id': tid}, timeout=TIMEOUT)
        assert r2.status_code == 400
        assert 'closed' in r2.json()['detail'].lower()

    def test_list_enrollments_embeds_training(self, trainee, trainer_a):
        r = requests.get(f"{API}/trainee/enrollments", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert r.status_code == 200
        rows = [e for e in r.json() if e['id'] == trainee['enrollment']['id']]
        assert len(rows) == 1
        e = rows[0]
        assert e['training'] is not None
        assert e['training']['id'] == trainer_a['training']['id']
        assert 'TEST_P3' in e['training']['title']

    def test_trainer_cannot_enroll(self, trainer_a):
        r = requests.post(f"{API}/trainee/enrollments", headers=_h(trainer_a['token']),
                          json={'training_id': trainer_a['training']['id']}, timeout=TIMEOUT)
        assert r.status_code == 403


# ---------- trainer learners list ------------------------------------------

class TestTrainerLearners:
    def test_owner_sees_enrollment_with_trainee(self, trainer_a, trainee):
        r = requests.get(f"{API}/trainer/enrollments", headers=_h(trainer_a['token']), timeout=TIMEOUT)
        assert r.status_code == 200
        rows = [e for e in r.json() if e['id'] == trainee['enrollment']['id']]
        assert len(rows) == 1
        e = rows[0]
        assert e['trainee']['full_name'] == 'Phase3 Trainee'
        assert e['trainee']['email'] == trainee['email']
        assert e['training']['id'] == trainer_a['training']['id']
        assert 'password_hash' not in e['trainee']

    def test_other_trainer_does_not_see(self, trainer_b, trainee):
        r = requests.get(f"{API}/trainer/enrollments", headers=_h(trainer_b['token']), timeout=TIMEOUT)
        assert r.status_code == 200
        assert all(e['trainee_user_id'] != trainee['uid'] for e in r.json())


# ---------- skill verification ---------------------------------------------

class TestVerification:
    def test_self_declare_then_verify_overrides(self, trainee, trainer_a):
        # trainee self-declares skill-react BEGINNER first
        r = requests.post(f"{API}/trainee/skills", headers=_h(trainee['token']),
                          json={'skill_id': 'skill-react', 'level': 'BEGINNER'}, timeout=TIMEOUT)
        assert r.status_code == 200
        eid = trainee['enrollment']['id']
        r2 = requests.post(f"{API}/trainer/enrollments/{eid}/verify-skill",
                           headers=_h(trainer_a['token']),
                           json={'skill_id': 'skill-react', 'level': 'ADVANCED',
                                 'note': 'Shipped a tested React dashboard'}, timeout=TIMEOUT)
        assert r2.status_code == 200, r2.text
        v = r2.json()['verified']
        assert v['skill_id'] == 'skill-react' and v['level'] == 'ADVANCED'
        assert v['trainer_user_id'] == trainer_a['uid']
        # trainee_skills row now TRAINER_VERIFIED / ADVANCED
        g = requests.get(f"{API}/trainee/skills", headers=_h(trainee['token']), timeout=TIMEOUT)
        row = next(s for s in g.json() if s['skill_id'] == 'skill-react')
        assert row['source'] == 'TRAINER_VERIFIED'
        assert row['level'] == 'ADVANCED'

    def test_verify_uncovered_skill_400(self, trainee, trainer_a):
        eid = trainee['enrollment']['id']
        r = requests.post(f"{API}/trainer/enrollments/{eid}/verify-skill",
                          headers=_h(trainer_a['token']),
                          json={'skill_id': 'skill-ml', 'level': 'BEGINNER'}, timeout=TIMEOUT)
        assert r.status_code == 400
        assert 'not covered' in r.json()['detail'].lower()

    def test_verify_by_non_owner_403(self, trainee, trainer_b):
        eid = trainee['enrollment']['id']
        r = requests.post(f"{API}/trainer/enrollments/{eid}/verify-skill",
                          headers=_h(trainer_b['token']),
                          json={'skill_id': 'skill-react', 'level': 'BEGINNER'}, timeout=TIMEOUT)
        assert r.status_code == 403

    def test_verify_unknown_enrollment_404(self, trainer_a):
        r = requests.post(f"{API}/trainer/enrollments/{uuid.uuid4()}/verify-skill",
                          headers=_h(trainer_a['token']),
                          json={'skill_id': 'skill-react', 'level': 'BEGINNER'}, timeout=TIMEOUT)
        assert r.status_code == 404

    def test_reverify_replaces_entry(self, trainee, trainer_a):
        eid = trainee['enrollment']['id']
        r = requests.post(f"{API}/trainer/enrollments/{eid}/verify-skill",
                          headers=_h(trainer_a['token']),
                          json={'skill_id': 'skill-react', 'level': 'INTERMEDIATE',
                                'note': 'Re-graded after review'}, timeout=TIMEOUT)
        assert r.status_code == 200
        g = requests.get(f"{API}/trainer/enrollments", headers=_h(trainer_a['token']), timeout=TIMEOUT)
        e = next(x for x in g.json() if x['id'] == eid)
        react_entries = [v for v in e['verified_skills'] if v['skill_id'] == 'skill-react']
        assert len(react_entries) == 1
        assert react_entries[0]['level'] == 'INTERMEDIATE'
        # trainee_skills follows the latest verification
        s = requests.get(f"{API}/trainee/skills", headers=_h(trainee['token']), timeout=TIMEOUT)
        row = next(x for x in s.json() if x['skill_id'] == 'skill-react')
        assert row['level'] == 'INTERMEDIATE' and row['source'] == 'TRAINER_VERIFIED'

    def test_trainee_cannot_verify(self, trainee):
        eid = trainee['enrollment']['id']
        r = requests.post(f"{API}/trainer/enrollments/{eid}/verify-skill",
                          headers=_h(trainee['token']),
                          json={'skill_id': 'skill-react', 'level': 'BEGINNER'}, timeout=TIMEOUT)
        assert r.status_code == 403


# ---------- completion ------------------------------------------------------

class TestCompletion:
    def test_complete_by_non_owner_403(self, trainee, trainer_b):
        eid = trainee['enrollment']['id']
        r = requests.post(f"{API}/trainer/enrollments/{eid}/complete",
                          headers=_h(trainer_b['token']), json={}, timeout=TIMEOUT)
        assert r.status_code == 403

    def test_complete_by_owner(self, trainee, trainer_a):
        eid = trainee['enrollment']['id']
        r = requests.post(f"{API}/trainer/enrollments/{eid}/complete",
                          headers=_h(trainer_a['token']),
                          json={'trainer_notes': 'Solid capstone delivery'}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body['status'] == 'COMPLETED'
        assert body['completed_at']
        # verify persisted + re-enroll blocked with 409 while COMPLETED
        g = requests.get(f"{API}/trainee/enrollments", headers=_h(trainee['token']), timeout=TIMEOUT)
        e = next(x for x in g.json() if x['id'] == eid)
        assert e['status'] == 'COMPLETED'
        assert e['completed_at']
        assert e['trainer_notes'] == 'Solid capstone delivery'
        r2 = requests.post(f"{API}/trainee/enrollments", headers=_h(trainee['token']),
                           json={'training_id': trainer_a['training']['id']}, timeout=TIMEOUT)
        assert r2.status_code == 409


# ---------- Phase 1+2 light regression --------------------------------------

class TestRegression:
    def test_health(self):
        r = requests.get(f"{API}/", timeout=TIMEOUT)
        assert r.status_code == 200 and r.json()['status'] == 'ready'

    def test_catalog_still_intact(self, trainee):
        r = requests.get(f"{API}/catalog/skills", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert r.status_code == 200 and len(r.json()) == 10
        r2 = requests.get(f"{API}/catalog/careers", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert r2.status_code == 200 and len(r2.json()) == 4

    def test_trainer_verified_participates_in_gap(self, trainee):
        # skill-react required INTERMEDIATE for career-fullstack; trainee has
        # TRAINER_VERIFIED INTERMEDIATE -> row must be MET with that source
        r = requests.get(f"{API}/trainee/skill-gap", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert r.status_code == 200
        gap = r.json()
        row = next(i for i in gap['items'] if i['skill_id'] == 'skill-react')
        assert row['status'] == 'MET'
        assert row['source'] == 'TRAINER_VERIFIED'
        assert row['current_level'] == 'INTERMEDIATE'
        assert gap['matched'] >= 1

    def test_assessment_start_still_works(self, trainee):
        r = requests.post(f"{API}/assessment/start", headers=_h(trainee['token']),
                          json={'skill_id': 'skill-python'}, timeout=TIMEOUT)
        assert r.status_code == 200
        data = r.json()
        assert len(data['questions']) >= 3
        diffs = [q['difficulty'] for q in data['questions']]
        assert diffs == sorted(diffs, key=['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].index)

    def test_sample_trainings_still_visible_in_catalog(self, trainee):
        r = requests.get(f"{API}/catalog/trainings", headers=_h(trainee['token']), timeout=TIMEOUT)
        assert r.status_code == 200
        assert any(t['id'] == 'trg-react-mastery' for t in r.json())
