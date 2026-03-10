export interface Race {
  id: string
  name: string
  date: string
  location: string | null
  distance: string | null
  status: 'pending' | 'in_progress' | 'finished'
  male_start_time: string | null
  female_start_time: string | null
  created_at: string
}

export interface Participant {
  id: string
  race_id: string
  dorsal: number
  name: string
  gender: 'male' | 'female'
  finish_time: string | null
  elapsed_time_ms: number | null
  position: number | null
  created_at: string
  modality?: string
  category?: string
  distance?: string
  institution?: string
}

export type RaceStatus = Race['status']
export type Gender = Participant['gender']
