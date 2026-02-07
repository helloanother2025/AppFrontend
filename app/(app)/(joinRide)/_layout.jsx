
import { Stack } from 'expo-router';
import { SearchProvider } from '../../../context/SearchContext';

export default function JoinRideLayout() {
  return (
    <SearchProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SearchProvider>
  );
}
