import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useHideTabBar } from '../../../hooks/useHideTabBar';
import DualMapSearchWrapper from '../../../components/DualMapSearchWrapper';
import { StyledNavigatorButton as NavButton } from '../../../components/StyledNavigatorButton';
import { useRouter } from 'expo-router';
import { useSearch } from '../../../context/SearchContext';
import { getDirections } from '../../../src/utils/mapServices';

export default function SearchRoute() {
  useHideTabBar();
  const router = useRouter();
  const { searchData, setSearchData } = useSearch();

  const [start, setStart] = useState(searchData.start || null);
  const [dest, setDest] = useState(searchData.destination || null);

  const save = async () => {
    const getCoords = (loc) => {
      if (!loc) return null;
      if (loc.coords) return { latitude: loc.coords.lat ?? loc.coords.latitude, longitude: loc.coords.lng ?? loc.coords.longitude };
      if (loc.geometry?.location) return { latitude: loc.geometry.location.lat, longitude: loc.geometry.location.lng };
      const lat = loc.lat ?? loc.latitude;
      const lng = loc.lng ?? loc.longitude;
      if (lat !== undefined && lng !== undefined) return { latitude: lat, longitude: lng };
      return null;
    };

    const startCoords = getCoords(start);
    const destCoords = getCoords(dest);
    let polyline = null;

    // Fetch polyline if both start and destination have coordinates
    if (startCoords && destCoords) {
      try {
        const directions = await getDirections(startCoords, destCoords);
        polyline = directions?.polyline ?? null;
      } catch (error) {
        console.error('Error fetching directions in searchRoute:', error);
      }
    }

    setSearchData(prevDetails => ({
      ...prevDetails,
      start: start,
      destination: dest,
      routePolyline: polyline,
    }));
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <DualMapSearchWrapper
        allowBoth={true}
        startValue={start?.name} // Pass only the name for display
        destinationValue={dest?.name} // Pass only the name for display
        onStartSelected={setStart}
        onDestinationSelected={setDest}
      />

      <View style={styles.row}>
        <NavButton title="Back" onPress={() => router.back()} />
        {(start || dest) && <NavButton back={false} title="Confirm" onPress={save} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    top: 570,
    left: 20,
    right: 20,
    zIndex: 1,
    flexDirection: 'row',
    alignSelf: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto', 
    marginTop: 15,
  }
});