import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, zipcode } = await req.json();
    
    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ error: 'Query must be at least 2 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Google Places API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}`;
    
    // Add location bias for zipcode if provided
    if (zipcode) {
      // For better results, we could use a zipcode-to-coordinates service
      // For now, we'll add the zipcode as a region bias
      url += `&region=us`;
      
      // Try to get coordinates for common US zipcodes using a simple mapping
      // In production, you might want to use a proper zipcode geocoding service
      const getCoordinatesFromZipcode = (zip: string): { lat: number; lng: number } | null => {
        const zipToCoords: Record<string, { lat: number; lng: number }> = {
          // Texas zipcodes
          '78212': { lat: 29.4241, lng: -98.4936 },
          '78213': { lat: 29.4889, lng: -98.5151 },
          '78215': { lat: 29.4520, lng: -98.4826 },
          '78216': { lat: 29.5163, lng: -98.4968 },
          '78209': { lat: 29.4677, lng: -98.5042 },
          // Add more common zipcodes as needed
          '10001': { lat: 40.7505, lng: -73.9934 }, // NYC
          '90210': { lat: 34.0901, lng: -118.4065 }, // Beverly Hills
          '94102': { lat: 37.7849, lng: -122.4094 }, // San Francisco
          '60601': { lat: 41.8827, lng: -87.6233 }, // Chicago
          '33101': { lat: 25.7743, lng: -80.1937 }, // Miami
        };
        
        return zipToCoords[zip] || null;
      };
      
      const coords = getCoordinatesFromZipcode(zipcode);
      if (coords) {
        url += `&location=${coords.lat},${coords.lng}&radius=50000`; // 50km radius
        console.log(`Using location bias for zipcode ${zipcode}: ${coords.lat}, ${coords.lng}`);
      } else {
        console.log(`No coordinates found for zipcode ${zipcode}, using general US region`);
      }
    }
    
    console.log('Fetching Google Places suggestions for:', query);
    
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('Google Places API error:', data);
      return new Response(JSON.stringify({ 
        error: 'Google Places API error', 
        details: data 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Transform response
    const suggestions = data.predictions?.map((prediction: any) => ({
      place_id: prediction.place_id,
      description: prediction.description,
      structured_formatting: prediction.structured_formatting,
      types: prediction.types || []
    })) || [];

    console.log(`Found ${suggestions.length} suggestions for query: ${query}`);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in places-autocomplete:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});