import React from 'react';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView'
import { StyledTitle as Title } from '../../../components/StyledTitle' 
import { StyledText as Text } from '../../../components/StyledText'
import { StyledButton as Button } from '../../../components/StyledButton'; 
import RouteMap from '../../../components/RouteMap'
import RideCard from '../../../components/RideDisplayCard'
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRide } from '../../../context/RideContext';

export default function FareCalculation() {
  const router = useRouter();
  const params = useLocalSearchParams();
  let rideFromParams = null;
  if (params.ride) {
    try {
      rideFromParams = JSON.parse(params.ride);
    } catch (error) {
      console.error("Error parsing ride data from params:", error);
      console.log("Raw ride param:", params.ride);
    }
  }
  const { selectedRide, myRides, rides: availableRides } = useRide();
  const currentRide = rideFromParams || selectedRide || myRides[0] || availableRides[0];

  return (
    <ScrollView>
      <Title>Ride completed!</Title>

      {currentRide ? (
        <>
          <RouteMap ride={currentRide} />
          <RideCard ride={currentRide} />
          <Button
            title='Next'
            onPress={() =>
              router.push('/fareCalculation')
            }
            style={{width: '100%'}}>
          </Button>
        </>
      ) : (
        <Text>No ride data available.</Text>
      )}
    </ScrollView>
  )
}
