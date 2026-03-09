'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRace } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, X } from 'lucide-react'

export function CreateRaceForm() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    
    const result = await createRace(formData)
    
    if (result.success && result.race) {
      setIsOpen(false)
      router.push(`/race/${result.race.id}`)
    } else {
      setError(result.error || 'Error al crear la carrera')
    }
    
    setLoading(false)
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} size="lg" className="gap-2">
        <Plus className="h-5 w-5" />
        Nueva Carrera
      </Button>
    )
  }

  return (
    <Card className="max-w-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Nueva Carrera</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre de la carrera *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ej: Travesia del Lago 2024"
              required
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Fecha *</Label>
            <Input
              id="date"
              name="date"
              type="date"
              required
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="location">Ubicacion</Label>
            <Input
              id="location"
              name="location"
              placeholder="Ej: Lago San Roque, Cordoba"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="distance">Distancia</Label>
            <Input
              id="distance"
              name="distance"
              placeholder="Ej: 3km"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Carrera'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
