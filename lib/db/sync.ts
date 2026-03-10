import { db } from './local'
import { createClient } from '@/lib/supabase/client'

// Crear supabase client genérico para browser
export async function syncData() {
  const supabase = createClient()
  
  // 1. Enviar datos locales a Supabase
  const localRaces = await db.races.toArray()
  const localParticipants = await db.participants.toArray()

  for (const race of localRaces) {
    const { error } = await supabase.from('races').upsert(race)
    if (error) console.error('Error syncing race:', race.id, error)
  }

  for (const part of localParticipants) {
    const { error } = await supabase.from('participants').upsert(part)
    if (error) console.error('Error syncing participant:', part.id, error)
  }

  // 2. Traer datos de Supabase a Local (si los hubiera)
  const { data: remoteRaces } = await supabase.from('races').select('*')
  if (remoteRaces) {
    await db.races.bulkPut(remoteRaces)
  }

  const { data: remoteParticipants } = await supabase.from('participants').select('*')
  if (remoteParticipants) {
    await db.participants.bulkPut(remoteParticipants)
  }
}
