import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native' 
import { StyledTitle as Title } from '../../../components/StyledTitle'
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView'
import { StyledButton as Button } from '../../../components/StyledButton'
import MapSearchWrapper from '../../../components/MapSearchWrapper'
import { useRouter } from 'expo-router'
import { useSearch } from '../../../context/SearchContext'
import { getDirections } from '../../../src/utils/mapServices'

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