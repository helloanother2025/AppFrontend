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
  // Restriction logic only applies in join mode
  const isGenderRestricted =
    !!join && (genderPreference === 'male' || genderPreference === 'female') &&
    userGender &&
    userGender !== genderPreference;
  const rideStatus = String(ride?.status ?? ride?.currentStatus ?? ride?.current_status ?? '').toLowerCase();
  const completionTime = ride?.completion_time ?? ride?.completionTime;
  const fareStatus = String(ride?.fareStatus ?? '').toLowerCase();
  const isRideCompleted = rideStatus === 'completed' || !!completionTime;
  const isFareComplete = fareStatus === 'complete';
  const isFarePending = fareStatus === 'pending';

  // handleRequest and restriction logic only relevant for join mode
  const handleRequest = async () => {
    if (!join) return;
    // ...existing code for join mode only...
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
        Alert.alert('Success', 'Ride has been completed!');
        router.push({
          pathname: '/complete',
          params: { ride: JSON.stringify(updated || ride) }
        });
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
  
    const handleStartRide = async () => {
      if (!ride?.id) {
        Alert.alert('Error', 'Ride information missing');
        return;
      }
  
      try {
        const updated = await updateRideStatus(ride.id, 'started');
        selectRide(updated || ride);
        Alert.alert('Success', 'Ride has started!');
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to start ride');
      }
    };
  
    // Determine if this is the user's own created ride and is unactive
    const creatorId = ride?.creator_id ?? ride?.creator?.user_id ?? ride?.creator?.id;
    const currentUserId = currentUser?.user_id ?? currentUser?.id;
    const isOwnRide = creatorId && currentUserId && String(creatorId) === String(currentUserId);
    const showStartButton = isOwnRide && rideStatus === 'unactive';
    const showCompleteButton = isOwnRide && rideStatus === 'started';
  
    return (
      <CardButton onPress={onPress} disabled={onPress ? false : true}>
        {/* Only show gender badge and any restriction/join UI in join/create mode */}
        {join && ride.gender != 'Any' && (
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
          <TouchableOpacity          style={styles.creatorRow}
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
      {ride.transportMode && (
        <View style={styles.transportContainer}>
          <View style={{ width: '33%', flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 12 }}>Transport</Text>
            <Text style={[styles.rideText, { fontWeight: 'semibold' }]}>
              {ride.transportMode === 'Car' && ride.rideProvider ? `Car (${ride.rideProvider})` : ride.transportMode}
            </Text>
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
      

      {/* All action buttons removed for clean slate */}

      {/* Action buttons for completing or calculating fare are intentionally removed for clean slate */}

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
      {/* Start Ride button always at the bottom */}
      {showStartButton && (
        <Button
          title="Start ride"
          style={{ marginTop: 16, marginBottom: 4, backgroundColor: '#000' }}
          textStyle={{ color: '#fff', fontWeight: 'bold' }}
          onPress={async () => {
            try {
              const updated = await updateRideStatus(ride.id, 'started');
              selectRide(updated || ride);
              Alert.alert('Success', 'Ride has started!');
            } catch (e) {
              Alert.alert('Error', 'Failed to start ride');
            }
          }}
        />
      )}
      {showCompleteButton && (
        <Button
          title="Complete ride"
          style={{ marginTop: 16, marginBottom: 4, backgroundColor: '#000' }}
          textStyle={{ color: '#fff', fontWeight: 'bold' }}
          onPress={handleComplete}
        />
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
