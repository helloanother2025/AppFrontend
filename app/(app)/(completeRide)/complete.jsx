import React from 'react';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView'
import { StyledTitle as Title } from '../../../components/StyledTitle' 
import { StyledText as Text } from '../../../components/StyledText'
import { StyledButton as Button } from '../../../components/StyledButton'; 
import RouteMap from '../../../components/RouteMap'
import RideCard from '../../../components/RideDisplayCard'
import { useRouter } from 'expo-router';
import { useRide } from '../../../context/RideContext';

export default function FareCalculation() {
  const router = useRouter();
  const { selectedRide, myRides, rides: availableRides } = useRide();
  const currentRide = selectedRide || myRides[0] || availableRides[0];

  if (!currentRide) {
    return (
      <ScrollView>
        <Title>Ride completed!</Title>
        <Text>No ride data available.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView>
      <Title>Ride completed!</Title>

      <RouteMap ride={currentRide} />

      <RideCard ride={currentRide} />

      <Button
          title='Next'
          onPress={() =>
            router.push('/fareCalculation')
        }
        style={{width: '100%'}}>
        </Button>

    </ScrollView>
  )
}
