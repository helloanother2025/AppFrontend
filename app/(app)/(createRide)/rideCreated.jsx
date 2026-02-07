import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView'; 
import { StyledTitle as Title } from '../../../components/StyledTitle'; 
import { useRide } from '../../../context/RideContext';
import RideCard from '../../../components/RideDisplayCard';
import RouteMap from '../../../components/RouteMap';


export default function RideCreated() {
  const { rideData, createRide, resetRideData } = useRide();
  const router = useRouter();
  const [createdRide, setCreatedRide] = useState(null);
  const [creationError, setCreationError] = useState(null);
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const submitRide = async () => {
      if (hasSubmittedRef.current) {
        return;
      }

      if (!rideData?.start?.coords || !rideData?.destination?.coords) {
        return;
      }

      if (!rideData.transport || !rideData.totalPassengers) {
        setCreationError('Missing ride details. Please go back and complete all steps.');
        return;
      }

      try {
        hasSubmittedRef.current = true;
        const startTime = new Date().toISOString();
        
        // Map transport modes to database enum values
        const transportMap = {
          'Uber': 'Car',
          'Pathao': 'Bike',
          'Car': 'Car',
          'CNG': 'CNG',
          'Bus': 'Bus',
          'Bike': 'Bike'
        };
        
        const payload = {
          startLocation: {
            name: rideData.start.name,
            address: rideData.start.name,
            latitude: rideData.start.coords.lat,
            longitude: rideData.start.coords.lng,
          },
          endLocation: {
            name: rideData.destination.name,
            address: rideData.destination.name,
            latitude: rideData.destination.coords.lat,
            longitude: rideData.destination.coords.lng,
          },
          startTime,
          transportMode: transportMap[rideData.transport] || rideData.transport,
          availableSeats: rideData.totalPassengers,
          fare: rideData.fare === 'TBA' ? 0 : parseFloat(rideData.fare || 0),
          rideProvider: 'Private',
          genderPreference: rideData.gender && rideData.gender !== 'Any' ? rideData.gender.toLowerCase() : null,
          notes: rideData.preferences,
          routePolyline: rideData.routePolyline,
        };

        const created = await createRide(payload);
        if (isMounted) {
          setCreatedRide(created);
          resetRideData();
        }
      } catch (error) {
        if (isMounted) {
          hasSubmittedRef.current = false;
          setCreationError(error.message || 'Failed to create ride');
        }
      }
    };

    submitRide();

    return () => {
      isMounted = false;
    };
  }, [createRide, rideData]);

  useEffect(() => {
    const onBackPress = () => {
      router.replace('/(app)/(dashboard)/dash');
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [router]);

  return (
    <ScrollView>
      <Title>Your ride is created!</Title>

      <RouteMap ride={createdRide || rideData} />

      <RideCard create={true} ride={createdRide || rideData} />

      {creationError && (
        <Text style={{ marginTop: 10, color: '#e63e4c' }}>{creationError}</Text>
      )}

      <View style={{flexDirection: 'column', alignSelf: 'center', alignItems: 'center', marginVertical: 15}}>
        <Text>Other users can now see your ride!</Text>
        <Text>Check your notifications for join requests.</Text>
      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 25, 
    paddingTop: 10, 
    backgroundColor: '#f7f7f7' 
  },
})





