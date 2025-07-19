import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables not set. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Types for violation zones
export interface ViolationZone {
  id: string
  violation_type: string
  reasons: string
  solutions: string
  lat: number
  lng: number
  created_at: string
  updated_at: string
}

export interface CreateViolationZone {
  violation_type: string
  reasons: string
  solutions: string
  lat: number
  lng: number
} 