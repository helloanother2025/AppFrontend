import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { StyledNavigatorButton as NavButton } from '../../../components/StyledNavigatorButton'
import DualMapSearchWrapper from '../../../components/DualMapSearchWrapper'
import { useRouter } from 'expo-router'
import { useRide } from '../../../context/RideContext'
import { getDirections } from '../../../src/utils/mapServices'

export default function ChooseRoute() {
  const router = useRouter()
  const [selectedStart, setSelectedStart] = useState(null)
  const [selectedDestination, setSelectedDestination] = useState(null)
  const { rideData, setRideData } = useRide();

  useEffect(() => {
    const fetchAndSetPolyline = async () => {
      if (selectedStart?.geometry?.location && selectedDestination?.geometry?.location) {
        const startCoords = selectedStart.geometry.location;
        const destCoords = selectedDestination.geometry.location;

        try {
          const directions = await getDirections(
            { latitude: startCoords.lat, longitude: startCoords.lng },
            { latitude: destCoords.lat, longitude: destCoords.lng }
          );
          if (directions?.polyline) {
            setRideData(prevDetails => ({
              ...prevDetails,
              routePolyline: directions.polyline,
            }));
          }
        } catch (error) {
          console.error("Error fetching directions for polyline:", error);
          setRideData(prevDetails => ({
            ...prevDetails,
            routePolyline: null, // Clear polyline on error
          }));
        }
      } else {
        setRideData(prevDetails => ({
          ...prevDetails,
          routePolyline: null, // Clear polyline if points are not selected
        }));
      }
    };

    fetchAndSetPolyline();
  }, [selectedStart, selectedDestination, setRideData]);

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
      <DualMapSearchWrapper 
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