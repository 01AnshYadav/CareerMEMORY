export interface Memory {
  id: number;
  original_text: string;
  title: string;
  summary: string;
  category: string;
  topics: string[];
  importance: number;
  current_relevance: number;
  future_relevance: number;
  prerequisites: string[];
  suggested_actions: string[];
  created_at: string;
  updated_at: string;
}

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

export interface Action {
  title: string;
  description: string;
  source_memory_id: number;
  priority: number;
  reason: string;
}

export interface ActionsResponse {
  memory_id: number;
  actions: Action[];
}

export interface Connection {
  type: string;
  label: string;
  matched_value: string;
  reason: string;
}

export interface ConnectionsResponse {
  memory_id: number;
  connections: Connection[];
}