import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { StyledText as Text } from '../../../../components/StyledText';
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView';
import { useRide } from '../../../../context/RideContext';
import { useRouter } from 'expo-router';
import { useUser } from '../../../../context/UserContext';

export default function RideStatusPage() {
  const { rides, myRides } = useRide();
  const { currentUser } = useUser();
  const router = useRouter();

  const userId = currentUser?.user_id || currentUser?.id;

  const ongoingRides = rides.filter((ride) => ride.status === 'ongoing');
  const createdRides = myRides.filter(
    (ride) => ride.status === 'unactive' && String(ride.creator_id ?? ride.creator?.user_id ?? ride.creator?.id) === String(userId)
  );
  const pastRides = rides.filter((ride) => ['completed', 'cancelled', 'expired'].includes(ride.status));
  // Removed favourites logic

  const navigateToRides = (rides, title) => {
    try {
      router.push({ pathname: '/(dashboard)/(rides)/RideList', params: { rides: JSON.stringify(rides), title } });
    } catch (e) {
      router.back();
    }
  };

  // Only use myRides for all ride lists (exclude joined rides)
  const filteredOngoing = (myRides || []).filter(
    (ride) => {
      const status = String(ride.status ?? ride.currentStatus ?? ride.current_status ?? '').toLowerCase();
      return status === 'ongoing' || status === 'started';
    }
  );
  const filteredCreated = (myRides || []).filter(
    (ride) => String(ride.status ?? ride.currentStatus ?? ride.current_status ?? '').toLowerCase() === 'unactive'
      && String(ride.creator_id ?? ride.creator?.user_id ?? ride.creator?.id) === String(userId)
  );
  const filteredPast = (myRides || []).filter(
    (ride) => ['completed', 'cancelled', 'expired'].includes(String(ride.status ?? ride.currentStatus ?? ride.current_status ?? '').toLowerCase())
  );
  // Removed favourites logic

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.box} onPress={() => navigateToRides(filteredOngoing, 'Ongoing rides')}>
        <Text style={styles.boxText}>Ongoing rides</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.box} onPress={() => navigateToRides(filteredCreated, 'Created rides')}>
        <Text style={styles.boxText}>Created rides</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.box} onPress={() => navigateToRides(filteredPast, 'Past rides')}>
        <Text style={styles.boxText}>Past rides</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.box} onPress={() => router.push('/(dashboard)/(rides)/JoinRequestsList')}>
        <Text style={styles.boxText}>Join requests</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7f7f7',
  },
  box: {
    backgroundColor: '#e0e0e0',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    width: '100%',
  },
  boxText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});