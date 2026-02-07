import { Stack } from 'expo-router';
import { RideProvider } from '../../../context/RideContext';

export default function CreateRideLayout() {
  return (
    <RideProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </RideProvider>
  );
}