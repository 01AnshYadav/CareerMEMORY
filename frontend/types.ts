export interface UserContext {
  name: string;
  current_role: string;
  education: string;
  career_goal: string;
  target_roles: string[];
  interests: string[];
  current_skills: string[];
  current_projects: string[];
  goals: string[];
  created_at: string;
  updated_at: string;
}

export interface ContextFormData {
  name: string;
  current_role: string;
  education: string;
  career_goal: string;
  target_roles: string;
  interests: string;
  current_skills: string;
  current_projects: string;
  goals: string;
}