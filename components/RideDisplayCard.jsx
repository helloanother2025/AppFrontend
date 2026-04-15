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
import ProfileImage from '../components/ProfileImage'

export default function RideDisplayCard({ ride, join = false, create = false, ongoing = false, onPress }) {
  const [isRequested, setIsRequested] = useState(false);
  const [joinStatus, setJoinStatus] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const router = useRouter();
  const { searchData } = useSearch();
  const { currentUser } = useUser();
  const { selectRide, updateRideStatus, fetchMyRides, fetchJoinedRides } = useRide();

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
  const isRideCompleted = rideStatus === 'completed' || !!completionTime;
  
  // Consolidate status flags from both branches
  const fareStatus = String(ride?.fareStatus ?? '').toLowerCase();
  const isFareComplete = fareStatus === 'complete';
  const isFarePending = fareStatus === 'pending';
  const isRideCancelled = rideStatus === 'cancelled';
  const isRideExpired = rideStatus === 'expired';

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

  const handleCancelRide = async () => {
    try {
      const updated = await updateRideStatus(ride.id, 'cancelled');
      selectRide(updated || ride);
      Alert.alert('Success', 'Ride has been cancelled!');
      // Belt-and-suspenders: re-fetch after a short delay so the dashboard
      // always sees the committed state from the backend.
      setTimeout(() => {
        fetchMyRides();
        fetchJoinedRides();
      }, 400);
    } catch (e) {
      Alert.alert('Error', 'Failed to cancel ride');
    }
  };

  // Inline 3-dot dropdown (anchors below the ⋯ button)
  const RideMenu = ({ showEdit }) => (
    <>
      {showEdit && (
        <TouchableOpacity
          style={menuStyles.menuItem}
          onPress={() => { setMenuVisible(false); router.push(`/(dashboard)/(rides)/editRide?id=${ride.id}`); }}
        >
          <Entypo name="edit" size={15} color="#000" />
          <Text style={menuStyles.menuText}>Edit Ride</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={menuStyles.menuItem}
        onPress={() => { setMenuVisible(false); handleCancelRide(); }}
      >
        <Entypo name="cross" size={16} color="#e63e4c" />
        <Text style={[menuStyles.menuText, { color: '#e63e4c' }]}>Cancel Ride</Text>
      </TouchableOpacity>
    </>
  );

  // Determine if this is the user's own created ride and its status
  const creatorId = ride?.creator_id ?? ride?.creator?.user_id ?? ride?.creator?.id;
  const currentUserId = currentUser?.user_id ?? currentUser?.id;
  const isOwnRide = creatorId && currentUserId && String(creatorId) === String(currentUserId);
  
  const showStartButton = !create && isOwnRide && rideStatus === 'unactive' && !isRideCompleted && !isRideCancelled && !isRideExpired;
  const showCompleteButton = !create&& isOwnRide && rideStatus === 'started' && !isRideCompleted && !isRideCancelled && !isRideExpired;

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
        <View style={styles.creatorRow}>
          <ProfileImage profilePicture={ride.creator.profilePicture} name={ride.creator.name} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
          <View>
            <Text style={{ fontWeight: 'semibold', fontSize: 16 }}>{ride.creator.name || 'Unknown'}</Text>
            <Text style={styles.handle}>{ride.creator.handle || '@user'}</Text>
          </View>
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
            {ride.fare === 'TBA' || ride.fare === 0 || ride.fare === '0' || ride.fare === '0.00' ? (
              <Text style={[styles.rideText, { fontWeight: 'semibold' }]}>TBA</Text>
            ) : (
              <Text style={[styles.rideText, { fontWeight: 'semibold' }]}>BDT {ride.fare}</Text>
            )}
          </View>
        </View>
      )}

      {/* Preferences section */}
      {(create && ride.preferences) && (
        <View>
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
        </View>
      )}

      {showStartButton && (
        <View style={menuStyles.actionWrapper}>
          <View style={menuStyles.actionRow}>
            <Button
              title="Start ride"
              style={{ flex: 1, marginRight: 8, backgroundColor: '#000' }}
              textStyle={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}
              onPress={handleStartRide}
            />
            <TouchableOpacity style={menuStyles.dotButton} onPress={() => setMenuVisible(v => !v)}>
              <Entypo name="dots-three-vertical" size={16} color="#000" />
            </TouchableOpacity>
          </View>
          {menuVisible && (
            <View style={menuStyles.dropdown}>
              <RideMenu showEdit />
            </View>
          )}
        </View>
      )}

      {showCompleteButton && (
        <View style={menuStyles.actionWrapper}>
          <View style={menuStyles.actionRow}>
            <Button
              title="Complete ride"
              style={{ flex: 1, marginRight: 8, backgroundColor: '#000' }}
              textStyle={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}
              onPress={handleComplete}
            />
            <TouchableOpacity style={menuStyles.dotButton} onPress={() => setMenuVisible(v => !v)}>
              <Entypo name="dots-three-vertical" size={16} color="#000" />
            </TouchableOpacity>
          </View>
          {menuVisible && (
            <View style={menuStyles.dropdown}>
              <RideMenu showEdit={false} />
            </View>
          )}
        </View>
      )}
    </CardButton>
  );
}

const menuStyles = StyleSheet.create({
  actionWrapper: {
    position: 'relative',
    marginTop: 4,
    zIndex: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  dotButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    bottom: 44,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 10,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
});

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
