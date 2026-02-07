import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

<<<<<<< HEAD:app/(app)/(dashboard)/(rides)/_layout.jsx
export default function RidesLayout() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to the rides list (index) when this layout mounts
    router.replace('/(dashboard)/(rides)');
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
=======
export default function CompleteRideLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
>>>>>>> 336be2c1f4079923bcf50547ca694e33982a6197:app/(app)/(tabs)/(completeRide)/_layout.jsx
}