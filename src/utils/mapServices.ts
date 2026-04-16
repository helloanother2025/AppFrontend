import type { RideLocation } from '../utils/rideMapper';
import type { DirectionsResult, GeoPoint, LatLng, PlaceSuggestion } from '../types/map';

type ReverseGeocodeResponse = {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    residential?: string;
    suburb?: string;
    city?: string;
    town?: string;
  };
};

type NominatimSearchResult = {
  osm_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
};

type OsrmResponse = {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: {
      type: 'LineString';
      coordinates: [number, number][];
    };
  }>;
};

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';

function toGeoPoint(point: GeoPoint | LatLng): GeoPoint {
  if ('lat' in point) {
    return point;
  }

  return {
    lat: point.latitude,
    lng: point.longitude,
  };
}

function toShortName(displayName: string): string {
  return displayName
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');
}

function toRideLocation(name: string, fullAddress: string, lat: number, lng: number): RideLocation {
  return {
    name: fullAddress,
    shortName: name,
    lat,
    lng,
  };
}

export async function reverseGeocode(latitude: number, longitude: number, signal?: AbortSignal): Promise<RideLocation | null> {
  try {
    const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=en`;
    const response = await fetch(url, {
      signal,
      headers: {
        'User-Agent': 'BashayJabo-Mobile',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as ReverseGeocodeResponse;
    const shortName =
      data.address?.road ||
      data.address?.residential ||
      data.address?.suburb ||
      data.address?.city ||
      data.address?.town ||
      toShortName(data.display_name);

    return toRideLocation(shortName, data.display_name, Number.parseFloat(data.lat), Number.parseFloat(data.lon));
  } catch {
    return null;
  }
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 2) {
    return [];
  }

  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=8&countrycodes=bd&accept-language=en`;
    const response = await fetch(url, {
      signal,
      headers: {
        'User-Agent': 'BashayJabo-Mobile',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as NominatimSearchResult[];
    return data.map((item) => ({
      id: `${item.osm_id}`,
      name: item.name || toShortName(item.display_name),
      description: item.display_name,
      lat: Number.parseFloat(item.lat),
      lng: Number.parseFloat(item.lon),
    }));
  } catch {
    return [];
  }
}

export function placeSuggestionToRideLocation(place: PlaceSuggestion): RideLocation {
  return toRideLocation(place.name, place.description, place.lat, place.lng);
}

export async function getDirections(start: GeoPoint | LatLng, end: GeoPoint | LatLng, signal?: AbortSignal): Promise<DirectionsResult | null> {
  try {
    const from = toGeoPoint(start);
    const to = toGeoPoint(end);
    const url = `${OSRM_BASE}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OsrmResponse;
    const route = data.routes?.[0];

    if (!route) {
      return null;
    }

    const coordinates = route.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));

    return {
      polyline: route.geometry,
      coordinates,
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch {
    return null;
  }
}
