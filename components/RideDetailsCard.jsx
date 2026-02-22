import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StyledText as Text } from './StyledText';
import { StyledCard as Card } from './StyledCard';
import { StyledBorderText as BorderText } from './StyledBorderText';
import { StyledBorderView as BorderView } from './StyledBorderView';
import { StyledButton as Button } from './StyledButton';
import { StyledLink } from './StyledLink';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Octicons from '@expo/vector-icons/Octicons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { joinRequestsAPI } from '../src/api/joinRequests';
import { useSearch } from '../context/SearchContext';
import { parseServerDate } from '../src/utils/date';
import { useUser } from '../context/UserContext';
import { useRide } from '../context/RideContext';
import { normalizeRide } from '../src/utils/rideMapper';

export default function RideDetailsCard({ ride, ongoing = false, join = false }) {
  const router = useRouter();
  const { searchData } = useSearch();
  const [showPassengers, setShowPassengers] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [joinStatus, setJoinStatus] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const { currentUser } = useUser();
  const { selectRide, updateRideStatus } = useRide();
  const [passengers, setPassengers] = useState([]);

  if (!ride) return <Text>No ride data provided.</Text>;

  // Fetch ride details by ID for accurate passenger count
  useEffect(() => {
    const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
    async function fetchRideDetails() {
      const rideId = ride?.id || ride?.ride_id;
      if (!rideId) {
        console.log('🚫 No valid rideId for fetching ride details:', ride);
        return;
      }
      console.log('🔍 Fetching ride details for rideId:', rideId);
      try {
        const res = await fetch(`${API_BASE_URL}/rides/${rideId}`);
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          const data = await res.json();
          // Filter out removed passengers
          if (Array.isArray(data.passengers) && data.passengers.length > 0) {
            setPassengers(data.passengers.filter(p => p.status !== 'removed'));
          } else if (Array.isArray(ride.partners) && ride.partners.length > 0) {
            setPassengers(ride.partners.filter(p => p.status !== 'removed'));
          } else {
            setPassengers([]);
          }
        } else {
          const text = await res.text();
          console.error('Failed to fetch ride details, non-JSON response:', text);
          if (Array.isArray(ride.partners) && ride.partners.length > 0) {
            setPassengers(ride.partners.filter(p => p.status !== 'removed'));
          } else {
            setPassengers([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch ride details:', err);
        // Fallback: use ride.partners if fetch fails
        if (Array.isArray(ride.partners) && ride.partners.length > 0) {
          setPassengers(ride.partners.filter(p => p.status !== 'removed'));
        } else {
          setPassengers([]);
        }
      }
    }
    fetchRideDetails();
  }, [ride?.id, ride?.ride_id]);

  // Check if user has already requested to join this ride
  useEffect(() => {
    const checkStatus = async () => {
      if (ride?.id && join) {
        try {
          const response = await joinRequestsAPI.checkJoinStatus(ride.id);
          if (response.hasRequested) {
            setIsRequested(true);
            setJoinStatus(response.status);
            console.log('📌 Join status for ride', ride.id, ':', response.status);
          }
        } catch (error) {
          console.error('Failed to check join status:', error);
        }
      }
    };
    checkStatus();
  }, [ride?.id, join]);

  const creator = ride.creator || { name: 'Unknown', handle: '@user' };
  const creatorName = creator.name || 'Unknown';
  const creatorHandle = creator.handle || '@user';
  const maxPassengers = Number(ride.totalPassengers ?? 0);
  const totalPassengers = Number(ride.totalPassengers ?? ride.available_seats ?? 0);
  const availableSeats = typeof ride.available_seats === 'number' ? ride.available_seats : (totalPassengers - passengers.length);
  const isFull = availableSeats === 0;
  const genderPreference = String(ride.gender ?? '').toLowerCase();
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
  const creatorId = ride?.creator_id ?? creator?.user_id ?? creator?.id;
  const currentUserId = currentUser?.user_id ?? currentUser?.id;
  const isOwnRide = creatorId != null && currentUserId != null && String(creatorId) === String(currentUserId);
  const rideStartValue = ride?.start_time ?? ride?.startTime ?? ride?.start_time_utc ?? ride?.startTimeUtc ?? ride?.dateTime;
  const rideStartDate = parseServerDate(rideStartValue);
  const rideDayLabel = rideStartDate
    ? rideStartDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
    : ride?.date?.day;
  const rideTimeLabel = rideStartDate
    ? rideStartDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, hourCycle: 'h12' })
    : ride?.date?.time;

  const handleRequest = async () => {
    if (isRequested || requesting || isFull || isGenderRestricted) return;
    setRequesting(true);
    try {
      // Normalize coordinates to ensure they have both lat/lng and latitude/longitude
      const getCoords = (loc) => {
        if (!loc) return null;
        if (loc.coords) return { lat: loc.coords.lat ?? loc.coords.latitude, lng: loc.coords.lng ?? loc.coords.longitude };
        if (loc.geometry?.location) return { lat: loc.geometry.location.lat, lng: loc.geometry.location.lng };
        // Handle direct lat/lng if present
        const lat = loc.lat ?? loc.latitude;
        const lng = loc.lng ?? loc.longitude;
        if (lat !== undefined && lng !== undefined) return { lat, lng };
        return null;
      };

      const startCoords = getCoords(searchData.start);
      const destCoords = getCoords(searchData.destination);

      const response = await joinRequestsAPI.submitJoinRequest(
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

      console.log('✅ Join request response:', response);
      setIsRequested(true);
      setJoinStatus('pending');
      Alert.alert('Success', 'Your request has been sent! Check notifications for updates.');
      router.push('/joinRequested');
    } catch (error) {
      console.error('❌ Join request error:', error);
      Alert.alert('Error', error.message || 'Failed to submit join request');
    } finally {
      setRequesting(false);
    }
  };
  

  return (
    <Card>
      {/* Start/Cancel buttons for own created rides, only if not ongoing */}
      {isOwnRide && rideStatus === 'unactive' && rideStatus !== 'ongoing' && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <Button
            title="Start Ride"
            style={{ flex: 1, marginRight: 8, backgroundColor: '#000' }}
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
          <Button
            title="Cancel Ride"
            style={{ flex: 1, marginLeft: 8, backgroundColor: '#e63e4c' }}
            textStyle={{ color: '#fff', fontWeight: 'bold' }}
            onPress={async () => {
              try {
                const updated = await updateRideStatus(ride.id, 'cancelled');
                selectRide(updated || ride);
                Alert.alert('Success', 'Ride has been cancelled!');
              } catch (e) {
                Alert.alert('Error', 'Failed to cancel ride');
              }
            }}
          />
        </View>
      )}
      {isOwnRide && rideStatus === 'started' && (
        <Button
          title="Complete ride"
          style={{ marginBottom: 16, backgroundColor: '#000' }}
          textStyle={{ color: '#fff', fontWeight: 'bold' }}
          onPress={() => {
            selectRide(ride);
            router.push({
              pathname: '/complete',
              params: { ride: JSON.stringify(ride) }
            });
          }}
        />
      )}
      {join && !isOwnRide && (
        <>
          <Button
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
            style={[{ marginBottom: 20 }, (isRequested || requesting || isFull || isGenderRestricted) && { backgroundColor: '#ababab' }]}
            onPress={handleRequest}
            disabled={isRequested || requesting || isFull || isGenderRestricted}
          />
        </>
      )}
  
      {/* Available seats */}
      <View style={styles.rideRow}>
        <Ionicons name="person" size={14} color="#888" style={[styles.icon, { marginHorizontal: 2 }]}/>
        <Text style={[styles.rideText, { fontWeight: 'bold' }]}>Available seats: {availableSeats}</Text>
      </View>

      {/* Start location */}
      <View style={styles.rideRow}>
        <Octicons name="dot-fill" size={18} color="#e63e4c" style={styles.icon} />
        <BorderText style={[styles.rideText, {marginVertical: 0}]}>{ride.start.name}</BorderText>
      </View>

      {/* Destination */}
      <View style={styles.rideRow}>
        <Entypo name="location-pin" size={18} color="#e63e4c" style={styles.icon} />
        <BorderText style={[styles.rideText, {marginVertical: 0}]}>{ride.destination.name}</BorderText>
      </View>

      {/* Date/time */}
      <View style={styles.rideRow}>
        <FontAwesome name="clock-o" size={14} color="#888" style={[styles.icon, { marginLeft: 4 }]}/>
        <Text style={styles.rideText}>{rideDayLabel}, {rideTimeLabel}</Text>
      </View>

      {/* Ride creator */}
      <View style={styles.subtitle}>
        <Text style={[styles.rideText, { fontWeight: 'bold' }]}>Ride creator</Text>
      </View>

      <View style={styles.creatorContainer}>
        <TouchableOpacity
          style={styles.creatorRow}
          onPress={() => creator?.handle && router.push(`user/${creator.handle}`)}
        >
          <Text style={{ fontSize: 30 }}>👤 </Text>
          <View>
            <Text style={styles.creatorName}>{creatorName}</Text>
            <Text style={styles.handle}>{creatorHandle}</Text>
          </View>
        </TouchableOpacity>

        {(join || ongoing) && !isOwnRide && (
          <View style={styles.contactRow}>
            <TouchableOpacity 
              onPress={() => {
                const uid = ride.creator_id || creator.user_id || creator.id;
                console.log('💬 Opening chat from ride details:', { uid, creator: creator.name });
                router.push({ 
                  pathname: '/(chat)/chatScreen', 
                  params: { 
                    userId: String(uid),
                    userName: creator.name,
                    userHandle: creatorHandle || creator.username
                  } 
                });
              }}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="chatbubble-ellipses" size={22} color="#e63e4c" />
            </TouchableOpacity>
            <StyledLink type="phone" value={creator.phone} style={{ marginVertical: 0 }} />
          </View>
        )}
      </View>

      {/* Passengers */}
      <View style={styles.subtitle}>
        <TouchableOpacity style={{ flexDirection: 'row' }} onPress={() => setShowPassengers(!showPassengers)}>
          <Text style={[styles.rideText, { fontWeight: 'bold' }]}>Ride passengers</Text>
          <Entypo name={showPassengers ? "chevron-up" : "chevron-down"} size={18} color="black" />
        </TouchableOpacity>
      </View>

      {showPassengers && (
        <View>
          {passengers.length === 0 ? (
            <Text style={[styles.handle, styles.rideRow]}>No other passengers.</Text>
          ) : (
            passengers.map((partnerData, index) => {
              const partner = partnerData || { name: 'Unknown', handle: '@user', username: 'unknown' };
              return (
                <View key={index} style={styles.creatorContainer}>
                  <TouchableOpacity
                    style={styles.creatorRow}
                    onPress={() => {
                      // Prefer username, fallback to handle
                      const profileId = partner.username || partner.handle;
                      if (profileId) router.push(`/user/${profileId}`);
                    }}
                  >
                    <Text style={{ fontSize: 30 }}>👤 </Text>
                    <View>
                      <Text style={styles.creatorName}>{partner.name}</Text>
                      <Text style={styles.handle}>@{partner.username || partner.handle}</Text>
                    </View>
                  </TouchableOpacity>
                  {/* Show minus sign only for own rides */}
                  {isOwnRide && (
                    <TouchableOpacity
                      style={{ marginLeft: 8 }}
                      onPress={() => {
                        router.push({
                          pathname: '/RemovePassengerScreen',
                          params: {
                            passenger: partner,
                            rideId: ride.id || ride.ride_id
                          }
                        });
                      }}
                    >
                      <Entypo name="minus" size={24} color="#e63e4c" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

      <View style={styles.subtitle}>
        <Text style={[styles.rideText,{fontWeight: 'bold'}]}>Preferences</Text>
      </View>

      <BorderView>
        <View style={{flexDirection: 'row'}}>
          <View style={styles.rideColumn}>
            <Text style={styles.rideText}>Total passengers allowed:</Text>
          </View>
          <View style={styles.rideColumn}>
            <Text style={styles.rideText}>{totalPassengers}</Text>
          </View>
        </View>
        <View style={{flexDirection: 'row'}}>
          <View style={styles.rideColumn}>
            <Text style={styles.rideText}>Current passengers:</Text>
          </View>
          <View style={styles.rideColumn}>
            <Text style={styles.rideText}>{passengers.length}</Text>
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
            <Text style={styles.rideText}>{ride.preferences}</Text>
          </View>
        </View>
      </BorderView>

      {/* Transport & Fare */}
      <View style={styles.subtitle}>
        <Text style={[styles.rideText, { fontWeight: 'bold' }]}>Transport</Text>
      </View>

      <View style={styles.rideRow}>
        <View style={styles.rideColumn}>
          <Text style={styles.transportText}>{ride.transportMode === 'Car' && ride.rideProvider ? `Car (${ride.rideProvider})` : ride.transportMode}</Text>
        </View>
        <View style={styles.rideColumn}>
          <Text>{ride.fare === 'TBA' || ride.fare === 0 || ride.fare === '0' || ride.fare === '0.00' ? 'TBA' : `BDT ${ride.fare}`}</Text>
        </View>
      </View>

      {/* Fare Breakdown 
      <View style={styles.subtitle}>
        <TouchableOpacity style={{ flexDirection: 'row' }} onPress={() => setShowBreakdown(!showBreakdown)}>
          <Text style={[styles.rideText, { fontWeight: 'bold' }]}>Fare Breakdown </Text>
          <Entypo name={showBreakdown ? "chevron-up" : "chevron-down"} size={18} color="black" />
        </TouchableOpacity>
      </View>

      {showBreakdown && (
        <BorderView>
          <View style={{ flexDirection: 'row' }}>
            <View style={styles.rideColumn}>
              <Text style={styles.rideText}>{creator.name}</Text>
            </View>
            <View style={styles.rideColumn}>
              <Text style={[styles.rideText, { fontWeight: 'semibold' }]}>BDT {ride.fare}</Text>
            </View>
          </View>

          {(ride.partners || []).map((partner, index) => (
            <View key={index} style={{ flexDirection: 'row' }}>
              <View style={styles.rideColumn}>
                <Text style={styles.rideText}>{partner.name}</Text>
              </View>
              <View style={styles.rideColumn}>
                <Text style={[styles.rideText, { fontWeight: 'semibold' }]}>BDT {ride.fare}</Text>
              </View>
            </View>
          ))}
        </BorderView>
      )}
      */}
    </Card>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginVertical: 10,
  },
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flex: 1,
  },
  rideText: {
    fontSize: 14,
    flex: 1,
  },
  rideColumn: {
    alignItems: 'flex-start',
    marginTop: 5,
    width: '50%',
  },
  transportText: {
    fontSize: 14, 
    color: '#000',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: 'semibold',
  },
  handle: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
  creatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    width: '70%',
  },
  contactRow: {
    flexDirection: 'row',
  },
  icon: {
    marginRight: 10,
  },
});
