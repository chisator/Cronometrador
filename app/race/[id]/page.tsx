'use client'

import { notFound, useParams } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/local'
import { RaceHeader } from '@/components/race-header'
import { ParticipantManager } from '@/components/participant-manager'
import { RaceTimer } from '@/components/race-timer'
import { ResultsTable } from '@/components/results-table'

export default function RacePage() {
  const { id } = useParams<{ id: string }>()
  
  const race = useLiveQuery(() => db.races.get(id), [id])
  const participants = useLiveQuery(() => db.participants.where('race_id').equals(id).toArray(), [id])

  if (race === undefined || participants === undefined) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando datos locales...</p>
      </main>
    )
  }

  if (race === null) {
    notFound()
  }

  const maleParticipants = participants.filter(p => p.gender === 'male')
  const femaleParticipants = participants.filter(p => p.gender === 'female')

  return (
    <main className="min-h-screen bg-background">
      <RaceHeader race={race} participantCount={participants.length} />

      <div className="mx-auto max-w-7xl px-4 py-6">
        {race.status === 'pending' && (
          <ParticipantManager 
            raceId={race.id} 
            participants={participants}
          />
        )}

        {race.status === 'in_progress' && (
          <RaceTimer
            race={race}
            maleParticipants={maleParticipants}
            femaleParticipants={femaleParticipants}
          />
        )}

        {race.status === 'finished' && (
          <ResultsTable
            race={race}
            maleParticipants={maleParticipants}
            femaleParticipants={femaleParticipants}
          />
        )}
      </div>
    </main>
  )
}
