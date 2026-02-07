import React, { use } from 'react';
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView'
import { StyledTitle as Title } from '../../../../components/StyledTitle' 
import { StyledNavigatorButton as NavButton } from '../../../../components/StyledNavigatorButton'
import RouteMap from '../../../../components/RouteMap'
import RideCard from '../../../../components/RideDisplayCard'
import rides from '../../../../data/rideData.json'
import { useRouter } from 'expo-router'; 

export default function FareCalculation() {
  const router = useRouter();
  const currentRide = rides[0];

  return (
    <ScrollView>
      <Title>Ride completed!</Title>

      <RouteMap ride={currentRide} />

      <RideCard ride={currentRide} />

      <NavButton
        onPress={() => router.push('/fareCalculation')}
        back={false}
        style={{ width: '25%', marginTop: 15, alignSelf: 'flex-end'}}
      />

    </ScrollView>
  )
}
