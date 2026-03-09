'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addParticipant, addParticipantsBulk, deleteParticipant } from '@/app/actions'
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
  const [bulkText, setBulkText] = useState('')

  const maleParticipants = participants.filter(p => p.gender === 'male')
  const femaleParticipants = participants.filter(p => p.gender === 'female')

  async function handleAddParticipant(formData: FormData) {
    setLoading(true)
    setError(null)

    const dorsal = parseInt(formData.get('dorsal') as string)
    const name = formData.get('name') as string
    const gender = formData.get('gender') as 'male' | 'female'

    const result = await addParticipant(raceId, { dorsal, name, gender })

    if (!result.success) {
      setError(result.error || 'Error al agregar participante')
    }

    setLoading(false)
    router.refresh()
  }

  async function handleBulkImport() {
    setLoading(true)
    setError(null)

    try {
      const lines = bulkText.trim().split('\n').filter(line => line.trim())
      const parsedParticipants: { dorsal: number; name: string; gender: 'male' | 'female' }[] = []

      for (const line of lines) {
        // Format: dorsal,name,gender (M/F or male/female)
        const parts = line.split(',').map(p => p.trim())
        if (parts.length >= 3) {
          const dorsal = parseInt(parts[0])
          const name = parts[1]
          const genderInput = parts[2].toLowerCase()
          const gender = genderInput === 'm' || genderInput === 'male' || genderInput === 'masculino' 
            ? 'male' 
            : 'female'

          if (!isNaN(dorsal) && name) {
            parsedParticipants.push({ dorsal, name, gender })
          }
        }
      }

      if (parsedParticipants.length === 0) {
        setError('No se encontraron participantes validos. Formato: dorsal,nombre,genero (M/F)')
        setLoading(false)
        return
      }

      const result = await addParticipantsBulk(raceId, parsedParticipants)

      if (result.success) {
        setBulkText('')
        router.refresh()
      } else {
        setError(result.error || 'Error al importar participantes')
      }
    } catch {
      setError('Error al procesar los datos')
    }

    setLoading(false)
  }

  async function handleDelete(participantId: string) {
    if (confirm('Seguro que deseas eliminar este participante?')) {
      await deleteParticipant(participantId, raceId)
      router.refresh()
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
            Importar Masivo
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
              <CardTitle className="text-base">Importar Participantes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Formato: <code className="rounded bg-muted px-1.5 py-0.5">dorsal,nombre,genero</code> (un participante por linea)
              </p>
              <p className="text-sm text-muted-foreground">
                Genero: M o Masculino para hombres, F o Femenino para mujeres
              </p>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`1,Juan Perez,M\n2,Maria Garcia,F\n3,Carlos Lopez,M`}
                rows={8}
                className="font-mono text-sm"
              />
              <Button onClick={handleBulkImport} disabled={loading || !bulkText.trim()} className="gap-2 w-fit">
                <Upload className="h-4 w-4" />
                Importar
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
