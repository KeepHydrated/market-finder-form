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
    const body = await req.json();
    const { address, lat, lng } = body;
    
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.log('No Google Maps API key found, returning null');
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

    // Reverse geocoding: coordinates to address/zipcode
    if (lat !== undefined && lng !== undefined) {
      const reverseGeocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      
      console.log(`Reverse geocoding: ${lat}, ${lng}`);
      
      const response = await fetch(reverseGeocodeUrl);
      const data = await response.json();
      
      console.log(`Reverse geocoding response status: ${data.status}`);
      
      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.log(`Reverse geocoding failed: ${data.status}`);
        return new Response(
          JSON.stringify({ 
            zipcode: null,
            city: null,
            state: null,
            formatted_address: null,
            error: `Reverse geocoding failed: ${data.status}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract zipcode, city, state from address components
      let zipcode = null;
      let city = null;
      let state = null;
      const formatted_address = data.results[0]?.formatted_address || null;

      for (const result of data.results) {
        for (const component of result.address_components || []) {
          if (component.types.includes('postal_code') && !zipcode) {
            zipcode = component.long_name;
          }
          if (component.types.includes('locality') && !city) {
            city = component.long_name;
          }
          if (component.types.includes('administrative_area_level_1') && !state) {
            state = component.short_name;
          }
        }
        if (zipcode && city && state) break;
      }

      console.log(`Reverse geocoded to: ${city}, ${state} ${zipcode}`);
      
      return new Response(
        JSON.stringify({ 
          zipcode,
          city,
          state,
          formatted_address
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Forward geocoding: address to coordinates
    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Address or coordinates required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    
    console.log(`Geocoding address: ${address}`);
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();
    
    console.log(`Geocoding response status: ${data.status}`);
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.log(`Geocoding failed: ${data.status}, error_message: ${data.error_message || 'none'}`);
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