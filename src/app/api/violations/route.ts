import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import RateLimiter from '../../../lib/rate-limiter';

// Initialize rate limiter for API endpoints
const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 100, // 100 requests per hour
  keyGenerator: (req: any) => req.ip || req.headers.get('x-forwarded-for') || 'unknown'
});

// GET - Fetch all violation zones
export async function GET(request: NextRequest) {
  try {
    // Check rate limiting
    const rateLimitCheck = apiRateLimiter.check(request as any);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before trying again.' },
        { status: 429 }
      );
    }

    console.log('📖 Fetching all violation zones...');
    
    const { data: locations, error } = await supabase
      .from('locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching violation zones:', error);
      return NextResponse.json(
        { error: 'Failed to fetch violation zones' },
        { status: 500 }
      );
    }

    console.log(`✅ Fetched ${locations?.length || 0} violation zones`);
    return NextResponse.json({ data: locations });

  } catch (error) {
    console.error('💥 Exception in GET /api/violations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new violation zone
export async function POST(request: NextRequest) {
  try {
    // Check rate limiting
    const rateLimitCheck = apiRateLimiter.check(request as any);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before submitting again.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { lat, lng, address, violationType, reasons, solutions } = body;

    // Validate required fields
    if (!lat || !lng || !address || !violationType || !reasons || !solutions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate data types
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitizedData = {
      lat: Number(lat),
      lng: Number(lng),
      address: String(address).substring(0, 500),
      violationType: String(violationType).substring(0, 100),
      reasons: String(reasons).substring(0, 1000),
      solutions: String(solutions).substring(0, 1000)
    };

    console.log('🚀 Creating violation zone with data:', sanitizedData);

    // Check if location already exists
    const { data: existingLocations, error: searchError } = await supabase
      .from('locations')
      .select('*')
      .eq('address', sanitizedData.address);

    if (searchError) {
      console.error('❌ Error searching for existing location:', searchError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    const existingLocation = existingLocations?.[0];

    if (existingLocation) {
      console.log('📍 Found existing location, adding violation to it');
      
      // Add violation to existing location
      const newReport = {
        id: crypto.randomUUID(),
        reporter_id: 'user_' + Date.now(),
        date: new Date().toISOString(),
        reason: sanitizedData.reasons,
        suggested_solutions: sanitizedData.solutions,
        created_at: new Date().toISOString()
      };

      // Check if violation type already exists
      const existingViolationIndex = existingLocation.violations.findIndex(
        (v: any) => v.violation_type === sanitizedData.violationType
      );

      let updatedViolations;
      if (existingViolationIndex >= 0) {
        // Add report to existing violation
        updatedViolations = [...existingLocation.violations];
        updatedViolations[existingViolationIndex].reports.push(newReport);
        updatedViolations[existingViolationIndex].updated_at = new Date().toISOString();
      } else {
        // Create new violation type
        const newViolation = {
          id: crypto.randomUUID(),
          violation_type: sanitizedData.violationType,
          reports: [newReport],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        updatedViolations = [...existingLocation.violations, newViolation];
      }

      // Update location with new violation
      const { data: updatedLocation, error: updateError } = await supabase
        .from('locations')
        .update({ 
          violations: updatedViolations,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLocation.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating existing location:', updateError);
        return NextResponse.json(
          { error: 'Failed to update violation zone' },
          { status: 500 }
        );
      }

      console.log('✅ Violation added to existing location');
      return NextResponse.json({ data: updatedLocation });

    } else {
      console.log('🆕 Creating new location with violation');
      
      // Create new location with violation
      const newLocation = {
        address: sanitizedData.address,
        lat: sanitizedData.lat,
        lng: sanitizedData.lng,
        violations: [{
          id: crypto.randomUUID(),
          violation_type: sanitizedData.violationType,
          reports: [{
            id: crypto.randomUUID(),
            reporter_id: 'user_' + Date.now(),
            date: new Date().toISOString(),
            reason: sanitizedData.reasons,
            suggested_solutions: sanitizedData.solutions,
            created_at: new Date().toISOString()
          }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      };

      const { data, error } = await supabase
        .from('locations')
        .insert([newLocation])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating new location:', error);
        return NextResponse.json(
          { error: 'Failed to create violation zone' },
          { status: 500 }
        );
      }

      console.log('✅ New violation zone created successfully');
      return NextResponse.json({ data });
    }

  } catch (error) {
    console.error('💥 Exception in POST /api/violations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 