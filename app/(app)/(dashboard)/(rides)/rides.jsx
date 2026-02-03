import React, { useEffect } from 'react';
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView';
import { StyledTitle as Title } from '../../../../components/StyledTitle';
import RideCard from '../../../../components/RideDisplayCard';
import { useRouter } from 'expo-router';
import { useRide } from '../../../../context/RideContext';


const UserRides = () => {
  const { myRides, fetchMyRides } = useRide();
  const activeRides = myRides.filter((ride) => ['unactive', 'started'].includes(ride.status));
  const previousRides = myRides.filter((ride) => ['completed', 'cancelled', 'expired'].includes(ride.status));
  const router = useRouter();

  useEffect(() => {
    fetchMyRides();
  }, [fetchMyRides]);

  return (
    <ScrollView>
      <Title>Your ongoing rides</Title>
      
      {activeRides.map((ride) => (
        <RideCard key={ride.id} ride={ride} ongoing={true} onPress={() => router.push(`/${ride.id}`)} />
      ))}

      <Title style={{marginTop: 10}}>Your previous rides</Title>
      
      {previousRides.map((ride) => (
        <RideCard key={ride.id} ride={ride} onPress={() => router.push(`/${ride.id}`)} />
      ))}
    </ScrollView>
  )
}

export default UserRides
