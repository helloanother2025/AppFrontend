import { StyleSheet, TouchableOpacity } from 'react-native';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import { StyledTitle as Title } from '../../../components/StyledTitle';
import RideCard from '../../../components/RideDisplayCard';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useCallback } from 'react';
import { useRide } from '../../../context/RideContext';

const Dash = () => {
  const { myRides, joinedRides, rides, fetchMyRides, fetchJoinedRides, selectRide } = useRide();
  
  // Combine created and joined rides, filter for ongoing (not completed)
  const allMyRides = [...myRides, ...joinedRides];
  // console.log removed
  const ongoingRides = allMyRides.filter((r) => {
    const status = String(r.status ?? r.currentStatus ?? r.current_status ?? '').toLowerCase();
    const fareStatus = String(r.fareStatus ?? '').toLowerCase();
    if (['cancelled', 'expired'].includes(status)) return false;
    if (status === 'completed' && fareStatus === 'complete') return false;
    return true;
  });
  // console.log removed
  const activeRide = ongoingRides[0] || null;
  
  const router = useRouter();

  useEffect(() => {
    fetchMyRides();
    fetchJoinedRides();
  }, [fetchMyRides, fetchJoinedRides]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // console.log removed
      fetchMyRides();
      fetchJoinedRides();
    }, [fetchMyRides, fetchJoinedRides])
  );

  return (
    <ScrollView>
      <Title>Start your journey!</Title>

      {/* Create Ride -> route directly to chooseStart if recent rides empty */}
      <TouchableOpacity style={styles.button} onPress={() => router.push('/create')}>
        <Text style={styles.buttonTitle}>Create a Ride</Text>
        <Text style={styles.buttonText}>
          Choose your destination and look for others to share the journey.
        </Text>
      </TouchableOpacity>

      {/* Join Ride */}
      <TouchableOpacity style={styles.button} onPress={() => router.push('/availableRides')}>
        <Text style={styles.buttonTitle}>Join a Ride</Text>
        <Text style={styles.buttonText}>
          Find others going your way who are also looking to share.
        </Text>
      </TouchableOpacity>

      {/* Fare Calculation 
      <TouchableOpacity style={styles.button} onPress={() => router.push('/fareCalculation')}>
        <Text style={styles.buttonTitle}>Fare Calculation</Text>
        <Text style={styles.buttonText}>
          Calculate and split fare for your current ride.
        </Text>
      </TouchableOpacity> */}

      <Title style={{marginTop: 10}}>Your ongoing rides</Title>

      {/* Ride Card */}
      {activeRide ? (
        <RideCard
          ride={activeRide}
          ongoing={true}
          onPress={() => {
            selectRide(activeRide);
            router.push(`/${activeRide.id}`);
          }}
        />
      ) : (
        <Text style={{ marginTop: 10 }}>No active rides yet.</Text>
      )}
    </ScrollView>
  );
};

export default Dash;

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  button: {
    marginVertical: 10,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#1f1f1f',
  },
  buttonTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 6,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
});
