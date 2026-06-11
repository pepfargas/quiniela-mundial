export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  created_at: string
}

export interface Team {
  id: number
  name: string
  code: string
  group_name: string
  flag_emoji: string | null
}

export interface Match {
  id: number
  home_team_id: number
  away_team_id: number
  match_date: string
  stage: 'group' | 'round16' | 'quarter' | 'semi' | 'final' | '3rd'
  group_name: string | null
  home_score: number | null
  away_score: number | null
  status: 'upcoming' | 'live' | 'finished'
  home_team?: Team
  away_team?: Team
}

export interface SpecialQuestion {
  id: number
  question: string
  question_type: 'team' | 'player' | 'country' | 'number'
  points: number
  is_active: boolean
  correct_answer: string | null
}

export interface SpecialBet {
  id: number
  user_id: string
  question_id: number
  answer: string
  is_correct: boolean | null
  points_earned: number
  question?: SpecialQuestion
}

export interface MatchBet {
  id: number
  user_id: string
  match_id: number
  prediction: '1' | 'X' | '2'
  predicted_home: number | null
  predicted_away: number | null
  points_earned: number
  match?: Match
}

export interface GroupBet {
  id: number
  user_id: string
  group_name: string
  first_place_team_id: number
  second_place_team_id: number
  points_earned: number
  first_team?: Team
  second_team?: Team
}

export interface RankingEntry {
  id: string
  username: string
  full_name: string | null
  total_points: number
  match_points: number
  special_points: number
  group_points: number
  total_match_bets: number
  total_special_bets: number
}

export type Stage = Match['stage']
export type MatchStatus = Match['status']
