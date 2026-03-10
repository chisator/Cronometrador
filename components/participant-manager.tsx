'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/db/local'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Participant } from '@/lib/types'
import { Plus, Trash2, Upload, UserPlus } from 'lucide-react'

interface ParticipantManagerProps {
  raceId: string
  participants: Participant[]
}

export function ParticipantManager({ raceId, participants }: ParticipantManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const maleParticipants = participants.filter(p => p.gender === 'male')
  const femaleParticipants = participants.filter(p => p.gender === 'female')

  async function handleAddParticipant(formData: FormData) {
    setLoading(true)
    setError(null)

    const dorsal = parseInt(formData.get('dorsal') as string)
    const name = formData.get('name') as string
    const gender = formData.get('gender') as 'male' | 'female'

    try {
      await db.participants.add({
        id: crypto.randomUUID(),
        race_id: raceId,
        dorsal,
        name,
        gender,
        finish_time: null,
        elapsed_time_ms: null,
        position: null,
        created_at: new Date().toISOString()
      })
    } catch {
      setError('Error al agregar participante localmente')
    }

    setLoading(false)
  }

  async function handleBulkImport() {
    if (!file) {
      setError('Selecciona un archivo Excel primero')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { read, utils } = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = read(buffer, { type: 'array' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      
      // Read data as array of arrays to handle headers not on first row
      const data = utils.sheet_to_json<any[]>(ws, { header: 1 })
      const parsedParticipants: any[] = []

      // 1. Find header row
      let headerRowIndex = -1
      let headers: string[] = []

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        if (!Array.isArray(row)) continue
        
        const rowStrings = row.map(cell => String(cell || '').toLowerCase().trim())
        
        // Look for typical header keywords
        const hasName = rowStrings.some(c => c.includes('nadador') || c.includes('nombre') || c.includes('apellido'))
        const hasGender = rowStrings.some(c => c.includes('sexo') || c.includes('genero') || c.includes('gender'))
        
        if (hasName && hasGender) {
          headerRowIndex = i
          headers = rowStrings
          break
        }
      }

      if (headerRowIndex === -1) {
        setError('No se encontraron las columnas cabecera. Asegúrate de que el Excel tenga "NADADOR/A" y "SEXO".')
        setLoading(false)
        return
      }

      // 2. Parse data rows
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i]
        if (!Array.isArray(row) || row.length === 0) continue

        const getVal = (possibleKeys: string[], excludeKeys: string[] = []) => {
          const index = headers.findIndex(h => 
            possibleKeys.some(pk => h.includes(pk.toLowerCase())) &&
            !excludeKeys.some(ek => h.includes(ek.toLowerCase()))
          )
          return index !== -1 ? row[index] : undefined
        }

        const dorsalVal = getVal(['nº nadador/equipo', 'nº nadador', 'numero', 'dorsal', 'num', 'nº'])
        const nameVal = getVal(['nadador/a / equipo', 'nadador/a', 'nadador', 'apellido', 'nombre', 'name'], ['nº', 'numero', 'num'])
        const genderVal = getVal(['sexo', 'genero', 'gender'])
        const modalityVal = getVal(['modalidad'])
        const categoryVal = getVal(['categoria'])
        const distanceVal = getVal(['distancia', 'dist'])
        const institutionVal = getVal(['institucion', 'club', 'equipo'])

        if (dorsalVal !== undefined && nameVal !== undefined && genderVal !== undefined) {
          const dorsal = parseInt(String(dorsalVal).trim())
          const name = String(nameVal).trim()
          const genderInput = String(genderVal).toLowerCase().trim()
          
          if (!name || isNaN(dorsal)) continue

          const gender = genderInput.startsWith('m') || genderInput === 'masculino' || genderInput === 'male'
            ? 'male'
            : 'female'

          parsedParticipants.push({ 
            dorsal, 
            name, 
            gender,
            modality: modalityVal ? String(modalityVal).trim() : undefined,
            category: categoryVal ? String(categoryVal).trim() : undefined,
            distance: distanceVal ? String(distanceVal).trim() : undefined,
            institution: institutionVal ? String(institutionVal).trim() : undefined
          })
        }
      }

      if (parsedParticipants.length === 0) {
        setError('No se encontraron participantes validos para importar.')
        setLoading(false)
        return
      }

      await db.participants.bulkAdd(
        parsedParticipants.map(p => ({
          ...p,
          id: crypto.randomUUID(),
          race_id: raceId,
          finish_time: null,
          elapsed_time_ms: null,
          position: null,
          created_at: new Date().toISOString()
        }))
      )

      setFile(null)
    } catch (e) {
      console.error(e)
      setError('Error al leer el archivo Excel')
    }

    setLoading(false)
  }

  async function handleDelete(participantId: string) {
    if (confirm('Seguro que deseas eliminar este participante?')) {
      await db.participants.delete(participantId)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="add" className="w-full">
        <TabsList>
          <TabsTrigger value="add" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Agregar Individual
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar Excel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agregar Participante</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={handleAddParticipant} className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="dorsal">Dorsal *</Label>
                  <Input
                    id="dorsal"
                    name="dorsal"
                    type="number"
                    min="1"
                    placeholder="123"
                    required
                    className="w-24"
                  />
                </div>

                <div className="flex flex-col gap-2 flex-1 min-w-48">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Juan Perez"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="gender">Genero *</Label>
                  <Select name="gender" required defaultValue="male">
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={loading} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </form>

              {error && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Importar Participantes (Excel)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Sube un archivo <code className="rounded bg-muted px-1.5 py-0.5">.xlsx</code> o <code className="rounded bg-muted px-1.5 py-0.5">.xlsm</code>
              </p>
              <Input
                type="file"
                accept=".xlsx, .xls, .xlsm"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Button onClick={handleBulkImport} disabled={loading || !file} className="gap-2 w-fit">
                <Upload className="h-4 w-4" />
                Importar {file?.name && `(${file.name})`}
              </Button>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="bg-male-light rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2 text-male">
              Masculino ({maleParticipants.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ParticipantTable participants={maleParticipants} onDelete={handleDelete} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-female-light rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2 text-female">
              Femenino ({femaleParticipants.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ParticipantTable participants={femaleParticipants} onDelete={handleDelete} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ParticipantTable({ 
  participants, 
  onDelete 
}: { 
  participants: Participant[]
  onDelete: (id: string) => void
}) {
  if (participants.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No hay participantes registrados
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Dorsal</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead className="w-16"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {participants.map((participant) => (
          <TableRow key={participant.id}>
            <TableCell className="font-mono font-bold">{participant.dorsal}</TableCell>
            <TableCell>{participant.name}</TableCell>
            <TableCell>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onDelete(participant.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Eliminar</span>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
