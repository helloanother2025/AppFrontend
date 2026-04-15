import { TouchableOpacity, StyleSheet, View, Alert } from 'react-native'
import { StyledText as Text } from '../../../../components/StyledText'
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView'
import RideDetailsCard from '../../../../components/RideDetailsCard'
import { useLocalSearchParams, useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import RouteMap from '../../../../components/RouteMap'
import React, { useEffect, useState } from 'react';
import { useRide } from '../../../../context/RideContext';
import { useUser } from '../../../../context/UserContext';
import { StyledButton } from '../../../../components/StyledButton';

const RideDetails = () => {
  const { id } = useLocalSearchParams();
  const { rides, getRideDetails, deleteRide } = useRide();
  const { currentUser } = useUser();
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

  // Show edit/delete only if the logged-in user is the ride creator
  const isCreator =
    currentUser &&
    ride.creator &&
    String(ride.creator.user_id) === String(currentUser.user_id);

  // Only rides with status 'unactive' (scheduled, not yet started) can be edited
  const rideStatus = String(ride?.status ?? ride?.currentStatus ?? ride?.current_status ?? '').toLowerCase();
  const isEditable = isCreator && rideStatus === 'unactive';
  const isDeletable = isCreator && ['completed', 'cancelled', 'expired'].includes(rideStatus);

  const handleEdit = () => {
    router.push(`/(dashboard)/(rides)/editRide?id=${rideId}`);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Ride",
      "Are you sure you want to delete this ride?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRide(rideId);
              router.back();
            } catch (err) {
              Alert.alert('Delete Failed', err.message || 'Could not delete ride. Please try again.');
            }
          }
        }
      ]
    );
  };

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

      {isCreator && (isEditable || isDeletable) && (
        <View style={styles.buttonContainer}>
          {isEditable && (
            <View style={{flex: 1}}>
              <StyledButton onPress={handleEdit} title="Edit"></StyledButton>
            </View>
          )}
          {isDeletable && (
            <View style={{flex: 1}}>
              <StyledButton style={{backgroundColor: '#FF7272'}} onPress={handleDelete} title="Delete"></StyledButton>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

export default RideDetails;

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    paddingHorizontal: 20,
    gap: 20,
  },
});