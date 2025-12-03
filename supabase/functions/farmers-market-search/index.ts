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
    const { query, location, place_id } = await req.json();
    
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Google Places API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If place_id is provided, fetch place details directly
    if (place_id) {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=geometry,name,formatted_address,opening_hours,rating,user_ratings_total&key=${apiKey}`;
      console.log('Fetching place details for place_id:', place_id);
      
      const response = await fetch(detailsUrl);
      const data = await response.json();

      if (!response.ok) {
        console.error('Google Places Details API error:', data);
        return new Response(JSON.stringify({ 
          error: 'Google Places Details API error', 
          details: data 
        }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (data.result) {
        return new Response(JSON.stringify(data.result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({ error: 'Place not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Original query-based search logic
    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ error: 'Query must be at least 2 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use Places Autocomplete API for real-time suggestions (like Google Maps)
    const searchQuery = `${query} farmers market`;
    let autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(searchQuery)}&key=${apiKey}&types=establishment`;
    
    // Add location bias if provided - use smaller radius and strictbounds for local results
    if (location && location.lat && location.lng) {
      // Use 25km (~15 miles) radius with strictbounds to prioritize local results
      autocompleteUrl += `&location=${location.lat},${location.lng}&radius=25000&strictbounds=true`;
      console.log(`Using location bias: ${location.lat}, ${location.lng} with strictbounds`);
    }
    
    console.log('Searching with autocomplete for:', searchQuery);
    
    const autocompleteResponse = await fetch(autocompleteUrl);
    const autocompleteData = await autocompleteResponse.json();

    if (!autocompleteResponse.ok || autocompleteData.status === 'REQUEST_DENIED') {
      console.error('Google Places Autocomplete API error:', autocompleteData);
      return new Response(JSON.stringify({ 
        error: 'Google Places Autocomplete API error', 
        details: autocompleteData 
      }), {
        status: autocompleteResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const predictions = autocompleteData.predictions || [];
    console.log(`Autocomplete returned ${predictions.length} predictions`);

    // Fetch details for each prediction to get full info
    const farmersMarkets = await Promise.all(
      predictions.slice(0, 8).map(async (prediction: any) => {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,name,formatted_address,opening_hours,rating,user_ratings_total,photos&key=${apiKey}`;
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();
          
          const place = detailsData.result || {};
          
          return {
            place_id: prediction.place_id,
            name: place.name || prediction.structured_formatting?.main_text || prediction.description,
            address: place.formatted_address || prediction.structured_formatting?.secondary_text,
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            opening_hours: place.opening_hours,
            photos: place.photos?.[0] ? [{
              photo_reference: place.photos[0].photo_reference
            }] : [],
            geometry: place.geometry,
            description: prediction.description,
            structured_formatting: prediction.structured_formatting || {
              main_text: place.name,
              secondary_text: place.formatted_address
            }
          };
        } catch (error) {
          console.error('Error fetching place details for', prediction.description, error);
          return {
            place_id: prediction.place_id,
            name: prediction.structured_formatting?.main_text || prediction.description,
            address: prediction.structured_formatting?.secondary_text,
            description: prediction.description,
            structured_formatting: prediction.structured_formatting
          };
        }
      })
    );

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
