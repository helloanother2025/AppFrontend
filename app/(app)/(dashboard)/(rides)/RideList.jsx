import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { StyledText as Text } from '../../../../components/StyledText';
import { StyledTitle as Title } from '../../../../components/StyledTitle';
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView';
import RideCard from '../../../../components/RideDisplayCard';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useRide } from '../../../../context/RideContext';
import { useUser } from '../../../../context/UserContext';

export default function RideList() {
  const router = useRouter();
  // `filter` is one of: 'ongoing' | 'created' | 'past'
  const { filter, title } = useLocalSearchParams();
  const { myRides, fetchMyRides, updateRideStatus, selectRide } = useRide();
  const { currentUser } = useUser();

  const userId = currentUser?.user_id ?? currentUser?.id;

  // Refresh myRides from server every time this screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchMyRides();
    }, [fetchMyRides])
  );

  // Derive the list to show from the live RideContext data, not stale params
  const filteredRides = useCallback(() => {
    switch (filter) {
      case 'ongoing':
        return myRides.filter((r) => {
          const s = String(r.status ?? r.currentStatus ?? r.current_status ?? '').toLowerCase();
          return s === 'ongoing' || s === 'started';
        });
      case 'created':
        return myRides.filter((r) => {
          const s = String(r.status ?? r.currentStatus ?? r.current_status ?? '').toLowerCase();
          const creator = String(r.creator_id ?? r.creator?.user_id ?? r.creator?.id ?? '');
          return s === 'unactive' && creator === String(userId ?? '');
        });
      case 'past':
        return myRides.filter((r) => {
          const s = String(r.status ?? r.currentStatus ?? r.current_status ?? '').toLowerCase();
          return ['completed', 'cancelled', 'expired'].includes(s);
        });
      default:
        return myRides;
    }
  }, [myRides, filter, userId])();

  const displayTitle = title || 'Rides';

  return (
    <ScrollView>
      <Title>{displayTitle}</Title>

      {filteredRides.length === 0 && (
        <Text style={styles.empty}>No rides found.</Text>
      )}

      {filteredRides.map((ride, idx) => {
        const status = String(ride.status ?? ride.currentStatus ?? ride.current_status ?? '').toLowerCase();
        const creatorId = String(ride.creator_id ?? ride.creator?.user_id ?? ride.creator?.id ?? '');
        const isOwnRide = userId && creatorId === String(userId);
        const showStartButton = isOwnRide && status === 'unactive';
        const showCompleteButton = isOwnRide && (status === 'started' || status === 'ongoing');

        return (
          <View key={`${ride.id ?? 'noid'}-${idx}`} style={styles.cardWrapper}>
            <RideCard
              ride={ride}
              join={false}
              onPress={() => router.push(`/ride/${ride.id}`)}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 16,
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
  },
  cardWrapper: {
    width: '100%',
    marginBottom: 2,
  },
  startBtn: {
    marginTop: 8,
    backgroundColor: '#4caf50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  completeBtn: {
    marginTop: 8,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

