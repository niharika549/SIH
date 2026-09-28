import { useCallback } from "react";

import { ApiError, apiRequest } from "./client";
import { useAuth } from "../auth-context";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

// Authenticated request helper: pulls the JWT from AuthContext and attaches it.
// Consumers use this via `const request = useAuthedRequest()` so React Query
// automatically invalidates when the session changes.
export function useAuthedRequest() {
  const { token } = useAuth();
  return useCallback(
    <T,>(path: string, options: RequestOptions = {}) => {
      if (!token) throw new ApiError("Session expired — please sign in again", 401);
      return apiRequest<T>(path, {
        ...options,
        headers: { ...(options.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` },
      });
    },
    [token],
  );
}

// ============================================================================
// Shared types for Phase 2 trainee flow
// ============================================================================

export type Proficiency = "NONE" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type SkillSource = "SELF_DECLARED" | "ASSESSED" | "TRAINER_VERIFIED";
export type TraineeCategory = "STUDENT" | "JOB_HOLDER" | "CAREER_GAP";

export type Skill = { id: string; name: string; description: string; domain: string };
export type CareerRequiredSkill = { skill_id: string; skill_name?: string; required_level: Proficiency };
export type Career = { id: string; name: string; description: string; domain: string; required_skills: CareerRequiredSkill[] };
export type Training = {
  id: string;
  title: string;
  description: string;
  skills: { skill_id: string; target_level: Proficiency }[];
  duration_hours: number;
  mode: string;
  seats: number;
  provider: string;
  is_sample: boolean;
  provider_user_id?: string | null;
  status?: "PUBLISHED" | "CLOSED";
};

export type TrainerProfile = {
  user_id: string;
  headline: string;
  bio: string;
  specializations: string[];
  skill_ids: string[];
  qualifications: string;
  experience_years: number;
  institution: string;
  state_code: string | null;
  district_code: string | null;
  availability: string;
  created_at: string;
  updated_at: string;
};

export type Enrollment = {
  id: string;
  trainee_user_id: string;
  training_id: string;
  trainer_user_id: string | null;
  status: "ENROLLED" | "COMPLETED" | "DROPPED";
  enrolled_at: string;
  completed_at: string | null;
  trainer_notes: string;
  verified_skills: {
    skill_id: string;
    level: Proficiency;
    note: string;
    verified_at: string;
    trainer_user_id: string;
  }[];
  training?: Training | null;
  trainee?: { id: string; full_name: string; email: string; state_code?: string | null; district_code?: string | null };
};

export type PendingUser = {
  id: string;
  full_name: string;
  email: string;
  role: "TRAINEE" | "TRAINER" | "EMPLOYER" | "GOVERNMENT" | "ADMIN";
  account_status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  created_at: string;
};
export type TraineeSkill = {
  skill_id: string;
  level: Proficiency;
  source: SkillSource;
  updated_at: string;
  last_attempt_id?: string;
};
export type TraineeProfile = {
  user_id: string;
  category: TraineeCategory;
  category_details: Record<string, string>;
  career_goal_id: string;
  state_code: string | null;
  district_code: string | null;
  created_at: string;
  updated_at: string;
};
export type SkillGapItem = {
  skill_id: string;
  skill_name: string;
  required_level: Proficiency;
  current_level: Proficiency;
  source: SkillSource | null;
  gap: number;
  status: "MET" | "GAP" | "NOT_STARTED";
};
export type SkillGap = {
  career_id: string;
  career_name: string;
  items: SkillGapItem[];
  matched: number;
  total: number;
};
export type RecommendationItem = { training: Training; covered_gaps: string[]; reason: string };
export type AssessmentQuestion = { id: string; difficulty: Difficulty; prompt: string; choices: string[] };
export type AssessmentStartResult = { attempt_id: string; skill_id: string; questions: AssessmentQuestion[] };
export type AssessmentSubmitResult = {
  attempt_id: string;
  skill_id: string;
  score: number;
  max_score: number;
  percentage: number;
  proficiency: Proficiency;
  breakdown: {
    question_id: string;
    difficulty: Difficulty;
    correct: boolean;
    chosen_index: number;
    correct_index: number;
    explanation: string;
  }[];
};
export type AssessmentHistory = {
  id: string;
  skill_id: string;
  score: number;
  max_score: number;
  percentage: number;
  proficiency: Proficiency;
  submitted_at: string;
  created_at: string;
};

export const PROFICIENCY_RANK: Record<Proficiency, number> = { NONE: 0, BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 };
export const PROFICIENCY_LABEL: Record<Proficiency, string> = {
  NONE: "Not started",
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export type JobStatus = "OPEN" | "CLOSED";
export type ApplicationStatus = "APPLIED" | "SHORTLISTED" | "INTERVIEW" | "SELECTED" | "REJECTED";

export type EmployerProfile = {
  user_id: string;
  company_name: string;
  industry: string;
  company_size: string;
  website: string;
  logo_url: string;
  about: string;
  state_code: string | null;
  district_code: string | null;
  created_at: string;
  updated_at: string;
};

export type JobSkill = { skill_id: string; required_level: Proficiency };

export type Job = {
  id: string;
  title: string;
  description: string;
  skills: JobSkill[];
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  experience_years: number;
  qualification: string;
  openings: number;
  expiry_date: string | null;
  company_name: string;
  employer_user_id: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  job_id: string;
  employer_user_id: string;
  trainee_user_id: string;
  status: ApplicationStatus;
  feedback: string;
  applied_at: string;
  updated_at: string;
  job?: Job | null;
  trainee?: { id: string; full_name: string; email: string; state_code?: string | null; district_code?: string | null };
  trainee_skills?: TraineeSkill[];
};

export type CandidateMatch = {
  trainee: { id: string; full_name: string; email: string; state_code?: string | null; district_code?: string | null };
  match_percentage: number;
  method: "weighted_v1" | "skill_only_fallback";
  skill_breakdown: { skill_id: string; required_level: Proficiency; candidate_level: Proficiency; met: boolean }[];
  experience_note?: string;
  qualification_note?: string;
  explanation: string;
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  SELECTED: "Selected",
  REJECTED: "Rejected",
};
