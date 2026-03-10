'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db/local'
import { syncData } from '@/lib/db/sync'
import type { Race } from '@/lib/types'
import { ArrowLeft, Calendar, MapPin, Ruler, Users, Play, Flag, Trash2, CloudUpload } from 'lucide-react'
import { useState } from 'react'

interface RaceHeaderProps {
  race: Race
  participantCount: number
}

function getStatusBadge(status: Race['status']) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary" className="text-sm">Pendiente</Badge>
    case 'in_progress':
      return <Badge className="bg-accent text-accent-foreground text-sm">En Curso</Badge>
    case 'finished':
      return <Badge variant="outline" className="text-sm">Finalizada</Badge>
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function RaceHeader({ race, participantCount }: RaceHeaderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null)

  async function handleSync() {
    setSyncing(true)
    try {
      await syncData()
      setSyncSuccess(true)
      setTimeout(() => setSyncSuccess(null), 3000)
    } catch {
      setSyncSuccess(false)
    }
    setSyncing(false)
  }

  async function handleStartRace() {
    setLoading(true)
    await db.races.update(race.id, { status: 'in_progress' })
    setLoading(false)
  }

  async function handleFinishRace() {
    if (confirm('Seguro que deseas finalizar la carrera? No podras registrar mas tiempos.')) {
      setLoading(true)
      await db.races.update(race.id, { status: 'finished' })
      setLoading(false)
    }
  }

  async function handleDeleteRace() {
    if (confirm('Seguro que deseas eliminar esta carrera? Esta accion no se puede deshacer.')) {
      setLoading(true)
      await db.races.delete(race.id)
      router.push('/')
    }
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit">
            <ArrowLeft className="h-4 w-4" />
            Volver a carreras
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{race.name}</h1>
                {getStatusBadge(race.status)}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span className="capitalize">{formatDate(race.date)}</span>
                </div>
                {race.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span>{race.location}</span>
                  </div>
                )}
                {race.distance && (
                  <div className="flex items-center gap-1.5">
                    <Ruler className="h-4 w-4" />
                    <span>{race.distance}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{participantCount} participantes</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSync} 
                disabled={syncing} 
                variant="outline" 
                size="icon" 
                title="Sincronizar en la nube"
                className={syncSuccess ? "text-green-500 border-green-500" : ""}
              >
                <CloudUpload className={`h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} />
                <span className="sr-only">Sincronizar</span>
              </Button>
              {race.status === 'pending' && participantCount > 0 && (
                <Button onClick={handleStartRace} disabled={loading} className="gap-2">
                  <Play className="h-4 w-4" />
                  Iniciar Carrera
                </Button>
              )}
              {race.status === 'in_progress' && (
                <Button onClick={handleFinishRace} disabled={loading} variant="secondary" className="gap-2">
                  <Flag className="h-4 w-4" />
                  Finalizar Carrera
                </Button>
              )}
              {race.status !== 'in_progress' && (
                <Button onClick={handleDeleteRace} disabled={loading} variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Eliminar carrera</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
