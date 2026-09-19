# SkillAlign — Product Requirements Document

## Original Problem Statement
Labor-Market Intelligence & Workforce Skill Alignment Platform for SIH 2026. Five portals/roles: Trainee, Employer, Trainer, Government, Admin. Credit-efficient build (~100 credits), strict 9-phase plan (Phase 0–8) with test → report → STOP → approval after each phase. Interactive India map (Maharashtra district drilldown) for the Gov Portal, built on lightweight SVG. DEMO/SAMPLE data must always be labeled. End goal: reliable, connected MVP suitable for an SIH demonstration.

## Architecture
- **Frontend:** Expo Router (React Native), TypeScript, `src/theme.ts` tokens from `design_guidelines.json`, AuthProvider context, api client (`process.env.EXPO_PUBLIC_BACKEND_URL` primary).
- **Backend:** FastAPI + Motor (MongoDB), JWT (HS256) auth, bcrypt password hashing, role-gated dependencies.
- **Routing contract:** `app/index.tsx` pure dispatcher → `/sign-in` (auth screen) or `/(tabs)` (protected). Guards live ONLY in route files: `(tabs)/_layout.tsx` (`!user → /sign-in`), `sign-in.tsx` (`user → /(tabs)`). Never redirect to bare `/` (ambiguous with `(tabs)/index`).

## User Personas
Trainee (skill seeker), Trainer (training provider), Employer (hiring org), Government (labor-market intelligence), Admin (platform control).

## Phase Log
- **Phase 0 — Audit (2026-09):** COMPLETE. Repo audited, logo integrated, design guidelines generated, plan approved.
- **Phase 1 — Foundation (2026-09-19):** COMPLETE & TESTED.
  - Backend: roles enum, JWT register/login/me, ADMIN self-register blocked (403), EMPLOYER/GOVERNMENT register as PENDING (login blocked until admin verifies), unique email index, `_id`/`password_hash` never leak, `/api/admin/access-check` RBAC probe.
  - Frontend: branded auth screen (sign-in/register, role selector), pure-dispatcher routing, protected Home/Profile tabs, sign-out, NativeTabs gate (iOS 26+) with JS Tabs fallback.
  - Testing: backend 16/16 pytest; UI flows verified end-to-end (iterations 1–4).
- **Phase 2 — Trainee MVP (2026-09-19):** COMPLETE & TESTED.
  - Shared catalog seeded (idempotent `seed_phase2.py`): 10 IT skills, 4 careers, 50 MCQs across 3 difficulties, 8 sample trainings.
  - Backend endpoints: `/catalog/{skills,careers,careers/{id},trainings}`; `/trainee/{profile,skills,skill-gap,recommendations}`; `/assessment/{start,submit,history}`. Weighted scoring (BEGINNER=1 / INTERMEDIATE=2 / ADVANCED=3) → proficiency mapping (<25 NONE, <50 BEGINNER, <75 INTERMEDIATE, else ADVANCED). Skill sources SELF_DECLARED / ASSESSED / TRAINER_VERIFIED enforced; self-declare cannot overwrite an ASSESSED level.
  - Frontend: 4-step onboarding wizard supporting STUDENT / JOB_HOLDER / CAREER_GAP with tailored fields; state + Maharashtra district picker; conditional trainee tabs (Home / Skills / Career / Profile) with route-level role guards; assessment player with progress dots, difficulty pill, per-question review + explanation; trainee dashboard summarising skill gap and next action; career screen with explainable gap table and DEMO-labelled recommendations.
  - Testing: backend 21/21 pytest; full UI regression across sign-in, onboarding, assessment, skill-gap, recommendations, RBAC, sign-out — zero navigation loops, zero blocking errors.

## Prioritized Backlog
- **P1 Phase 2 — Trainee MVP:** categories, technical skills, basic assessment, skill-gap analysis, course recommendations.
- **P1 Phase 3 — Trainer Portal:** registration, verification, provider integration, skill verification.
- **P2 Phase 4 — Employer Portal:** org profile, job postings, matching engine.
- **P2 Phase 5 — Government Portal:** India SVG map (all states) + Maharashtra district drilldown; demand/supply/skill-gap/training-capacity on click; DEMO labels.
- **P2 Phase 6 — Admin Portal:** user management, verification queue, audit logs.
- **P1 Phase 7 — Pipeline Integration:** end-to-end cross-portal workflow validation.
- **P1 Phase 8 — SIH Demo Prep:** seed demo data, presentation-ready dashboards.

## Known Limitations / Notes
- JWT_SECRET in backend/.env is a local placeholder — rotate for production.
- Template `/api/status` endpoints remain (harmless, remove in a later phase).
- Web address bar shows `/` after sign-in (cosmetic; Redirect resolves `/(tabs)` to root on web).
- DB contains two non-test accounts (24nn1a4432@gmail.com, niharikakuraku123@gmail.com) — confirm with user before any reset.

## Next Task
Await user approval for **Phase 3 — Trainer Portal**.
