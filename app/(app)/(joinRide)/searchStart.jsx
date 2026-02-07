import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native' 
import { StyledTitle as Title } from '../../../components/StyledTitle'
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView'
import { StyledButton as Button } from '../../../components/StyledButton'
import MapSearchWrapper from '../../../components/MapSearchWrapper'
import { useRouter } from 'expo-router'
import { useSearch } from '../../../context/SearchContext'

export default function SearchStart() {
  const router = useRouter()
  const [selectedPlace, setSelectedPlace] = useState(null)
  const { setSearchData } = useSearch();

  const handlePlaceSelected = (place) => {
    setSelectedPlace(place);
    setSearchData(prevDetails => ({
      ...prevDetails,
      start: {
        name: place.formatted_address || place.address || place.name,
        coords: place.geometry?.location || { lat: place.latitude, lng: place.longitude }
      }
    }));
  }

  return (
    <ScrollView>
      <Title>Search starting point</Title>

      <MapSearchWrapper onPlaceSelected={handlePlaceSelected} searchQuery={selectedPlace?.formatted_address || ''} style={{width: '100%'}} />

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
            onPress={() => {
              setSearchData(prevDetails => ({
                ...prevDetails,
                start: {
                  name: selectedPlace.formatted_address || selectedPlace.address || selectedPlace.name,
                  coords: selectedPlace.geometry?.location || { lat: selectedPlace.latitude, lng: selectedPlace.longitude }
                }
              }));
              router.back();
            }}
          />   
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