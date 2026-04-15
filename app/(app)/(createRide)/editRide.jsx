// This page has moved to (dashboard)/(rides)/editRide.jsx
// This redirect exists to prevent any stale links from 404-ing.
import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function EditRideRedirect() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  useEffect(() => {
    router.replace(`/(dashboard)/(rides)/editRide${id ? `?id=${id}` : ''}`);
  }, [id]);

  return null;
}