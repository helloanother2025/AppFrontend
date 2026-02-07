import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { StyledNavigatorButton as NavButton } from '../../../../components/StyledNavigatorButton'
import MapSearchWrapper from '../../../../components/MapSearchWrapper'
import { useRouter } from 'expo-router'
import { useRide } from '../../../../context/RideContext'

export default function ChooseStart() {
  const router = useRouter()
  const [selectedStart, setSelectedStart] = useState(null)
  const [selectedDestination, setSelectedDestination] = useState(null)
  const { rideData, setRideData } = useRide();

  const handleStartSelected = (place) => {
    setSelectedStart(place);
    setRideData(prevDetails => ({ ...prevDetails, start: { name: place.formatted_address, coords: place.geometry.location } }));
  }

  const handleDestinationSelected = (place) => {
    setSelectedDestination(place);
    setRideData(prevDetails => ({ ...prevDetails, destination: { name: place.formatted_address, coords: place.geometry.location } }));
  }

  return (
    <View>
      <MapSearchWrapper 
        allowBoth={true}
        onStartSelected={handleStartSelected}
        onDestinationSelected={handleDestinationSelected}
        startQuery={rideData?.start?.name}
        destinationQuery={rideData?.destination?.name}
      />

      <View style={styles.buttonRow}>
        <NavButton
          onPress={() => router.back()}
          style={{ width: '25%', backgroundColor: '#fff' }}
        />
        {selectedStart && selectedDestination && (
        <NavButton
          onPress={() => router.push('/chooseDate')}
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