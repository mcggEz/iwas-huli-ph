import { Location } from './supabase';

// API base URL
const API_BASE = '/api';

// Generic API call function
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Violation Zones API
export const violationsApi = {
  // Get all violation zones
  getAll: async (): Promise<{ data: Location[] }> => {
    return apiCall<{ data: Location[] }>('/violations');
  },

  // Create a new violation zone
  create: async (data: {
    lat: number;
    lng: number;
    address: string;
    violationType: string;
    reasons: string;
    solutions: string;
  }): Promise<{ data: Location }> => {
    return apiCall<{ data: Location }>('/violations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get violation zone by ID
  getById: async (id: string): Promise<{ data: Location }> => {
    return apiCall<{ data: Location }>(`/violations/${id}`);
  },

  // Update violation zone
  update: async (id: string, data: Partial<Location>): Promise<{ data: Location }> => {
    return apiCall<{ data: Location }>(`/violations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete violation zone
  delete: async (id: string): Promise<{ success: boolean }> => {
    return apiCall<{ success: boolean }>(`/violations/${id}`, {
      method: 'DELETE',
    });
  },
};

// Stats API
export const statsApi = {
  // Get violation zone statistics
  getStats: async (): Promise<{ data: any }> => {
    return apiCall<{ data: any }>('/stats');
  },
};

// Search API
export const searchApi = {
  // Search violation zones
  search: async (query: string): Promise<{ data: Location[] }> => {
    return apiCall<{ data: Location[] }>(`/search?q=${encodeURIComponent(query)}`);
  },
}; 