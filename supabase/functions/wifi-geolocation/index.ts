import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    
    if (!apiKey) {
      console.error('[WIFI-GEOLOCATION] Google API key not configured')
      return new Response(
        JSON.stringify({ error: 'Google API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Google Geolocation API - uses IP address and any provided network info
    // When called without Wi-Fi data, it uses IP-based geolocation which is more accurate
    // than typical IP lookup services because Google has better IP mapping data
    const geolocationUrl = `https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`
    
    console.log('[WIFI-GEOLOCATION] Calling Google Geolocation API')
    
    const response = await fetch(geolocationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        considerIp: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[WIFI-GEOLOCATION] API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ error: `Geolocation API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    console.log('[WIFI-GEOLOCATION] Success:', JSON.stringify(data))

    // Google returns: { location: { lat, lng }, accuracy }
    return new Response(
      JSON.stringify({
        lat: data.location.lat,
        lng: data.location.lng,
        accuracy: data.accuracy // in meters
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[WIFI-GEOLOCATION] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
