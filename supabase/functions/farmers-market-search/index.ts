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
    const { query, location } = await req.json();
    
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

    // Build the search query to specifically find farmers markets
    const searchQuery = `farmers market ${query}`;
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}&type=establishment`;
    
    // Add location bias if provided
    if (location && location.lat && location.lng) {
      url += `&location=${location.lat},${location.lng}&radius=25000`;
      console.log(`Using location bias: ${location.lat}, ${location.lng}`);
    }
    
    console.log('Searching for farmers markets with query:', searchQuery);
    
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

    // Filter and transform results to focus on farmers markets
    const farmersMarkets = data.results
      ?.filter((place: any) => {
        const name = place.name?.toLowerCase() || '';
        const types = place.types || [];
        
        // Filter for places that are likely farmers markets
        return (
          name.includes('market') || 
          name.includes('farmer') ||
          name.includes('farm') ||
          types.includes('food') ||
          types.includes('grocery_or_supermarket') ||
          types.includes('establishment')
        ) && (
          // Additional filtering to ensure it's market-related
          name.includes('market') ||
          name.includes('farmer') ||
          name.includes('farm') ||
          place.formatted_address?.toLowerCase().includes('market')
        );
      })
      .slice(0, 8) // Limit to 8 results for autocomplete
      .map((place: any) => ({
        place_id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        opening_hours: place.opening_hours,
        photos: place.photos?.[0] ? [{
          photo_reference: place.photos[0].photo_reference
        }] : [],
        geometry: place.geometry,
        types: place.types,
        // Create a display format similar to Google Places autocomplete
        description: `${place.name}, ${place.formatted_address}`,
        structured_formatting: {
          main_text: place.name,
          secondary_text: place.formatted_address
        }
      })) || [];

    console.log(`Found ${farmersMarkets.length} farmers markets for query: ${query}`);

    return new Response(JSON.stringify({ 
      predictions: farmersMarkets,
      status: 'OK'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in farmers-market-search:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});