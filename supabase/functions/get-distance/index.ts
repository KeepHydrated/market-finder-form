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
    const { origin, destination } = await req.json();
    
    if (!origin || !destination) {
      return new Response(
        JSON.stringify({ error: 'Origin and destination coordinates are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.log('No Google Maps API key found');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Google Maps Distance Matrix API to get actual driving distance
    const distanceUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&units=imperial&key=${apiKey}`;
    
    console.log(`Getting distance from Google Maps: ${origin.lat},${origin.lng} to ${destination.lat},${destination.lng}`);
    
    const response = await fetch(distanceUrl);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.rows || data.rows.length === 0 || !data.rows[0].elements || data.rows[0].elements.length === 0) {
      console.log(`Distance Matrix API failed: ${data.status}`);
      return new Response(
        JSON.stringify({ error: 'Could not calculate distance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const element = data.rows[0].elements[0];
    
    if (element.status !== 'OK') {
      console.log(`Distance calculation failed: ${element.status}`);
      return new Response(
        JSON.stringify({ error: 'Could not calculate distance between locations' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const distanceText = element.distance.text; // e.g., "2.2 mi"
    const distanceMeters = element.distance.value;
    const durationText = element.duration.text; // e.g., "7 min"
    
    // Convert meters to miles for consistency
    const distanceMiles = (distanceMeters * 0.000621371).toFixed(1);
    
    console.log(`Google Maps distance: ${distanceText} (${distanceMiles} miles), Duration: ${durationText}`);
    
    return new Response(
      JSON.stringify({ 
        distance: distanceText,
        distanceMiles: parseFloat(distanceMiles),
        duration: durationText,
        googleMapsUrl: `https://maps.google.com/maps?saddr=${origin.lat},${origin.lng}&daddr=${destination.lat},${destination.lng}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-distance function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})