export type Candidate = {
  id: string;
  pair_number: number;
  chair_name: string;
  vice_name: string;
  pair_photo_url: string | null;
  chair_photo_url?: string | null;
  vice_photo_url?: string | null;
  vision: string | null;
  mission: string[] | string | null;
  slogan: string | null;
  votes?: number;
};

export type Voter = {
  id: string;
  credential: string;
  role: string;
  level: string;
  class_name: string | null;
  full_name: string;
  gender: string | null;
  has_voted: boolean;
  voted_candidate_id: string | null;
  voted_at: string | null;
};

export type Turnout = { level: string; total: number; voted: number; percentage: number };
