export type LatLng = {
  latitude: number;
  longitude: number;
};

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type RouteGeometry = {
  type: 'LineString';
  coordinates: [number, number][];
};

export type RouteMetrics = {
  distanceKm: number;
  durationMin: number;
};

export type DirectionsResult = RouteMetrics & {
  polyline: RouteGeometry;
  coordinates: LatLng[];
};

export type PlaceSuggestion = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
};
