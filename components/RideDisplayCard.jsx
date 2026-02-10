import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { StyledText as Text } from './StyledText';
import { StyledCardButton as CardButton } from './StyledCardButton';
import { StyledButton as Button } from './StyledButton';
import { StyledBorderText as BorderText } from './StyledBorderText';
import { StyledBorderView as BorderView } from './StyledBorderView';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Octicons from '@expo/vector-icons/Octicons';
import { useRouter } from 'expo-router'; 
import { joinRequestsAPI } from '../src/api/joinRequests';
import { useSearch } from '../context/SearchContext';
import { useUser } from '../context/UserContext';
import { useRide } from '../context/RideContext';

export default function RideDisplayCard({ ride, join = false, create = false, ongoing = false, onPress }) {
  const [isRequested, setIsRequested] = useState(false);
  const [joinStatus, setJoinStatus] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const router = useRouter();
  const { searchData } = useSearch();
  const { currentUser } = useUser();
  const { selectRide, updateRideStatus } = useRide();

  useEffect(() => {
    const checkStatus = async () => {
      if (ride?.id && join) {
        try {
          const response = await joinRequestsAPI.checkJoinStatus(ride.id);
          if (response.hasRequested) {
            setIsRequested(true);
            setJoinStatus(response.status);
          }
        } catch (error) {
          console.error('Failed to check join status:', error);
        }
      }
    };
    checkStatus();
  }, [ride?.id, join]);

  const maxPassengers = Number(ride?.totalPassengers ?? 0);
  const currentPassengers = Array.isArray(ride?.partners) ? ride.partners.length : 0;
  const isFull = maxPassengers > 0 && currentPassengers >= maxPassengers;
  const genderPreference = String(ride?.gender ?? ride?.gender_preference ?? '').toLowerCase();
  const userGender = String(currentUser?.gender ?? '').toLowerCase();
  const isGenderRestricted =
    (genderPreference === 'male' || genderPreference === 'female') &&
    userGender &&
    userGender !== genderPreference;
  const rideStatus = String(ride?.status ?? ride?.currentStatus ?? ride?.current_status ?? '').toLowerCase();
  const completionTime = ride?.completion_time ?? ride?.completionTime;
  const fareStatus = String(ride?.fareStatus ?? '').toLowerCase();
  const isRideCompleted = rideStatus === 'completed' || !!completionTime;
  const isFareComplete = fareStatus === 'complete';
  const isFarePending = fareStatus === 'pending';

  const handleRequest = async () => {
    if (!ride?.id) {
      Alert.alert('Error', 'Ride information missing');
      return;
    }

    if (isRequested) {
      return;
    }

    if (isFull) {
      Alert.alert('Ride Full', 'This ride has reached the maximum number of partners.');
      return;
    }

    if (isGenderRestricted) {
      Alert.alert('Restricted', 'This ride has a gender preference and cannot accept join requests.');
      return;
    }

    setRequesting(true);

    const creatorId = ride?.creator_id ?? ride?.creator?.user_id ?? ride?.creator?.id;
    const currentUserId = currentUser?.user_id ?? currentUser?.id;
    if (creatorId != null && currentUserId != null && String(creatorId) === String(currentUserId)) {
      Alert.alert('You are not authorized to join your own ride');
      return;
    }

    try {
      const normalizeCoords = (coords) => {
        if (!coords) return null;
        const lat = coords.lat ?? coords.latitude;
        const lng = coords.lng ?? coords.longitude;
        return (lat !== undefined && lng !== undefined) ? { lat, lng } : null;
      };

      const startCoords = normalizeCoords(searchData.start?.coords);
      const destCoords = normalizeCoords(searchData.destination?.coords);

      await joinRequestsAPI.submitJoinRequest(
        ride.id,
        startCoords ? {
          name: searchData.start?.name || searchData.start?.address || 'Start Location',
          latitude: startCoords.lat,
          longitude: startCoords.lng,
        } : null,
        destCoords ? {
          name: searchData.destination?.name || searchData.destination?.address || 'Destination',
          latitude: destCoords.lat,
          longitude: destCoords.lng,
        } : null,
        searchData.routePolyline || null
      );

      setIsRequested(true);
      setJoinStatus('pending');
      Alert.alert('Success', 'Your request has been sent! Check notifications for updates.');
      router.push('/joinRequested');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit join request');
    } finally {
      setRequesting(false);
    }
  };

  const handleComplete = async () => {
    if (isRideCompleted && isFareComplete) {
      return;
    }

    try {
      let updated = ride;
      if (!isRideCompleted) {
        updated = await updateRideStatus(ride?.id, 'completed');
      }
      // Always normalize before selecting
      selectRide(updated || ride);
      router.push('/fareCalculation');
      setIsCompleted(true);
    } catch (error) {
      const message = error?.message || 'Failed to complete ride';
      if (message.toLowerCase().includes('not authorized')) {
        Alert.alert('You are not authorized');
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  return (

    <CardButton onPress={onPress} disabled={onPress ? false : true}>

    {(join || create) && (ride.gender != 'Any') && (
        <View
          style={[
            styles.genderBadge,
            ride.gender.toLowerCase() === 'female' ? styles.femaleBadge : styles.maleBadge
          ]}>
          <Text style={styles.genderText}>
            {ride.gender.toLowerCase() === 'female' ? 'Female only' : 'Male only'}
          </Text>
        </View>
      )}

      {/* Ride creator */}
      {(join || create || ongoing) && (
        <TouchableOpacity
          style={styles.creatorRow}
          activeOpacity={0.7}
          onPress={() => {
            // Only navigate if not current user
            const creatorHandle = ride.creator.handle || ride.creator.username;
            const creatorId = ride?.creator_id ?? ride?.creator?.user_id ?? ride?.creator?.id;
            const currentUserId = currentUser?.user_id ?? currentUser?.id;
            if (!join && creatorHandle && (!currentUserId || String(creatorId) !== String(currentUserId))) {
              router.push(`/user/${creatorHandle}`);
            }
          }}
        >
          <Text style={{ fontSize: 30 }}>👤 </Text>
          <View>
            <Text style={{ fontWeight: 'semibold', fontSize: 16 }}>{ride.creator.name}</Text>
            <Text style={styles.handle}>{ride.creator.handle}</Text>
          </View>
        </TouchableOpacity>
      )}
      
      {/* Start location */}
      <View style={[styles.rideRow, { marginVertical: 0 }]}>
        <Octicons name="dot-fill" size={18} color="#e63e4c" style={styles.icon} />
        <View style={{ flex: 1 }}>
          <BorderText style={styles.rideText}>{ride.start.name}</BorderText>
        </View>
      </View>

      {/* Destination */}
      <View style={[styles.rideRow, { marginVertical: 0 }]}>
        <Entypo name="location-pin" size={18} color="#e63e4c" style={styles.icon} />
        <View style={{ flex: 1 }}>
          <BorderText style={styles.rideText}>{ride.destination.name}</BorderText>
        </View>
      </View>

      {/* Time & date */}
      {ride.date.day && ride.date.time && (
        <View style={styles.rideRow}>
          <FontAwesome name="clock-o" size={14} color="#888" style={[styles.icon, { marginLeft: 4 }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rideText}>{ride.date.day}, {ride.date.time}</Text>
          </View>
        </View>
      )}
      

      {/* Transport, seats, fare */}
      {ride.transport && (
        <View style={styles.transportContainer}>
          <View style={{ width: '33%', flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 12 }}>Transport</Text>
            <Text style={[styles.rideText, { fontWeight: 'semibold' }]}>{ride.transport}</Text>
          </View>

          <View style={{ width: '33%', alignItems: 'center' }}>
            <Text style={{ fontSize: 12 }}>Seats</Text>
            <Text style={[styles.rideText, { fontWeight: 'semibold' }]}> 
              {(() => {
                // Show number of empty seats for available rides
                const total = Number(ride.totalPassengers ?? ride.available_seats ?? ride.seats ?? 0);
                const taken = Array.isArray(ride.partners) ? ride.partners.length : 0;
                const empty = total - taken;
                return empty > 0 ? empty : 0;
              })()}
            </Text>
          </View>

          <View style={{ width: '33%', alignItems: 'center' }}>
            <Text style={{ fontSize: 12 }}>Total fare</Text>
            {ride.fare === 'TBA' ? (
              <Text style={[styles.rideText, { fontWeight: 'semibold' }]}>TBA</Text>
            ) : (
              <Text style={[styles.rideText, { fontWeight: 'semibold' }]}>BDT {ride.fare}</Text>
            )}
          </View>
        </View>
      )}
      

      {join && (
        <View style={{ width: '100%', alignItems: 'center', marginTop: 10 }}>
          <Button
            style={[
              { width: '90%' },
              (isRequested || requesting || isFull || isGenderRestricted) && { backgroundColor: '#ababab' }
            ]}
            title={
              requesting ? "Sending..." :
              isRequested ? (
                joinStatus === 'accepted' ? "Already Joined" :
                joinStatus === 'rejected' ? "Request Declined" :
                joinStatus === 'cancelled' ? "Request Cancelled" :
                "Request Sent"
              ) :
              isFull ? "Ride Full" : isGenderRestricted ? "Restricted" : "Request to join"
            }
            onPress={handleRequest}
            disabled={isRequested || requesting || isFull || isGenderRestricted}
          />
        </View>
      )}

      {/* Only show one button: Complete ride (if not completed), Calculate fare (if completed and fare is pending), nothing if both done */}
      {ongoing && (
        (!isRideCompleted && (
          <Button
            title="Complete ride"
            style={{ marginTop: 10 }}
            onPress={handleComplete}
          />
        )) ||
        (isRideCompleted && isFarePending && (
          <Button
            title="Calculate fare"
            style={{ marginTop: 10 }}
            onPress={handleComplete}
          />
        ))
      )}

      {(create && ride.preferences) && ( <>
        <View style={styles.subtitle}>
          <Text style={[styles.rideText,{fontWeight: 'semibold'}]}>Preferences</Text>
        </View>

        <BorderView>
          <View style={{flexDirection: 'row'}}>
            <View style={styles.rideColumn}>
              <Text style={styles.rideText}>Total passengers:</Text>
            </View>
            <View style={styles.rideColumn}>
              <Text style={styles.rideText}>{ride.partners.length} / {ride.totalPassengers}</Text>
            </View>
          </View>

          <View style={{flexDirection: 'row'}}>
            <View style={styles.rideColumn}>
              <Text style={styles.rideText}>Preferred gender:</Text>
            </View>
            <View style={styles.rideColumn}>
              <Text style={styles.rideText}>{ride.gender}</Text>
            </View>
          </View>

          <View style={{flexDirection: 'row'}}>
            <View style={styles.rideColumn}>
              <Text style={styles.rideText}>Other:</Text>
            </View>
            <View style={styles.rideColumn}>
              <Text style={styles.rideText}>{ride.preferences ? ride.preferences : '-'}</Text>
            </View>
          </View>
        </BorderView>
      </>
      )}
    </CardButton>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontWeight: 'semibold', 
    fontSize: 14, 
    marginVertical: 5,
  },
  genderBadge: {
    position: 'absolute',
    top: -10,
    right: 15,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    zIndex: 10,
  },
  femaleBadge: {
    backgroundColor: '#f0a5c6',
  },
  maleBadge: {
    backgroundColor: '#91cdeb',
  },
  genderText: {
    fontSize: 12,
    fontWeight: 'semibold',
    color: '#fff',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 8,
  },
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    flex: 1,
  }, 
  rideColumn: {
    alignItems: 'flex-start',
    marginTop: 5,
    width: '50%'
  },
  rideText: {
    fontSize: 14,
    flex: 1,
  },
  transportContainer: {
    borderRadius: 14,
    backgroundColor: '#eee',
    flexDirection: 'row',
    marginVertical: 6,
    padding: 8,
    alignItems: 'flex-end',
  },
  handle: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
  icon: {
    marginRight: 10,
  },
});
