'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { Race, Participant } from '@/lib/types'
import { Download, Trophy, Medal, Award } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ResultsTableProps {
  race: Race
  maleParticipants: Participant[]
  femaleParticipants: Participant[]
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

function getPositionIcon(position: number) {
  switch (position) {
    case 1:
      return <Trophy className="h-4 w-4 text-yellow-500" />
    case 2:
      return <Medal className="h-4 w-4 text-gray-400" />
    case 3:
      return <Award className="h-4 w-4 text-amber-600" />
    default:
      return null
  }
}

function exportToExcel(race: Race, participants: Participant[], sheetName: string) {
  const finished = participants
    .filter(p => p.elapsed_time_ms)
    .sort((a, b) => (a.elapsed_time_ms || 0) - (b.elapsed_time_ms || 0))

  const unfinished = participants.filter(p => !p.elapsed_time_ms)

  // Trackers for category ranking
  const catCounts: Record<string, number> = {}

  const rows = [
    ...finished.map((p, index) => {
      const catKey = p.category ? String(p.category).toUpperCase() : 'UNICA'
      catCounts[catKey] = (catCounts[catKey] || 0) + 1

      return {
        'Nº NADADOR': p.dorsal,
        'TIEMPO': formatElapsedTime(p.elapsed_time_ms || 0),
        'POSICION GRAL': index + 1,
        'Pos. X Dist. Sexo Cat. Y Tiempo': catCounts[catKey],
        'Pos. X Dist. Sexo Y Tiempo': index + 1, // Same as general if filtered by Gender
        'APELLIDO Y NOMBRE': p.name,
        'MODALIDAD': p.modality || 'INDIVIDUAL',
        'SEXO': p.gender === 'male' ? 'MASCULINO' : 'FEMENINO',
        'CATEGORIA': p.category || '',
        'DISTANCIA': p.distance || '',
        'INSTITUCION': p.institution || ''
      }
    }),
    ...unfinished.map(p => ({
      'Nº NADADOR': p.dorsal,
      'TIEMPO': '#N/D',
      'POSICION GRAL': '#N/D',
      'Pos. X Dist. Sexo Cat. Y Tiempo': '#N/D',
      'Pos. X Dist. Sexo Y Tiempo': '#N/D',
      'APELLIDO Y NOMBRE': p.name,
      'MODALIDAD': p.modality || 'INDIVIDUAL',
      'SEXO': p.gender === 'male' ? 'MASCULINO' : 'FEMENINO',
      'CATEGORIA': p.category || '',
      'DISTANCIA': p.distance || '',
      'INSTITUCION': p.institution || ''
    }))
  ]

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  XLSX.writeFile(wb, `${race.name.replace(/\s+/g, '_')}_${sheetName}.xlsx`)
}

function exportAllToExcel(race: Race, maleParticipants: Participant[], femaleParticipants: Participant[]) {
  const allParticipants = [...maleParticipants, ...femaleParticipants]
  
  const finished = allParticipants
    .filter(p => p.elapsed_time_ms)
    .sort((a, b) => (a.elapsed_time_ms || 0) - (b.elapsed_time_ms || 0))
  
  const unfinished = allParticipants.filter(p => !p.elapsed_time_ms)

  // Trackers for positions
  const genderCounts = { male: 0, female: 0 }
  const catCounts: Record<string, number> = {}

  const rows = [
    ...finished.map((p, index) => {
      const catKey = `${p.gender}_${p.category || 'UNICA'}`.toUpperCase()
      genderCounts[p.gender]++
      catCounts[catKey] = (catCounts[catKey] || 0) + 1

      return {
        'Nº NADADOR': p.dorsal,
        'TIEMPO': formatElapsedTime(p.elapsed_time_ms || 0),
        'POSICION GRAL': index + 1,
        'Pos. X Dist. Sexo Cat. Y Tiempo': catCounts[catKey],
        'Pos. X Dist. Sexo Y Tiempo': genderCounts[p.gender],
        'APELLIDO Y NOMBRE': p.name,
        'MODALIDAD': p.modality || 'INDIVIDUAL',
        'SEXO': p.gender === 'male' ? 'MASCULINO' : 'FEMENINO',
        'CATEGORIA': p.category || '',
        'DISTANCIA': p.distance || '',
        'INSTITUCION': p.institution || ''
      }
    }),
    ...unfinished.map(p => ({
      'Nº NADADOR': p.dorsal,
      'TIEMPO': '#N/D',
      'POSICION GRAL': '#N/D',
      'Pos. X Dist. Sexo Cat. Y Tiempo': '#N/D',
      'Pos. X Dist. Sexo Y Tiempo': '#N/D',
      'APELLIDO Y NOMBRE': p.name,
      'MODALIDAD': p.modality || 'INDIVIDUAL',
      'SEXO': p.gender === 'male' ? 'MASCULINO' : 'FEMENINO',
      'CATEGORIA': p.category || '',
      'DISTANCIA': p.distance || '',
      'INSTITUCION': p.institution || ''
    }))
  ]

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Inscripciones_Cronometraje')

  XLSX.writeFile(wb, `${race.name.replace(/\s+/g, '_')}_Cronometraje.xlsx`)
}

export function ResultsTable({ race, maleParticipants, femaleParticipants }: ResultsTableProps) {
  const maleFinished = maleParticipants
    .filter(p => p.elapsed_time_ms)
    .sort((a, b) => (a.elapsed_time_ms || 0) - (b.elapsed_time_ms || 0))
  
  const femaleFinished = femaleParticipants
    .filter(p => p.elapsed_time_ms)
    .sort((a, b) => (a.elapsed_time_ms || 0) - (b.elapsed_time_ms || 0))

  const maleDNF = maleParticipants.filter(p => !p.elapsed_time_ms)
  const femaleDNF = femaleParticipants.filter(p => !p.elapsed_time_ms)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Resultados Finales</h2>
        <Button 
          variant="outline" 
          onClick={() => exportAllToExcel(race, maleParticipants, femaleParticipants)}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar Todo (Excel)
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ResultsCard
          title="Masculino"
          finished={maleFinished}
          dnf={maleDNF}
          onExport={() => exportToExcel(race, maleParticipants, 'Masculino')}
          colorClass="text-male"
          bgClass="bg-male-light"
        />
        <ResultsCard
          title="Femenino"
          finished={femaleFinished}
          dnf={femaleDNF}
          onExport={() => exportToExcel(race, femaleParticipants, 'Femenino')}
          colorClass="text-female"
          bgClass="bg-female-light"
        />
      </div>
    </div>
  )
}

interface ResultsCardProps {
  title: string
  finished: Participant[]
  dnf: Participant[]
  onExport: () => void
  colorClass: string
  bgClass: string
}

function ResultsCard({ title, finished, dnf, onExport, colorClass, bgClass }: ResultsCardProps) {
  return (
    <Card>
      <CardHeader className={`${bgClass} rounded-t-lg flex flex-row items-center justify-between`}>
        <CardTitle className={`text-base ${colorClass}`}>
          {title} ({finished.length + dnf.length})
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onExport} className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {finished.length === 0 && dnf.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No hay participantes
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Pos.</TableHead>
                <TableHead className="w-20">Dorsal</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Tiempo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finished.map((p, index) => (
                <TableRow key={p.id} className={index < 3 ? 'bg-muted/30' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {getPositionIcon(index + 1)}
                      {index + 1}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono font-bold">{p.dorsal}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="font-mono text-right">
                    {formatElapsedTime(p.elapsed_time_ms || 0)}
                  </TableCell>
                </TableRow>
              ))}
              {dnf.map(p => (
                <TableRow key={p.id} className="text-muted-foreground">
                  <TableCell>DNF</TableCell>
                  <TableCell className="font-mono">{p.dorsal}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
