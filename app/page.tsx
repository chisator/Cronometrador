import { getRaces } from './actions'
import { RaceList } from '@/components/race-list'
import { CreateRaceForm } from '@/components/create-race-form'
import { Waves } from 'lucide-react'

export default async function HomePage() {
  const races = await getRaces()

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Waves className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cronometrador de Carreras</h1>
              <p className="text-sm text-muted-foreground">Aguas Abiertas</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <CreateRaceForm />
        </div>
        
        <RaceList races={races} />
      </div>
    </main>
  )
}
