import { notFound } from 'next/navigation'
import { getRace, getParticipants } from '@/app/actions'
import { RaceHeader } from '@/components/race-header'
import { ParticipantManager } from '@/components/participant-manager'
import { RaceTimer } from '@/components/race-timer'
import { ResultsTable } from '@/components/results-table'

interface RacePageProps {
  params: Promise<{ id: string }>
}

export default async function RacePage({ params }: RacePageProps) {
  const { id } = await params
  const race = await getRace(id)
  
  if (!race) {
    notFound()
  }

  const participants = await getParticipants(id)
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
