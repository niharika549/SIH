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
  - Testing: backend 16/16 pytest; UI flows verified end-to-end (iterations 1–4). Bugs fixed: web API URL config, sign-out navigation restructure, invalid icon, resizeMode deprecation, touch target size.
  - Seeded accounts in `/app/memory/test_credentials.md` (admin / trainee / pending employer).

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
Await user approval for **Phase 2 — Trainee MVP**.
