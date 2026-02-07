import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StyledNavigatorButton as NavButton } from '../../../../components/StyledNavigatorButton' 
import MapSearchWrapper from '../../../../components/MapSearchWrapper'
import { useRouter } from 'expo-router'
import { useSearch } from '../../../../context/SearchContext'

export default function SearchRoute() {
  const router = useRouter()
  const {searchData, setSearchData} = useSearch();
  
  // Initialize state from searchData if it exists
  const [selectedStart, setSelectedStart] = useState(
    searchData?.start?.name ? { formatted_address: searchData.start.name, geometry: { location: searchData.start.coords } } : null
  )
  const [selectedDestination, setSelectedDestination] = useState(
    searchData?.destination?.name ? { formatted_address: searchData.destination.name, geometry: { location: searchData.destination.coords } } : null
  )

  // Sync state when searchData changes externally
  useEffect(() => {
    if (searchData?.start?.name && searchData.start.coords) {
      setSelectedStart({ formatted_address: searchData.start.name, geometry: { location: searchData.start.coords } })
    } else if (!searchData?.start?.name) {
      setSelectedStart(null)
    }
  }, [searchData?.start?.name])

  useEffect(() => {
    if (searchData?.destination?.name && searchData.destination.coords) {
      setSelectedDestination({ formatted_address: searchData.destination.name, geometry: { location: searchData.destination.coords } })
    } else if (!searchData?.destination?.name) {
      setSelectedDestination(null)
    }
  }, [searchData?.destination?.name])

  const handleStartSelected = (place) => {
    setSelectedStart(place);
    setSearchData(prevDetails => ({ ...prevDetails, start: { name: place.formatted_address, coords: place.geometry.location } }));
  }

  const handleDestinationSelected = (place) => {
    setSelectedDestination(place);
    setSearchData(prevDetails => ({ ...prevDetails, destination: { name: place.formatted_address, coords: place.geometry.location } }));
  }

  const handleClearStart = () => {
    setSelectedStart(null);
    setSearchData(prevDetails => ({ ...prevDetails, start: { name: '', coords: null } }));
  }

  const handleClearDestination = () => {
    setSelectedDestination(null);
    setSearchData(prevDetails => ({ ...prevDetails, destination: { name: '', coords: null } }));
  }

  return (
    <View>
      <MapSearchWrapper 
        allowBoth={true}
        onStartSelected={handleStartSelected}
        onDestinationSelected={handleDestinationSelected}
        startQuery={searchData?.start?.name}
        destinationQuery={searchData?.destination?.name}
      />

      <View style={styles.buttonRow}>
        <NavButton
          onPress={() => router.back()}
          style={{ width: '25%', backgroundColor: '#fff' }}
        />
        {(selectedStart || selectedDestination) && (
        <NavButton
          onPress={() => router.back()}
          back={false}
          style={{ width: '25%', backgroundColor: '#fff' }}
        />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  title: {
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  buttonRow: {
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
  },
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    flex: 1,
  },
  rideText: {
    fontSize: 14,
    flex: 1,
  },
  icon: {
    marginRight: 10
  }
});