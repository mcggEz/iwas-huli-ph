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

// New database schema types

// Violation Report - Individual report by a user
export interface ViolationReport {
  id: string
  reporter_id: string
  date: string
  reason: string
  suggested_solutions: string
  created_at: string
}

// Violation - Type of violation at a location
export interface Violation {
  id: string
  violation_type: string
  reports: ViolationReport[]
  created_at: string
  updated_at: string
}

// Location - Main entity containing address and violations
export interface Location {
  id: string
  address: string
  lat: number
  lng: number
  violations: Violation[]
  created_at: string
  updated_at: string
}

// Legacy types for backward compatibility during migration
export interface ViolationZone {
  id: string
  violation_type: string
  reasons: string
  solutions: string
  lat: number
  lng: number
  address?: string
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

// New creation types
export interface CreateViolationReport {
  reporter_id: string
  reason: string
  suggested_solutions: string
}

export interface CreateViolation {
  violation_type: string
  reports: CreateViolationReport[]
}

export interface CreateLocation {
  address: string
  lat: number
  lng: number
  violations: CreateViolation[]
} 