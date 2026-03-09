'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Race } from '@/lib/types'
import { Calendar, MapPin, Ruler, ChevronRight } from 'lucide-react'

interface RaceListProps {
  races: Race[]
}

function getStatusBadge(status: Race['status']) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">Pendiente</Badge>
    case 'in_progress':
      return <Badge className="bg-accent text-accent-foreground">En Curso</Badge>
    case 'finished':
      return <Badge variant="outline">Finalizada</Badge>
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

export function RaceList({ races }: RaceListProps) {
  if (races.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">No hay carreras registradas</p>
          <p className="text-sm text-muted-foreground">Crea una nueva carrera para comenzar</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Carreras</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {races.map((race) => (
          <Link key={race.id} href={`/race/${race.id}`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <CardTitle className="text-base">{race.name}</CardTitle>
                {getStatusBadge(race.status)}
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="capitalize">{formatDate(race.date)}</span>
                </div>
                {race.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{race.location}</span>
                  </div>
                )}
                {race.distance && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Ruler className="h-4 w-4" />
                    <span>{race.distance}</span>
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <Button variant="ghost" size="sm" className="gap-1">
                    Ver detalles
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
