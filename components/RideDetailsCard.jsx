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

export default function RideDetailsCard({ ride, ongoing = false, join = false }) {
  const router = useRouter();
  const { searchData } = useSearch();
  const [showPassengers, setShowPassengers] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [joinStatus, setJoinStatus] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [requesting, setRequesting] = useState(false);

  if (!ride) return <Text>No ride data provided.</Text>;

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
  const rideStartValue = ride?.start_time ?? ride?.startTime ?? ride?.start_time_utc ?? ride?.startTimeUtc ?? ride?.dateTime;
  const rideStartDate = parseServerDate(rideStartValue);
  const rideDayLabel = rideStartDate
    ? rideStartDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
    : ride?.date?.day;
  const rideTimeLabel = rideStartDate
    ? rideStartDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, hourCycle: 'h12' })
    : ride?.date?.time;

  const handleRequest = async () => {
    console.log('🔵 handleRequest called, ride.id:', ride?.id, 'isRequested:', isRequested, 'requesting:', requesting);
    
    if (!ride?.id) {
      Alert.alert('Error', 'Ride information missing');
      return;
    }

    if (isRequested) {
      console.log('⚠️ Request already sent, skipping');
      return;
    }

    setRequesting(true);
    console.log('🔷 Setting requesting to true, submitting join request for ride:', ride.id);
    
    try {
      
      // Normalize coordinates to ensure they have both lat/lng and latitude/longitude
      const normalizeCoords = (coords) => {
        if (!coords) return null;
        const lat = coords.lat ?? coords.latitude;
        const lng = coords.lng ?? coords.longitude;
        return (lat !== undefined && lng !== undefined) ? { lat, lng } : null;
      };

      const startCoords = normalizeCoords(searchData.start?.coords);
      const destCoords = normalizeCoords(searchData.destination?.coords);

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

  const handleComplete = () => {
    router.push('/complete')
    setIsCompleted(true);
  };

  return (
    <Card>
      {join && (
        <Button
          title={
            requesting ? "Sending..." : 
            isRequested ? (
              joinStatus === 'accepted' ? "Already Joined" : 
              joinStatus === 'rejected' ? "Request Declined" :
              joinStatus === 'cancelled' ? "Request Cancelled" :
              "Request Sent"
            ) : 
            "Request to join"
          }
          style={[{ marginBottom: 20 }, (isRequested || requesting) && { backgroundColor: '#ababab' }]}
          onPress={handleRequest}
          disabled={isRequested || requesting}
        />
      )}
      
      {ongoing && (
        <Button
          title={isCompleted ? "Ride completed" : "Complete ride"}
          style={[{ marginBottom: 20 }, isCompleted && { backgroundColor: '#ababab' }]}
          onPress={handleComplete}
          disabled={isCompleted}
        />
      )}

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
        <Text style={styles.rideText}><Text style={styles.rideText}>{rideDayLabel}, {rideTimeLabel}</Text></Text>
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
            <Text style={styles.creatorName}>{creator.name}</Text>
            <Text style={styles.handle}>{creator.handle}</Text>
          </View>
        </TouchableOpacity>

        {(join || ongoing) && (
          <View style={styles.contactRow}>
            <TouchableOpacity 
              style={{ paddingHorizontal: 10, marginRight: 15 }} 
              onPress={() => {
                const uid = ride.creator_id || creator.user_id || creator.id;
                console.log('💬 Opening chat from ride details:', { uid, creator: creator.name });
                router.push({ 
                  pathname: '/(chat)/chatScreen', 
                  params: { 
                    userId: String(uid),
                    userName: creator.name,
                    userHandle: creator.handle || creator.username
                  } 
                });
              }}
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
          {(ride.partners || []).length === 0 ? (
            <Text style={[styles.handle, styles.rideRow]}>No other passengers.</Text>
          ) : (
            (ride.partners || []).map((partnerData, index) => {
              const partner = partnerData || { name: 'Unknown', handle: '@user' };
              return (
                <View key={index} style={styles.creatorContainer}>
                  <TouchableOpacity
                    style={styles.creatorRow}
                    onPress={() => partner?.handle && router.push(`/user/${partner.handle}`)}
                  >
                    <Text style={{ fontSize: 30 }}>👤 </Text>
                    <View>
                      <Text style={styles.creatorName}>{partner.name}</Text>
                      <Text style={styles.handle}>{partner.handle}</Text>
                    </View>
                  </TouchableOpacity>
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
            <Text style={styles.rideText}>Total passengers:</Text>
          </View>
          <View style={styles.rideColumn}>
            <Text style={styles.rideText}>{(ride.partners || []).length} / {ride.totalPassengers}</Text>
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
          <Text style={styles.transportText}>{ride.transport}</Text>
        </View>
        <View style={styles.rideColumn}>
          <Text>BDT {ride.fare}</Text>
        </View>
      </View>

      {/* Fare Breakdown */}
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
