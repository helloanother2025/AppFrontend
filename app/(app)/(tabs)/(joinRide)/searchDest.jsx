import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StyledTitle as Title } from '../../../../components/StyledTitle'
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView'
import { StyledButton as Button } from '../../../../components/StyledButton'
import MapSearchWrapper from '../../../../components/MapSearchWrapper'
import { useRouter } from 'expo-router'
<<<<<<< HEAD:app/(app)/(joinRide)/searchDest.jsx
import { useSearch } from '../../../context/SearchContext'
import { getDirections } from '../../../src/utils/mapServices'
=======
import { useSearch } from '../../../../context/SearchContext'

const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const decodePolyline = (t) => {
  let points = [];
  let index = 0, lat = 0, lng = 0;

  while (index < t.length) {
    let b, shift = 0, result = 0;
    do {
      b = t.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = t.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
};
>>>>>>> 336be2c1f4079923bcf50547ca694e33982a6197:app/(app)/(tabs)/(joinRide)/searchDest.jsx

export default function SearchDest() {
  const router = useRouter()
  const [selectedPlace, setSelectedPlace] = useState('')
  const { searchData, setSearchData } = useSearch();

  const fetchDirections = async (start, destination) => {
    try {
      const directions = await getDirections(start, destination);
      return directions?.polyline ?? null;
    } catch (error) {
      console.error('Error fetching directions:', error);
      return null;
    }
  };

  const handlePlaceSelected = async (place) => {
    setSelectedPlace(place);
    const newDestination = { name: place.formatted_address, coords: { lat: place.geometry.location.lat, lng: place.geometry.location.lng } };
    
    const startCoords = searchData.start.coords ? { latitude: searchData.start.coords.lat, longitude: searchData.start.coords.lng } : null;
    const destCoords = newDestination.coords ? { latitude: newDestination.coords.lat, longitude: newDestination.coords.lng } : null;

    let polyline = null;
    if (startCoords && destCoords) {
      polyline = await fetchDirections(startCoords, destCoords);
    }

    setSearchData(prevDetails => ({
      ...prevDetails,
      destination: newDestination,
      routePolyline: polyline,
    }));
  }

  return (
    <ScrollView>
      <Title>Search destination</Title>

      <MapSearchWrapper onPlaceSelected={handlePlaceSelected} searchQuery={selectedPlace?.formatted_address} style={{width: '100%'}} />

      <View style={styles.buttonRow}>
        <Button
            title='Back'
            onPress={() => router.back()}
            style={{ width: '30%' }}
          ></Button>

        {selectedPlace && (
          <Button
            style={{ width: '35%' }}
            title='Confirm'
            onPress={() =>
              router.back()
            }>
          </Button>   
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    width: '100%',
  },
})