import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { StyledText as Text } from '../../../../components/StyledText';
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView';
import RideCard from '../../../../components/RideDisplayCard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRide } from '../../../../context/RideContext';


export default function RideList() {
  const router = useRouter();
  const { rides: ridesParam, title } = useLocalSearchParams();
  const { selectRide, updateRideStatus } = useRide();
  const [localRides, setLocalRides] = useState(() => {
    if (!ridesParam) return [];
    try {
      return JSON.parse(ridesParam);
    } catch {
      return [];
    }
  });
  const displayTitle = useMemo(() => title || 'Rides', [title]);

  // Handler to sync localRides after status change from RideDetailsCard
  const handleStatusChange = (rideId, newStatus) => {
    setLocalRides((prev) => prev.filter((r) => String(r.id) !== String(rideId)));
  };

  return (
    <View style={{flex: 1}}>
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={[styles.scrollContent, {minHeight: '100%', paddingBottom: 148}]}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.title}>{displayTitle}</Text>
        {localRides.length === 0 && <Text style={styles.empty}>No rides found.</Text>}
        {localRides.map((ride, idx) => {
          // Show Start Ride or Complete Ride button for own rides
          const creatorId = ride?.creator_id ?? ride?.creator?.user_id ?? ride?.creator?.id;
          const currentUserId = (typeof window !== 'undefined' && window.currentUserId) || undefined;
          const isOwnRide = creatorId && currentUserId && String(creatorId) === String(currentUserId);
          const status = String(ride.status ?? ride.currentStatus ?? ride.current_status ?? '').toLowerCase();
          const showStartButton = isOwnRide && status === 'unactive';
          const showCompleteButton = isOwnRide && status === 'started';
          return (
            <View key={`${ride.id ?? 'noid'}-${idx}`} style={styles.cardWrapper}>
              <RideCard
                ride={ride}
                join={false}
                onPress={() => router.push({
                  pathname: `/ride/${ride.id}`,
                  params: { onStatusChange: handleStatusChange.toString() }
                })}
              />
              {showStartButton && (
                <TouchableOpacity
                  style={{marginTop: 8, backgroundColor: '#4caf50', borderRadius: 8, padding: 12, alignItems: 'center'}}
                  onPress={async () => {
                    try {
                      const updated = await updateRideStatus(ride.id, 'started');
                      selectRide(updated || ride);
                      setLocalRides((prev) => prev.filter((r) => String(r.id) !== String(ride.id)));
                      alert('Ride started!');
                    } catch (e) {
                      alert('Failed to start ride');
                    }
                  }}
                >
                  <Text style={{color: 'white', fontWeight: 'bold'}}>Start Ride</Text>
                </TouchableOpacity>
              )}
              {showCompleteButton && (
                <TouchableOpacity
                  style={{marginTop: 8, backgroundColor: '#000', borderRadius: 8, padding: 12, alignItems: 'center'}}
                  onPress={() => {
                    selectRide(ride);
                    router.push({
                      pathname: '../../(completeRide)/complete',
                      params: { ride: JSON.stringify(ride) }
                    });
                  }}
                >
                  <Text style={{color: 'white', fontWeight: 'bold'}}>Complete ride</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    marginLeft: 4,
  },
  empty: {
    fontSize: 16,
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
  },
  cardWrapper: {
    width: '100%',
    marginBottom: 14,
  },
});
