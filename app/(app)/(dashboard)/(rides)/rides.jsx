// ...existing code removed...
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
  const { myRides, joinedRides, fetchMyRides, fetchJoinedRides, deleteRide, selectRide } = useRide();
  const { currentUser } = useUser();
  
  // Combine created and joined rides
  const allMyRides = [...myRides, ...joinedRides];
  // console.log removed
  
  // Filter for ongoing rides (no completion/fare logic for clean slate)
  const activeRides = allMyRides.filter((ride) => {
    const status = String(ride.status ?? ride.currentStatus ?? ride.current_status ?? '').toLowerCase();
    if (['cancelled', 'expired', 'completed'].includes(status)) return false;
    return true;
  });
  // console.log removed
  
  // Filter for previous rides (completed, cancelled, or expired)
  const previousRides = allMyRides.filter((ride) => {
    const status = String(ride.status ?? ride.currentStatus ?? ride.current_status ?? '').toLowerCase();
    if (['cancelled', 'expired', 'completed'].includes(status)) return true;
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
        <React.Fragment key={ride.id}>
          <RideCard
            ride={ride}
            ongoing={true}
            onPress={() => {
              selectRide(ride);
              router.push(`/ride/${ride.id}`);
            }}
          />
          {/* List Passengers */}
          {Array.isArray(ride.partners) && ride.partners.length > 0 && (
            <View style={{ marginTop: 8, marginBottom: 16 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Passengers:</Text>
              {ride.partners.map((partner, idx) => {
                const profileId = partner.username || partner.handle;
                if (!profileId) return null;
                return (
                  <TouchableOpacity
                    key={profileId + idx}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
                    onPress={() => router.push(`/user/${profileId}`)}
                  >
                    <Text style={{ fontSize: 22, marginRight: 8 }}>👤</Text>
                    <Text style={{ fontWeight: '500' }}>{partner.name}</Text>
                    <Text style={{ color: '#888', marginLeft: 6 }}>@{partner.username || partner.handle}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </React.Fragment>
      ))}

      <Title style={{marginTop: 10}}>Your previous rides</Title>

      {previousRides.length === 0 && (
        <Text style={{ marginTop: 8 }}>No past rides</Text>
      )}
      
      {previousRides.map((ride) => (
        <React.Fragment key={ride.id}>
          <View style={{ position: 'relative', width: '100%' }}>
            <RideCard ride={ride} onPress={() => router.push(`/ride/${ride.id}`)} />
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
