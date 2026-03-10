'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/db/local'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Race, Participant } from '@/lib/types'
import { Play, Clock, Check, X, AlertCircle } from 'lucide-react'

interface RaceTimerProps {
  race: Race
  maleParticipants: Participant[]
  femaleParticipants: Participant[]
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const centiseconds = Math.floor((ms % 1000) / 10)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
}

function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const centiseconds = Math.floor((ms % 1000) / 10)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
}

export function RaceTimer({ race, maleParticipants, femaleParticipants }: RaceTimerProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GenderTimer
        gender="male"
        label="Masculino"
        startTime={race.male_start_time}
        participants={maleParticipants}
        raceId={race.id}
      />
      <GenderTimer
        gender="female"
        label="Femenino"
        startTime={race.female_start_time}
        participants={femaleParticipants}
        raceId={race.id}
      />
    </div>
  )
}

interface GenderTimerProps {
  gender: 'male' | 'female'
  label: string
  startTime: string | null
  participants: Participant[]
  raceId: string
}

function GenderTimer({ gender, label, startTime, participants, raceId }: GenderTimerProps) {
  const router = useRouter()
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dorsalInput, setDorsalInput] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const isStarted = !!startTime
  const colorClass = gender === 'male' ? 'text-male' : 'text-female'
  const bgClass = gender === 'male' ? 'bg-male-light' : 'bg-female-light'
  const borderClass = gender === 'male' ? 'border-male/30' : 'border-female/30'

  // Timer effect
  useEffect(() => {
    if (!startTime) return

    const startDate = new Date(startTime).getTime()
    
    const interval = setInterval(() => {
      setElapsed(Date.now() - startDate)
    }, 10)

    return () => clearInterval(interval)
  }, [startTime])

  // Clear feedback after 3 seconds
  useEffect(() => {
    if (feedback) {
      const timeout = setTimeout(() => setFeedback(null), 3000)
      return () => clearTimeout(timeout)
    }
  }, [feedback])

  const handleStart = useCallback(async () => {
    setLoading(true)
    try {
      const startTimeVal = new Date().toISOString()
      const updateField = gender === 'male' ? 'male_start_time' : 'female_start_time'
      await db.races.update(raceId, {
        [updateField]: startTimeVal,
        status: 'in_progress'
      })
    } catch {
      setFeedback({ type: 'error', message: 'Error al iniciar localmente' })
    }
    setLoading(false)
  }, [raceId, gender])

  const handleRecordFinish = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dorsalInput.trim() || !startTime) return

    const dorsal = parseInt(dorsalInput.trim())
    if (isNaN(dorsal)) {
      setFeedback({ type: 'error', message: 'Dorsal invalido' })
      return
    }

    // Check if participant exists and is the right gender
    const participant = participants.find(p => p.dorsal === dorsal)
    if (!participant) {
      setFeedback({ type: 'error', message: `Dorsal ${dorsal} no encontrado en ${label.toLowerCase()}` })
      return
    }

    if (participant.finish_time) {
      setFeedback({ type: 'error', message: 'El participante ya tiene tiempo registrado' })
      return
    }

    setLoading(true)
    try {
      const finishTimeDate = new Date()
      const startDate = new Date(startTime)
      const elapsedMs = finishTimeDate.getTime() - startDate.getTime()

      await db.participants.update(participant.id, {
        finish_time: finishTimeDate.toISOString(),
        elapsed_time_ms: elapsedMs
      })

      setFeedback({ 
        type: 'success', 
        message: `${participant.name} - ${formatElapsedTime(elapsedMs)}` 
      })
      setDorsalInput('')
    } catch {
      setFeedback({ type: 'error', message: 'Error al registrar localmente' })
    }
    
    setLoading(false)
  }, [dorsalInput, startTime, participants, label])

  const handleClearTime = useCallback(async (participantId: string) => {
    if (confirm('Seguro que deseas borrar el tiempo de este participante?')) {
      await db.participants.update(participantId, {
        finish_time: null,
        elapsed_time_ms: null,
        position: null
      })
    }
  }, [])

  const pendingParticipants = participants.filter(p => !p.finish_time)
  const finishedParticipants = participants
    .filter(p => p.finish_time)
    .sort((a, b) => (a.elapsed_time_ms || 0) - (b.elapsed_time_ms || 0))

  return (
    <Card className={`border-2 ${borderClass}`}>
      <CardHeader className={`${bgClass} rounded-t-lg`}>
        <CardTitle className={`text-lg ${colorClass}`}>{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        {!isStarted ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-muted-foreground">Largada no iniciada</p>
            <Button 
              onClick={handleStart} 
              disabled={loading}
              size="lg"
              className={`gap-2 ${gender === 'male' ? 'bg-male hover:bg-male/90' : 'bg-female hover:bg-female/90'}`}
            >
              <Play className="h-5 w-5" />
              Iniciar Largada {label}
            </Button>
            <p className="text-xs text-muted-foreground">
              {participants.length} participantes registrados
            </p>
          </div>
        ) : (
          <>
            {/* Timer Display */}
            <div className={`flex flex-col items-center gap-2 rounded-lg ${bgClass} p-4`}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Tiempo transcurrido</span>
              </div>
              <div className={`font-mono text-4xl font-bold ${colorClass}`}>
                {formatTime(elapsed)}
              </div>
            </div>

            {/* Dorsal Input */}
            <form onSubmit={handleRecordFinish} className="flex gap-2">
              <Input
                type="number"
                placeholder="Dorsal"
                value={dorsalInput}
                onChange={(e) => setDorsalInput(e.target.value)}
                className="font-mono text-lg"
                autoFocus
              />
              <Button 
                type="submit" 
                disabled={loading || !dorsalInput.trim()}
                className={gender === 'male' ? 'bg-male hover:bg-male/90' : 'bg-female hover:bg-female/90'}
              >
                <Check className="h-4 w-4" />
                <span className="sr-only">Registrar llegada</span>
              </Button>
            </form>

            {/* Feedback */}
            {feedback && (
              <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                feedback.type === 'success' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {feedback.type === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {feedback.message}
              </div>
            )}

            {/* Stats */}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Finalizados: {finishedParticipants.length}</span>
              <span>Pendientes: {pendingParticipants.length}</span>
            </div>

            {/* Finished Participants */}
            {finishedParticipants.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="w-16">Dorsal</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="w-28 text-right">Tiempo</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finishedParticipants.map((p, index) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-mono font-bold">{p.dorsal}</TableCell>
                        <TableCell className="truncate max-w-32">{p.name}</TableCell>
                        <TableCell className="font-mono text-right">
                          {formatElapsedTime(p.elapsed_time_ms || 0)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleClearTime(p.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Borrar tiempo</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pending Participants (collapsible) */}
            {pendingParticipants.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Ver participantes pendientes ({pendingParticipants.length})
                </summary>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pendingParticipants.map(p => (
                    <span 
                      key={p.id} 
                      className="rounded bg-muted px-2 py-1 font-mono text-xs"
                      title={p.name}
                    >
                      {p.dorsal}
                    </span>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
