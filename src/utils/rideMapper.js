import { parseServerDate } from './date';

const formatRideDate = (value) => {
  if (!value) {
    return { day: '', time: '' };
  }

  const date = value instanceof Date ? value : parseServerDate(value);
  if (!date || Number.isNaN(date.getTime())) {
    return { day: '', time: '' };
  }

  const day = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return { day, time };
};

const normalizeCoords = (coords) => {
  if (!coords) return null;

  const lat = coords.lat ?? coords.latitude;
  const lng = coords.lng ?? coords.longitude;

  if (lat === undefined || lng === undefined) {
    return null;
  }

  return { lat: Number(lat), lng: Number(lng) };
};

const ensureHandle = (handleValue, username) => {
  if (handleValue) return handleValue.startsWith('@') ? handleValue : `@${handleValue}`;
  if (username) return username.startsWith('@') ? username : `@${username}`;
  return '@user';
};

export const normalizeRide = (ride) => {
  if (!ride) return null;

  const alreadyNormalized = !!ride.start && !!ride.destination && !!ride.creator;
  const startTimeValue = ride.start_time ?? ride.startTime ?? ride.start_time_utc ?? ride.startTimeUtc ?? ride.dateTime;
  if (alreadyNormalized) {
    const startCoords = normalizeCoords(ride.start.coords) ?? ride.start.coords;
    const destCoords = normalizeCoords(ride.destination.coords) ?? ride.destination.coords;

    const actualFareValue = ride.actual_fare ?? ride.actualFare;
    const completionTimeValue = ride.completion_time ?? ride.completionTime;
    const statusValue = ride.status ?? ride.current_status ?? ride.currentStatus;

    return {
      ...ride,
      id: ride.id ?? ride.ride_id ?? ride.rideId,
      start: {
        ...ride.start,
        coords: startCoords,
      },
      destination: {
        ...ride.destination,
        coords: destCoords,
      },
      creator: {
        ...ride.creator,
        user_id: ride.creator.user_id ?? ride.creator.id ?? ride.creator.userId,
        name: ride.creator.name ?? ride.creator_name ?? ride.creatorName ?? 'Unknown',
        handle: ensureHandle(ride.creator.handle ?? ride.creator.username ?? ride.creator_username ?? ride.creatorHandle, ride.creator.username ?? ride.creator_username ?? ride.creatorHandle),
      },      date: startTimeValue ? formatRideDate(startTimeValue) : (ride.date ?? formatRideDate(ride.start_time ?? ride.startTime)),
      routePolyline: ride.routePolyline ?? ride.route_polyline ?? ride.routePolyline,
      createdAt: ride.createdAt ?? ride.created_at ?? ride.createdAtUtc ?? ride.created_at_utc,
      transportMode: ride.transport_mode ?? ride.transportMode ?? ride.transport,
      rideProvider: ride.ride_provider ?? ride.rideProvider,
      gender: ride.gender ?? ride.gender_preference ?? ride.genderPreference ?? 'Any',
      preferences: ride.preferences ?? ride.preference_notes ?? ride.notes ?? '',
      fare: ride.fare != null && ride.fare !== '0' && ride.fare !== '0.00' && ride.fare !== 0 ? ride.fare : 'TBA',
      fareStatus:
        completionTimeValue
          ? 'complete'
          : String(statusValue ?? '').toLowerCase() === 'completed'
          ? 'pending'
          : null,
      totalPassengers: ride.totalPassengers ?? ride.available_seats ?? ride.availableSeats ?? ride.seats ?? (ride.partners?.length || 1),
      partners: (() => {
        // Prefer partners if already normalized with coords
        if (Array.isArray(ride.partners) && ride.partners.length > 0 && ride.partners[0].start && ride.partners[0].destination) {
          return ride.partners;
        }
        // Map passengers array from backend (with possible coords)
        if (Array.isArray(ride.passengers)) {
          return ride.passengers.map((p) => ({
            name: p.name,
            handle: ensureHandle(p.username ?? p.handle, p.username),
            user_id: p.user_id ?? p.id ?? p.userId ?? p.passenger_id ?? p.passengerId ?? null,
            start: {
              name: p.start_name || p.start_address || 'Pickup',
              coords: (p.start_lat !== undefined && p.start_lng !== undefined)
                ? { lat: Number(p.start_lat), lng: Number(p.start_lng) }
                : null,
            },
            destination: {
              name: p.dest_name || p.dest_address || 'Drop-off',
              coords: (p.dest_lat !== undefined && p.dest_lng !== undefined)
                ? { lat: Number(p.dest_lat), lng: Number(p.dest_lng) }
                : null,
            },
          }));
        }
        // Fallback: map any partners array with just name/handle
        if (Array.isArray(ride.partners)) {
          return ride.partners.map((p) => ({
            name: p.name,
            handle: ensureHandle(p.handle, p.handle),
            user_id: p.user_id ?? p.id ?? p.userId ?? p.passenger_id ?? p.passengerId ?? null,
            start: { name: 'Pickup', coords: null },
            destination: { name: 'Drop-off', coords: null },
          }));
        }
        return [];
      })(),
      status: statusValue,
    };
  }

  const startCoords = normalizeCoords({
    lat: ride.start_lat ?? ride.startLat,
    lng: ride.start_lng ?? ride.startLng,
  });

  const destCoords = normalizeCoords({
    lat: ride.dest_lat ?? ride.destLat,
    lng: ride.dest_lng ?? ride.destLng,
  });

  const dateParts = formatRideDate(startTimeValue ?? ride.start_time ?? ride.startTime);

  const actualFareValue = ride.actual_fare ?? ride.actualFare;
  const completionTimeValue = ride.completion_time ?? ride.completionTime;
  const statusValue = ride.current_status ?? ride.status ?? '';

  return {
    id: ride.ride_id ?? ride.id ?? ride.rideId,
    start: {
      name: ride.start_name ?? ride.start_address ?? ride.startLocation?.name ?? ride.startLocation?.address ?? 'Unknown start',
      coords: startCoords,
    },
    destination: {
      name: ride.dest_name ?? ride.dest_address ?? ride.endLocation?.name ?? ride.endLocation?.address ?? 'Unknown destination',
      coords: destCoords,
    },
    creator: {
      name: ride.name ?? ride.creator_name ?? ride.creatorName ?? ride.creator?.name ?? 'Unknown',
      user_id: ride.creator_id ?? ride.creatorId ?? ride.user_id ?? ride.userId ?? ride.creator?.user_id,
      handle: ensureHandle(ride.username ?? ride.creator_username ?? ride.creatorHandle ?? ride.creator?.handle ?? ride.creator?.username, ride.username ?? ride.creator_username ?? ride.creatorHandle),
    },
    partners: Array.isArray(ride.passengers)
      ? ride.passengers.map((p) => ({
          name: p.name,
          handle: ensureHandle(p.username ?? p.handle, p.username),
          user_id: p.user_id ?? p.id ?? p.userId ?? p.passenger_id ?? p.passengerId ?? null,
          start: {
            name: p.start_name || p.start_address || 'Pickup',
            coords: (p.start_lat !== undefined && p.start_lng !== undefined)
              ? { lat: Number(p.start_lat), lng: Number(p.start_lng) }
              : null,
          },
          destination: {
            name: p.dest_name || p.dest_address || 'Drop-off',
            coords: (p.dest_lat !== undefined && p.dest_lng !== undefined)
              ? { lat: Number(p.dest_lat), lng: Number(p.dest_lng) }
              : null,
          },
        }))
      : [],
    date: dateParts,
    fare: ride.fare != null && ride.fare !== '0' && ride.fare !== '0.00' && ride.fare !== 0 ? ride.fare : 'TBA',
    totalPassengers: ride.available_seats ?? ride.availableSeats ?? ride.totalPassengers ?? (Array.isArray(ride.passengers) ? ride.passengers.length : 1),
    transportMode: ride.transport_mode ?? ride.transportMode ?? ride.transport ?? '',
    rideProvider: ride.ride_provider ?? ride.rideProvider ?? '',
    preferences: ride.preference_notes ?? ride.notes ?? '',
    gender: ride.gender_preference ?? ride.genderPreference ?? ride.gender ?? 'Any',
    routePolyline: ride.route_polyline ?? ride.routePolyline ?? '',
    fareStatus:
      completionTimeValue
        ? 'complete'
        : String(statusValue ?? '').toLowerCase() === 'completed'
        ? 'pending'
        : null,
    createdAt: ride.created_at ?? ride.createdAt ?? ride.created_at_utc ?? ride.createdAtUtc,
    status: statusValue,
  };
};

export const normalizeRideList = (rides = []) => rides
  .map(normalizeRide)
  .filter(Boolean);

export const ensureRideShape = (ride, fallbackRide = null) => {
  if (ride) return normalizeRide(ride);
  return fallbackRide ? normalizeRide(fallbackRide) : null;
};
