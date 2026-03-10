import Dexie, { type Table } from 'dexie'
import type { Race, Participant } from '@/lib/types'

export class LocalDatabase extends Dexie {
  races!: Table<Race, string>
  participants!: Table<Participant, string>

  constructor() {
    super('CronometrajeOpenWaterDB')
    
    this.version(1).stores({
      races: 'id, date, status, created_at',
      participants: 'id, race_id, dorsal, gender, elapsed_time_ms, created_at'
    })
  }
}

export const db = new LocalDatabase()
