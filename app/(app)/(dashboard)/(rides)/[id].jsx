import { TouchableOpacity, StyleSheet } from 'react-native'
import { StyledText as Text } from '../../../../components/StyledText'
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView'
import RideDetailsCard from '../../../../components/RideDetailsCard'
import { useLocalSearchParams, useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import RouteMap from '../../../../components/RouteMap'
import React, { useEffect, useState } from 'react';
import { useRide } from '../../../../context/RideContext';


const RideDetails = () => {
  const { id } = useLocalSearchParams();
  const { rides, getRideDetails } = useRide();
  const [ride, setRide] = useState(null);

  const rideId = Array.isArray(id) ? id[0] : id;

  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const fetched = await getRideDetails(rideId);
      const fallback = rides.find((r) => String(r.id) === String(rideId));
      if (isMounted) {
        setRide(fetched || fallback || null);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [rideId, getRideDetails, rides]);

  if (!ride) {
    return (
      <ScrollView>
        <Text>Ride not found.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <FontAwesome style={{marginRight: 10}} name="chevron-left" size={14} color="black" />
        <Text style={{fontSize: 16, fontWeight: 'semibold'}}>Back</Text>
      </TouchableOpacity>

      <RouteMap ride={ride} />

      <RideDetailsCard
        ride={ride}
        ongoing={(() => {
          const status = String(ride?.status ?? ride?.currentStatus ?? ride?.current_status ?? '').toLowerCase();
          const fareStatus = String(ride?.fareStatus ?? '').toLowerCase();
          if (["cancelled", "expired"].includes(status)) return false;
          if (status === 'completed' && fareStatus === 'complete') return false;
          return true;
        })()}
      />
    </ScrollView>
  );
};

export default RideDetails;

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});