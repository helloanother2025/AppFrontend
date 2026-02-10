import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import DualMapSearchWrapper from '../../../components/DualMapSearchWrapper';
import { StyledNavigatorButton as NavButton } from '../../../components/StyledNavigatorButton';
import { useRouter } from 'expo-router';
import { useSearch } from '../../../context/SearchContext';
import { getDirections } from '../../../src/utils/mapServices';

export default function SearchRoute() {
  const router = useRouter();
  const { searchData, setSearchData } = useSearch();

  const [start, setStart] = useState(searchData.start || null);
  const [dest, setDest] = useState(searchData.destination || null);

  const save = async () => {
    let polyline = null;

    // Fetch polyline if both start and destination have coordinates
    if (start?.coords && dest?.coords) {
      try {
        const startCoords = { latitude: start.coords.lat, longitude: start.coords.lng };
        const destCoords = { latitude: dest.coords.lat, longitude: dest.coords.lng };
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