import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { StyledText as Text } from '../../../../components/StyledText';
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView'; 
import { StyledTitle as Title } from '../../../../components/StyledTitle'; 
import { useRide } from '../../../../context/RideContext';
import RideCard from '../../../../components/RideDisplayCard';
import RouteMap from '../../../../components/RouteMap';


export default function RideCreated() {
  const { rideData } = useRide();
  const router = useRouter();

  return (
    <ScrollView>
      <Title>Your ride is created!</Title>

      <RouteMap ride={rideData} />

      <RideCard create={true} ride={rideData} style={{marginTop: 15}} />

      <View style={{flexDirection: 'column', alignSelf: 'center', alignItems: 'center', marginVertical: 15}}>
        <Text style={{textAlign: 'center'}}>Other users can now see your ride!</Text>
        <Text style={{textAlign: 'center'}}>Check your notifications for join requests.</Text>
      </View>

    </ScrollView>
  )
}




