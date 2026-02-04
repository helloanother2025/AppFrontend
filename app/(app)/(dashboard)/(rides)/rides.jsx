import React, { useEffect, useCallback } from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView';
import { StyledTitle as Title } from '../../../../components/StyledTitle';
import { StyledText as Text } from '../../../../components/StyledText';
import RideCard from '../../../../components/RideDisplayCard';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useRide } from '../../../../context/RideContext';
import { useUser } from '../../../../context/UserContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';


const UserRides = () => {
  const { myRides, joinedRides, fetchMyRides, fetchJoinedRides, deleteRide } = useRide();
  const { currentUser } = useUser();
  
  // Combine created and joined rides
  const allMyRides = [...myRides, ...joinedRides];
  console.log('🚗 Rides page - myRides:', myRides.length, 'joinedRides:', joinedRides.length);
  
  // Filter for ongoing (completed rides with pending fare stay ongoing)
  const activeRides = allMyRides.filter((ride) => {
    const status = String(ride.status ?? ride.currentStatus ?? ride.current_status ?? '').toLowerCase();
    const fareStatus = String(ride.fareStatus ?? '').toLowerCase();
    if (['cancelled', 'expired'].includes(status)) return false;
    if (status === 'completed' && fareStatus === 'complete') return false;
    return true;
  });
  console.log('📊 Active rides:', activeRides.length);
  
  // Filter for previous rides (completed with fare complete, cancelled, or expired)
  const previousRides = allMyRides.filter((ride) => {
    const status = String(ride.status ?? ride.currentStatus ?? ride.current_status ?? '').toLowerCase();
    const fareStatus = String(ride.fareStatus ?? '').toLowerCase();
    if (['cancelled', 'expired'].includes(status)) return true;
    if (status === 'completed' && fareStatus === 'complete') return true;
    return false;
  });
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

      {activeRides.length === 0 && (
        <Text style={{ marginTop: 8 }}>No ongoing rides</Text>
      )}
      
      {activeRides.map((ride) => (
        <RideCard key={ride.id} ride={ride} ongoing={true} onPress={() => router.push(`/${ride.id}`)} />
      ))}

      <Title style={{marginTop: 10}}>Your previous rides</Title>

      {previousRides.length === 0 && (
        <Text style={{ marginTop: 8 }}>No past rides</Text>
      )}
      
      {previousRides.map((ride) => (
        <React.Fragment key={ride.id}>
          <View style={{ position: 'relative', width: '100%' }}>
            <RideCard ride={ride} onPress={() => router.push(`/${ride.id}`)} />
            {String(ride.creator?.user_id ?? ride.creator_id ?? '') === String(currentUser?.user_id ?? '') && (
              <TouchableOpacity
                style={{ position: 'absolute', top: 8, right: 8, padding: 6 }}
                onPress={() => {
                  Alert.alert(
                    'Delete ride',
                    'Remove ride from history?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const rideId = ride?.id ?? ride?.ride_id ?? ride?.rideId ?? ride?.ride_uuid;
                            if (!rideId) {
                              Alert.alert('Error', 'Ride ID not found');
                              return;
                            }
                            await deleteRide(rideId);
                          } catch (err) {
                            Alert.alert('Error', err.message || 'Failed to delete ride');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <FontAwesome name="trash" size={16} color="#9e9e9e" />
              </TouchableOpacity>
            )}
          </View>
        </React.Fragment>
      ))}
    </ScrollView>
  )
}

export default UserRides
