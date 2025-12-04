import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    
    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.log('No Google Maps API key found, returning null coordinates');
      return new Response(
        JSON.stringify({ 
          latitude: null, 
          longitude: null,
          error: 'API key not configured',
          cached: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Geocode the address using Google Maps API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    
    console.log(`Geocoding address: ${address}`);
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();
    
    console.log(`Geocoding response status: ${data.status}`);
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.log(`Geocoding failed: ${data.status}, error_message: ${data.error_message || 'none'}`);
      // Return null coordinates instead of error - let frontend handle gracefully
      return new Response(
        JSON.stringify({ 
          latitude: null, 
          longitude: null,
          error: `Geocoding failed: ${data.status}`,
          cached: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const location = data.results[0].geometry.location;
    
    console.log(`Geocoded ${address} to: ${location.lat}, ${location.lng}`);
    
    return new Response(
      JSON.stringify({ 
        latitude: location.lat, 
        longitude: location.lng,
        cached: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in geocode-distance function:', error);
    // Return null coordinates on error instead of 500
    return new Response(
      JSON.stringify({ 
        latitude: null, 
        longitude: null,
        error: 'Internal server error',
        cached: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
