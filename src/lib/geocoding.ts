import { supabase } from "@/integrations/supabase/client";

// Temporary type extension to handle the latitude/longitude columns
// until the database types are regenerated
interface SubmissionWithCoords {
  latitude?: number;
  longitude?: number;
};

// Haversine formula to calculate distance between two points
export function calculateDistance(
  userLat: number, 
  userLng: number, 
  targetLat: number, 
  targetLng: number
): number {
  console.log('🧮 MANUAL DISTANCE CALCULATION:');
  console.log('🧮 User coordinates:', { lat: userLat, lng: userLng });
  console.log('🧮 Target coordinates:', { lat: targetLat, lng: targetLng });
  
  const R = 3959; // Earth's radius in miles
  const dLat = (targetLat - userLat) * Math.PI / 180;
  const dLon = (targetLng - userLng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(userLat * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  console.log('🧮 Calculated distance:', distance, 'miles');
  
  // Manual verification using approximate formula for small distances
  const latDiff = Math.abs(targetLat - userLat);
  const lngDiff = Math.abs(targetLng - userLng);
  const approxMiles = Math.sqrt(
    Math.pow(latDiff * 69, 2) + 
    Math.pow(lngDiff * 54.6, 2) // approximate longitude miles at this latitude
  );
  console.log('🧮 Approximate verification:', approxMiles, 'miles');
  
  return distance;
}

// Get coordinates for an address (with caching)
export async function getCoordinatesForAddress(address: string): Promise<{lat: number, lng: number} | null> {
  try {
    console.log('Calling geocode-distance function for address:', address);
    const { data, error } = await supabase.functions.invoke('geocode-distance', {
      body: { address }
    });

    console.log('Geocode function response - data:', data, 'error:', error);

    if (error) {
      console.error('Error geocoding address:', error);
      return null;
    }

    if (data?.latitude && data?.longitude) {
      const result = {
        lat: data.latitude,
        lng: data.longitude
      };
      console.log('Returning coordinates:', result);
      return result;
    }

    console.log('No coordinates in response data:', data);
    return null;
  } catch (error) {
    console.error('Error in getCoordinatesForAddress:', error);
    return null;
  }
}

// Cache vendor coordinates in the database
export async function cacheVendorCoordinates(
  vendorId: string, 
  address: string
): Promise<{lat: number, lng: number} | null> {
  try {
    // First check if coordinates are already cached
    const { data: existingVendor } = await supabase
      .from('submissions')
      .select('latitude, longitude')
      .eq('id', vendorId)
      .single();

    if ((existingVendor as any)?.latitude && (existingVendor as any)?.longitude) {
      return {
        lat: (existingVendor as any).latitude,
        lng: (existingVendor as any).longitude
      };
    }

    // Get coordinates from geocoding service
    const coords = await getCoordinatesForAddress(address);
    
    if (coords) {
      // Cache the coordinates using raw update to avoid type issues
      await supabase
        .from('submissions')
        .update({ 
          latitude: coords.lat, 
          longitude: coords.lng 
        } as any)
        .eq('id', vendorId);
    }

    return coords;
  } catch (error) {
    console.error('Error caching vendor coordinates:', error);
    return null;
  }
}