import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function RidesLayout() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to the rides list (index) when this layout mounts
    router.replace('/(dashboard)/(rides)');
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}