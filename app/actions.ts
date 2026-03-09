'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Race, Participant } from '@/lib/types'

export async function getRaces(): Promise<Race[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('races')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getRace(id: string): Promise<Race | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('races')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createRace(formData: FormData): Promise<{ success: boolean; error?: string; race?: Race }> {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const date = formData.get('date') as string
  const location = formData.get('location') as string
  const distance = formData.get('distance') as string

  const { data, error } = await supabase
    .from('races')
    .insert({ name, date, location, distance })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/')
  return { success: true, race: data }
}

export async function updateRaceStatus(
  raceId: string, 
  status: Race['status']
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('races')
    .update({ status })
    .eq('id', raceId)

  if (error) return { success: false, error: error.message }
  
  revalidatePath(`/race/${raceId}`)
  return { success: true }
}

export async function startRace(
  raceId: string, 
  gender: 'male' | 'female'
): Promise<{ success: boolean; error?: string; startTime?: string }> {
  const supabase = await createClient()
  
  const startTime = new Date().toISOString()
  const updateField = gender === 'male' ? 'male_start_time' : 'female_start_time'
  
  const { error } = await supabase
    .from('races')
    .update({ [updateField]: startTime, status: 'in_progress' })
    .eq('id', raceId)

  if (error) return { success: false, error: error.message }
  
  revalidatePath(`/race/${raceId}`)
  return { success: true, startTime }
}

export async function deleteRace(raceId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('races')
    .delete()
    .eq('id', raceId)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/')
  return { success: true }
}

// Participant actions
export async function getParticipants(raceId: string): Promise<Participant[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('race_id', raceId)
    .order('dorsal', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function addParticipant(
  raceId: string,
  participant: { dorsal: number; name: string; gender: 'male' | 'female' }
): Promise<{ success: boolean; error?: string; participant?: Participant }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('participants')
    .insert({ race_id: raceId, ...participant })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  
  revalidatePath(`/race/${raceId}`)
  return { success: true, participant: data }
}

export async function addParticipantsBulk(
  raceId: string,
  participants: { dorsal: number; name: string; gender: 'male' | 'female' }[]
): Promise<{ success: boolean; error?: string; count?: number }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('participants')
    .insert(participants.map(p => ({ race_id: raceId, ...p })))
    .select()

  if (error) return { success: false, error: error.message }
  
  revalidatePath(`/race/${raceId}`)
  return { success: true, count: data?.length || 0 }
}

export async function deleteParticipant(
  participantId: string,
  raceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', participantId)

  if (error) return { success: false, error: error.message }
  
  revalidatePath(`/race/${raceId}`)
  return { success: true }
}

export async function recordFinish(
  participantId: string,
  raceId: string,
  startTime: string
): Promise<{ success: boolean; error?: string; elapsedMs?: number }> {
  const supabase = await createClient()
  
  const finishTime = new Date()
  const startDate = new Date(startTime)
  const elapsedMs = finishTime.getTime() - startDate.getTime()

  const { error } = await supabase
    .from('participants')
    .update({ 
      finish_time: finishTime.toISOString(),
      elapsed_time_ms: elapsedMs
    })
    .eq('id', participantId)

  if (error) return { success: false, error: error.message }
  
  // Update positions for this gender
  await updatePositions(raceId)
  
  revalidatePath(`/race/${raceId}`)
  return { success: true, elapsedMs }
}

export async function recordFinishByDorsal(
  raceId: string,
  dorsal: number,
  startTime: string
): Promise<{ success: boolean; error?: string; participant?: Participant }> {
  const supabase = await createClient()
  
  // First find the participant
  const { data: participant, error: findError } = await supabase
    .from('participants')
    .select('*')
    .eq('race_id', raceId)
    .eq('dorsal', dorsal)
    .single()

  if (findError || !participant) {
    return { success: false, error: 'Participante no encontrado' }
  }

  if (participant.finish_time) {
    return { success: false, error: 'El participante ya tiene tiempo registrado' }
  }

  const finishTime = new Date()
  const startDate = new Date(startTime)
  const elapsedMs = finishTime.getTime() - startDate.getTime()

  const { error } = await supabase
    .from('participants')
    .update({ 
      finish_time: finishTime.toISOString(),
      elapsed_time_ms: elapsedMs
    })
    .eq('id', participant.id)

  if (error) return { success: false, error: error.message }
  
  await updatePositions(raceId)
  
  revalidatePath(`/race/${raceId}`)
  return { success: true, participant: { ...participant, elapsed_time_ms: elapsedMs } }
}

async function updatePositions(raceId: string) {
  const supabase = await createClient()
  
  // Get all finished participants ordered by elapsed time, grouped by gender
  const { data: participants } = await supabase
    .from('participants')
    .select('*')
    .eq('race_id', raceId)
    .not('elapsed_time_ms', 'is', null)
    .order('elapsed_time_ms', { ascending: true })

  if (!participants) return

  // Update positions by gender
  const maleParticipants = participants.filter(p => p.gender === 'male')
  const femaleParticipants = participants.filter(p => p.gender === 'female')

  for (let i = 0; i < maleParticipants.length; i++) {
    await supabase
      .from('participants')
      .update({ position: i + 1 })
      .eq('id', maleParticipants[i].id)
  }

  for (let i = 0; i < femaleParticipants.length; i++) {
    await supabase
      .from('participants')
      .update({ position: i + 1 })
      .eq('id', femaleParticipants[i].id)
  }
}

export async function clearFinishTime(
  participantId: string,
  raceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('participants')
    .update({ 
      finish_time: null,
      elapsed_time_ms: null,
      position: null
    })
    .eq('id', participantId)

  if (error) return { success: false, error: error.message }
  
  await updatePositions(raceId)
  
  revalidatePath(`/race/${raceId}`)
  return { success: true }
}

export async function finishRace(raceId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('races')
    .update({ status: 'finished' })
    .eq('id', raceId)

  if (error) return { success: false, error: error.message }
  
  revalidatePath(`/race/${raceId}`)
  return { success: true }
}
