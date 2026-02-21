// Free mapping services using OpenStreetMap and OpenRouteService
// Using Reverse Geocoding and forward geocoding with English language support

/**
 * Reverse Geocoding - Get address from coordinates
 * Uses Nominatim with language parameter for English
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=en`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RideShare-App'
      }
    });
    const data = await response.json();
    
    // console.log('Reverse geocode response:', data);
    
    if (data && data.address) {
      // Try to get a readable name from the address components
      const name = data.address.road || 
                   data.address.residential || 
                   data.address.suburb ||
                   data.address.city ||
                   data.address.town ||
                   data.display_name;
      
      return {
        name: name,
        address: data.display_name,
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return null;
  }
};

/**
 * Search for places using Nominatim (free geocoding service)
 * Language set to English to avoid Bangla characters
 */
export const searchPlaces = async (query) => {
  try {
    // Accept-Language: en forces English results from OpenStreetMap
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=20&countrycodes=bd&accept-language=en`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RideShare-App',
        'Accept-Language': 'en'
      }
    });
    const data = await response.json();
    
    // console.log('Nominatim response:', data);
    
    if (!data || data.length === 0) {
      console.log('No results from Nominatim');
      return [];
    }
    
    // Convert to Google Places format for compatibility
    const formatted = data.map(item => ({
      place_id: item.osm_id,
      description: item.display_name,
      name: item.name || item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      geometry: {
        location: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        }
      }
    }));
    
    // console.log('Formatted suggestions:', formatted);
    return formatted;
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
};

// Get place details (for Nominatim results)
export const getPlaceDetails = async (place) => {
  try {
    // For Nominatim, we already have the data we need
    return {
      result: {
        name: place.name,
        formatted_address: place.description,
        geometry: {
          location: {
            lat: parseFloat(place.lat || place.geometry?.location?.lat),
            lng: parseFloat(place.lon || place.geometry?.location?.lng)
          }
        }
      }
    };
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
};

/**
 * OpenRouteService - Free routing and directions (open source, no key required for self-hosted or generous free tier)
 * Using the public API (free tier available)
 */

// Get directions between two coordinates
export const getDirections = async (start, end) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        polyline: route.geometry, // This is now a GeoJSON object
        distance: route.distance / 1000, // Convert to km
        duration: route.duration / 60, // Convert to minutes
        coordinates: route.geometry.coordinates.map(c => ({longitude: c[0], latitude: c[1]}))
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching directions:', error);
    return null;
  }
};

// Get distance matrix for multiple routes
export const getDistances = async (origins, destinations) => {
  try {
    // OSRM doesn't have a built-in distance matrix, so we make individual requests
    const results = [];

    for (let origin of origins) {
      for (let destination of destinations) {
        const directions = await getDirections(origin, destination);
        if (directions) {
          results.push({
            origin,
            destination,
            distance: directions.distance,
            duration: directions.duration
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error getting distances:', error);
    return [];
  }
};

// Get single distance between two coordinates
export const getDistance = async (start, end) => {
  try {
    const directions = await getDirections(start, end);
    return directions ? { distance: directions.distance, duration: directions.duration } : null;
  } catch (error) {
    console.error('Error getting distance:', error);
    return null;
  }
};

/**
 * Polyline encoding/decoding
 * Used by various map services
 */

// Decode polyline (for OSRM format)
export const decodePolyline = (t) => {
  let points = [];
  let index = 0, lat = 0, lng = 0;

  while (index < t.length) {
    let b, shift = 0, result = 0;
    do {
      b = t.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = t.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
};

// Calculate distance between two coordinates using Haversine formula (for simple calculations)
export const haversineDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
