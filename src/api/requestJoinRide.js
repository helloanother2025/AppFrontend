import client from './client';

export async function requestJoinRide({ rideId, startLocation, destLocation }) {
  if (!rideId || !startLocation || !destLocation) throw new Error('Missing required fields');
  const res = await client.post(`/rides/${rideId}/join`, {
    startLocation: {
      name: startLocation.name || startLocation.formatted_address,
      address: startLocation.formatted_address || startLocation.address,
      latitude: startLocation.latitude || startLocation.geometry?.location?.lat,
      longitude: startLocation.longitude || startLocation.geometry?.location?.lng,
    },
    destLocation: {
      name: destLocation.name || destLocation.formatted_address,
      address: destLocation.formatted_address || destLocation.address,
      latitude: destLocation.latitude || destLocation.geometry?.location?.lat,
      longitude: destLocation.longitude || destLocation.geometry?.location?.lng,
    },
  });
  return res.data;
}
