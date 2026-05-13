// Placeholder — run `npx supabase gen types typescript > types/database.ts`
// after Phase 2 tables are created in Supabase.

export type Role = 'parent' | 'therapist' | 'admin'
export type Mood = 'happy' | 'calm' | 'anxious' | 'angry' | 'sad' | 'tired'
export type NotificationType = 'alert' | 'pattern' | 'positive'

export interface Profile {
  id: string
  role: Role
  full_name: string
  created_at: string
}

export interface Child {
  id: string
  parent_id: string
  name: string
  age: number
  avatar: string
  color: string
  therapist_id: string | null
  created_at: string
}

export interface Session {
  id: string
  child_id: string
  mood: Mood
  stars: 1 | 2 | 3
  game: string
  world: string
  played_at: string
  day_label: string
}

export interface TherapistNote {
  id: string
  child_id: string
  therapist_id: string
  content: string
  ai_summary: Record<string, unknown> | null
  week_of: string
  created_at: string
}

export interface IepGoal {
  id: string
  child_id: string
  label: string
  score: number
  max_score: number
  updated_at: string
}

export interface Notification {
  id: string
  recipient_id: string
  child_id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  created_at: string
}
