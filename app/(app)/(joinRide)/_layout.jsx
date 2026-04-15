import { Stack } from 'expo-router';
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSearch } from '../../../context/SearchContext';

export default function JoinRideLayout() {
  const { resetSearchData } = useSearch();

  // Clear search context when the user leaves the joinRide section entirely
  useFocusEffect(
    useCallback(() => {
      return () => {
        resetSearchData();
      };
    }, [resetSearchData])
  );

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
