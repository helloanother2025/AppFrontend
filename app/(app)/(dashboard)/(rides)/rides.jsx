import React, { useEffect, useCallback } from 'react';
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView';
import { StyledTitle as Title } from '../../../../components/StyledTitle';
import RideCard from '../../../../components/RideDisplayCard';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useRide } from '../../../../context/RideContext';


const UserRides = () => {
  const { myRides, joinedRides, fetchMyRides, fetchJoinedRides } = useRide();
  
  // Combine created and joined rides
  const allMyRides = [...myRides, ...joinedRides];
  console.log('🚗 Rides page - myRides:', myRides.length, 'joinedRides:', joinedRides.length);
  
  // Filter for ongoing (not completed, cancelled, or expired)
  const activeRides = allMyRides.filter((ride) => 
    ride.status && !['completed', 'cancelled', 'expired'].includes(ride.status)
  );
  console.log('📊 Active rides:', activeRides.length);
  
  // Filter for previous rides (completed, cancelled, or expired)
  const previousRides = allMyRides.filter((ride) => 
    ride.status && ['completed', 'cancelled', 'expired'].includes(ride.status)
  );
  console.log('📊 Previous rides:', previousRides.length);
  
  const router = useRouter();

  useEffect(() => {
    fetchMyRides();
    fetchJoinedRides();
  }, [fetchMyRides, fetchJoinedRides]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Rides page focused, refreshing rides');
      fetchMyRides();
      fetchJoinedRides();
    }, [fetchMyRides, fetchJoinedRides])
  );

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
