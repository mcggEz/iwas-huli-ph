import { supabase, ViolationZone, CreateViolationZone } from './supabase'

// Fetch all violation zones
export async function fetchViolationZones(): Promise<ViolationZone[]> {
  try {
    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('⚠️ Supabase not configured. Returning empty array.');
      return []
    }

    const { data, error } = await supabase
      .from('violation_zones')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching violation zones:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching violation zones:', error)
    return []
  }
}

// Create a new violation zone
export async function createViolationZone(violationZone: CreateViolationZone): Promise<ViolationZone | null> {
  try {
    const { data, error } = await supabase
      .from('violation_zones')
      .insert([violationZone])
      .select()
      .single()

    if (error) {
      console.error('Error creating violation zone:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating violation zone:', error)
    return null
  }
}

// Subscribe to real-time changes
export function subscribeToViolationZones(callback: (payload: any) => void) {
  return supabase
    .channel('violation_zones_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'violation_zones'
      },
      callback
    )
    .subscribe()
} 