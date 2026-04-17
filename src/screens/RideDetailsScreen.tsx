import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapBottomSheet } from '../components/MapBottomSheet';
import { MapRouteCard } from '../components/MapRouteCard';
import { ScreenShell } from '../components/ScreenShell';
import { InCallModal } from '../components/InCallModal';
import { LocationDisplay } from '../components/LocationDisplay';
import { UserAvatar } from '../components/UserAvatar';
import {
  transportEmoji,
} from '../utils/rideMapper';
import { useAppContext } from '../context/AppContext';
import { useUser } from '../context/UserContext';
import { useRide } from '../context/RideContext';
import { useJoinRequests } from '../context/JoinRequestContext';
import { useSearch } from '../context/SearchContext';
import { formatRideDate } from '../utils/date';
import { type TransportMode } from '../utils/rideMapper';
import type { RouteMetrics } from '../types/map';
import { colors } from '../theme';
import { chatAPI } from '../api/chat';
import { getParsedRouteCoords, getRouteDistanceKm, getRouteMatchMetrics } from '../utils/routeMatcher';



export function RideDetailsScreen() {
    const [groupChatId, setGroupChatId] = useState<string | null>(null);

    // Fetch group chat id for this ride
    useEffect(() => {
      async function fetchGroupChatId() {
        if (!rideId || isDemoMode) return;
        try {
          const chats = await chatAPI.getChats();
          const rideChat = (chats?.chats || []).find((c: any) => String(c.ride_id) === String(rideId) && c.type === 'ride');
          if (rideChat) setGroupChatId(String(rideChat.chat_id));
        } catch {
          setGroupChatId(null);
        }
      }
      fetchGroupChatId();
    }, [rideId, isDemoMode]);
  const { darkMode, isDemoMode } = useAppContext();
  const { searchData } = useSearch();
  const { user: currentUser } = useUser();
  const { selectedRide, getRideDetails, loading: rideLoading, selectRide } = useRide();
  const { 
    myRequests, 
    incomingRequests, 
    fetchMyRequests, 
    fetchIncomingRequests, 
    submitRequest, 
    loading: requestsLoading 
  } = useJoinRequests();

  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  
  const [showPassengers, setShowPassengers] = useState(false);
  const [showFareBreakdown, setShowFareBreakdown] = useState(false);
  const [showMapSheet, setShowMapSheet] = useState(false);
  const [callingUser, setCallingUser] = useState<any>(null);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!rideId) return;
    
    // First get ride details to know who the creator is
    const ride = await getRideDetails(Number(rideId));
    
    const tasks = [fetchMyRequests()];
    
    // Only fetch incoming requests if I am the creator
    if (ride && currentUser && String(ride.creator.id) === String(currentUser.id)) {
      tasks.push(fetchIncomingRequests(Number(rideId)));
    }
    
    await Promise.all(tasks);
  }, [rideId, getRideDetails, fetchIncomingRequests, fetchMyRequests, currentUser]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const ride = selectedRide;

  const isMyRide = ride && currentUser && String(ride.creator.id) === String(currentUser.id);
  const myReqForThisRide = myRequests.find((request) => String(request.rideId) === String(rideId));
  const passengers = incomingRequests.filter((request) => String(request.rideId) === String(rideId) && request.status === 'accepted');
  const availableSeats = ride ? ride.seats - ride.currentPassengers : 0;
  const totalCapacity = ride ? ride.seats + 1 : 1;
  const totalPeopleNow = ride ? ride.currentPassengers + 1 : 1;
  const isFull = availableSeats <= 0;
  const departureTimestamp = Date.parse(ride?.departureTime ?? '');
  const hasPassedJoinCutoff = Number.isFinite(departureTimestamp) && departureTimestamp <= Date.now();
  
  const cardBg = darkMode ? colors.cardDark : '#FFFFFF';
  const cardBorder = darkMode ? colors.borderDark : '#E5E7EB';
  const textPrimary = darkMode ? colors.textPrimaryDark : '#111827';
  const textSecondary = darkMode ? colors.textSecondaryDark : '#6B7280';
  const darkSurface = darkMode ? '#111111' : '#FFFFFF';

  if (!ride) {
    return (
      <ScreenShell>
        <View style={styles.header}>
           <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={textSecondary} />
            <Text style={[styles.backText, { color: textSecondary }]}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.body}>
           <Text style={{ color: textSecondary, textAlign: 'center', marginTop: 100 }}>
             {rideLoading ? 'Loading ride details...' : 'Ride not found'}
           </Text>
        </View>
      </ScreenShell>
    );
  }

  const requestStart = searchData.start?.coords
    ? {
        name: searchData.start.name || searchData.start.shortName || 'Pickup point',
        lat: searchData.start.coords.lat,
        lng: searchData.start.coords.lng,
      }
    : {
        name: ride.start.name || ride.from.name || ride.from.shortName || 'Pickup point',
        lat: ride.start.coords?.lat ?? ride.start.lat,
        lng: ride.start.coords?.lng ?? ride.start.lng,
      };

  const requestEnd = searchData.destination?.coords
    ? {
        name: searchData.destination.name || searchData.destination.shortName || 'Drop-off point',
        lat: searchData.destination.coords.lat,
        lng: searchData.destination.coords.lng,
      }
    : {
        name: ride.destination.name || ride.to.name || ride.to.shortName || 'Drop-off point',
        lat: ride.destination.coords?.lat ?? ride.destination.lat,
        lng: ride.destination.coords?.lng ?? ride.destination.lng,
      };

  const driverStart = {
    latitude: ride.start.coords?.lat ?? ride.start.lat,
    longitude: ride.start.coords?.lng ?? ride.start.lng,
  };

  const driverEnd = {
    latitude: ride.destination.coords?.lat ?? ride.destination.lat,
    longitude: ride.destination.coords?.lng ?? ride.destination.lng,
  };

  const routeCoords = getParsedRouteCoords(ride.routePolyline, driverStart, driverEnd);
  const matchMetrics = getRouteMatchMetrics(
    { latitude: requestStart.lat, longitude: requestStart.lng },
    { latitude: requestEnd.lat, longitude: requestEnd.lng },
    routeCoords,
    2.5
  );
  const hasExplicitUserRoute = !!searchData.start?.coords && !!searchData.destination?.coords;
  const rideDistanceKm = getRouteDistanceKm(routeCoords);
  const perKmRate = ride.fare != null && rideDistanceKm > 0 ? ride.fare / rideDistanceKm : 0;
  const detourRate = perKmRate * 0.6;
  const estimatedFare = matchMetrics.segmentDistanceKm * perKmRate + matchMetrics.detourDistanceKm * detourRate;
  const shouldEstimateForYou = !isMyRide && myReqForThisRide?.status !== 'accepted';
  const participantsForEqualPreview = Math.max(1, (ride.currentPassengers ?? 0) + 1 + (shouldEstimateForYou ? 1 : 0));
  const equalSplitPreview = ride.fare != null ? ride.fare / participantsForEqualPreview : 0;
  const estimatedDurationMin = routeMetrics && rideDistanceKm > 0
    ? (routeMetrics.durationMin * matchMetrics.segmentDistanceKm) / rideDistanceKm
    : undefined;


  const handleJoinRequest = async () => {
    try {
      if (!rideId) return;

      if (hasPassedJoinCutoff) {
        Alert.alert('Join closed', 'This ride has reached its join cutoff.');
        return;
      }

      if (hasExplicitUserRoute && !matchMetrics.isMatch) {
        Alert.alert('Route mismatch', 'Your pickup and drop are not aligned with this ride route. Please choose another suggested ride.');
        return;
      }

      const requestRoutePolyline = hasExplicitUserRoute
        ? JSON.stringify({
            type: 'LineString',
            coordinates: [
              [requestStart.lng, requestStart.lat],
              [requestEnd.lng, requestEnd.lat],
            ],
          })
        : (ride.routePolyline
            ? (typeof ride.routePolyline === 'string'
                ? ride.routePolyline
                : JSON.stringify(ride.routePolyline))
            : JSON.stringify({
                type: 'LineString',
                coordinates: [
                  [requestStart.lng, requestStart.lat],
                  [requestEnd.lng, requestEnd.lat],
                ],
              }));

      await submitRequest(Number(rideId), requestStart, requestEnd, {
        routePolyline: requestRoutePolyline,
        segmentDistanceKm: Number(matchMetrics.segmentDistanceKm.toFixed(2)),
        detourDistanceKm: Number(matchMetrics.detourDistanceKm.toFixed(2)),
        estimatedDurationMin: estimatedDurationMin ? Number(estimatedDurationMin.toFixed(0)) : undefined,
        calculatedFare: Number(Math.max(0, estimatedFare).toFixed(2)),
        pricingVersion: 'mvp.v1.route-match',
        pickupAddress: requestStart.name,
        dropAddress: requestEnd.name,
      });
      Alert.alert('Success', 'Request sent! Waiting for approval.');
      fetchDetails();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send join request');
    }
  };

  return (
    <ScreenShell scroll={false}>
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: cardBorder }]}> 
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={textSecondary} />
          <Text style={[styles.backText, { color: textSecondary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Ride Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
          {/* Group Chat Button */}
          {groupChatId && (
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, backgroundColor: colors.brand, borderRadius: 8, padding: 10, alignSelf: 'flex-start' }}
              onPress={() => router.push({ pathname: '/(app)/group-chat/[id]', params: { id: groupChatId } })}
            >
              <Ionicons name="people" size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Open Group Chat</Text>
            </Pressable>
          )}
          {!isMyRide ? (
            <View style={styles.creatorRow}>
              <Pressable onPress={() => router.push({ pathname: '/(app)/user/[id]', params: { id: ride.creator.id } })}>
                <UserAvatar
                  size="md"
                  name={ride.creator.name}
                  source={ride.creator.avatar}
                />
              </Pressable>
              <View style={styles.creatorInfo}>
                <Pressable onPress={() => router.push({ pathname: '/(app)/user/[id]', params: { id: ride.creator.id } })}>
                  <Text style={[styles.creatorName, { color: textPrimary }]}>{ride.creator.name}</Text>
                </Pressable>
                <View style={styles.creatorMeta}>
                  <Text style={[styles.creatorUsername, { color: textSecondary }]}>@{ride.creator.username}</Text>
                  <Ionicons name="star" size={10} color="#F59E0B" />
                  <Text style={[styles.creatorUsername, { color: textSecondary }]}>{ride.creator.rating}</Text>
                </View>
              </View>
              {ride.genderPreference !== 'Any' ? (
                <View style={styles.genderBadge}>
                  <Text style={styles.genderBadgeText}>{ride.genderPreference} only</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {isMyRide ? (
            <View style={[styles.myRideBadge, { backgroundColor: darkSurface }]}> 
              <Ionicons name="person" size={13} color={colors.brand} />
              <Text style={styles.myRideText}>This is your ride</Text>
            </View>
          ) : null}

          <LocationDisplay from={ride.from.name} to={ride.to.name} />

          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={13} color="#9CA3AF" />
            <Text style={[styles.timeText, { color: textSecondary }]}>{formatRideDate(ride.departureTime)}</Text>
          </View>

          <View style={[styles.statsRow, { borderTopColor: darkMode ? '#2A2A2A' : '#F3F4F6' }]}> 
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: '#9CA3AF' }]}>Transport</Text>
              <Text style={[styles.statValue, { color: textPrimary }]}>
                {transportEmoji[ride.transport as TransportMode] || '🚗'} {ride.transport}
              </Text>
            </View>

            <View style={[styles.statItem, styles.statDivider, { borderLeftColor: darkMode ? '#2A2A2A' : '#F3F4F6', borderRightColor: darkMode ? '#2A2A2A' : '#F3F4F6' }]}> 
              <Text style={[styles.statLabel, { color: '#9CA3AF' }]}>Spots left</Text>
              <Text style={[styles.statValue, { color: availableSeats <= 1 ? colors.brand : textPrimary }]}>{availableSeats}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: '#9CA3AF' }]}>Total fare</Text>
              <Text style={[styles.statValue, { color: textPrimary }]}>{ride.fare != null ? `BDT ${ride.fare}` : 'TBD'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.mapSectionBlock}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="map-outline" size={16} color={colors.brand} />
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Route Map</Text>
            </View>
          </View>

          <MapRouteCard from={ride.from} to={ride.to} title="Ride route" onMetricsChange={setRouteMetrics} />

          <View style={styles.mapLegendRow}>
            <View style={styles.fromLegendDot} />
            <Text style={[styles.mapLegendText, { color: textSecondary }]} numberOfLines={1}>{ride.from.shortName}</Text>
            <Text style={[styles.mapLegendArrow, { color: '#9CA3AF' }]}>to</Text>
            <View style={styles.toLegendDot} />
            <Text style={[styles.mapLegendText, { color: textSecondary }]} numberOfLines={1}>{ride.to.shortName}</Text>
          </View>

          {routeMetrics ? (
            <Pressable style={styles.routeMetricsButton} onPress={() => setShowMapSheet(true)}>
              <Text style={styles.routeMetricsButtonText}>
                {routeMetrics.distanceKm.toFixed(1)} km in {Math.round(routeMetrics.durationMin)} min • map details
              </Text>
              <Ionicons name="chevron-up" size={14} color="#9F1239" />
            </Pressable>
          ) : null}
        </View>

        {!isMyRide ? (
          <View>
            <Text style={[styles.blockTitle, { color: textPrimary }]}>Ride creator</Text>
            <View style={[styles.card, styles.creatorDetailsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
              <Pressable onPress={() => router.push({ pathname: '/(app)/user/[id]', params: { id: ride.creator.id } })}>
                <UserAvatar
                  size="md"
                  name={ride.creator.name}
                  source={ride.creator.avatar}
                />
              </Pressable>
              <View style={styles.creatorInfo}>
                <Pressable onPress={() => router.push({ pathname: '/(app)/user/[id]', params: { id: ride.creator.id } })}>
                  <Text style={[styles.creatorName, { color: textPrimary }]}>{ride.creator.name}</Text>
                </Pressable>
                <Text style={[styles.creatorUsername, { color: textSecondary }]}>@{ride.creator.username}</Text>
                {ride.creator.university ? (
                  <Text style={[styles.creatorUniversity, { color: '#9CA3AF' }]}> 
                    {ride.creator.university}
                    {ride.creator.department ? ` · ${ride.creator.department}` : ''}
                  </Text>
                ) : null}
              </View>
              <View style={styles.creatorActions}>
                <Pressable
                  style={styles.chatButton}
                  onPress={async () => {
                    try {
                      if (isDemoMode) {
                        router.push('/(app)/chats');
                        return;
                      }

                      const backendCreatorId = Number((ride.creator as any).user_id ?? ride.creator.id);
                      if (!Number.isInteger(backendCreatorId) || backendCreatorId <= 0) {
                        Alert.alert('Error', 'Could not open direct chat for this user');
                        return;
                      }

                      const response = await chatAPI.getPrivateChat(backendCreatorId);
                      const chatId = response?.chat?.chat_id || response?.chat?.id;
                      if (chatId) {
                        router.push({ pathname: '/(app)/chat/[id]', params: { id: String(chatId) } });
                      } else {
                        Alert.alert('Error', 'Could not open chat');
                      }
                    } catch (err: any) {
                      Alert.alert('Error', err.message || 'Failed to open chat');
                    }
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                </Pressable>
                <Pressable style={styles.callButton} onPress={() => setCallingUser(ride.creator)}>
                  <Ionicons name="call-outline" size={16} color="#6B7280" />
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}


        <View>
          <Pressable onPress={() => setShowPassengers((prev) => !prev)} style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Ride passengers ({passengers.length})</Text>
            <Ionicons name={showPassengers ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
          </Pressable>
          {showPassengers ? (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
              {passengers.length === 0 ? (
                <Text style={[styles.emptyText, { color: textSecondary }]}>No passengers yet</Text>
              ) : (
                passengers.map((request: any) => (
                  <View key={request.id} style={styles.passengerRow}>
                    <UserAvatar size="sm" name={request.requester.name} source={request.requester.avatar} />
                    <View style={styles.passengerInfo}>
                      <Pressable onPress={() => router.push({ pathname: '/(app)/user/[id]', params: { id: request.requester.id } })}>
                        <Text style={[styles.passengerName, { color: textPrimary }]}>{request.requester.name}</Text>
                      </Pressable>
                      <View style={styles.paymentRow}>
                        <Ionicons name="card-outline" size={10} color="#9CA3AF" />
                        <Text
                          style={[
                            styles.paymentStatus,
                            { color: (request as any).paymentStatus === 'paid' ? '#16A34A' : '#D97706' },
                          ]}
                        >
                          {(request as any).paymentStatus === 'paid' ? 'Paid' : 'Payment pending'}
                        </Text>
                      </View>
                    </View>
                    <Pressable style={styles.smallCallButton} onPress={() => setCallingUser(request.requester)}>
                      <Ionicons name="call-outline" size={14} color="#6B7280" />
                    </Pressable>
                  </View>
                ))
              )}

            </View>
          ) : null}
        </View>

        <View>
          <Text style={[styles.blockTitle, { color: textPrimary }]}>Details</Text>
          <View style={[styles.card, styles.detailsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Joinable spots set by creator:</Text>
              <Text style={[styles.detailValue, { color: textPrimary }]}>{ride.seats}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Spots left:</Text>
              <Text style={[styles.detailValue, { color: availableSeats === 0 ? '#DC2626' : '#16A34A' }]}>{availableSeats}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Total capacity (creator + spots):</Text>
              <Text style={[styles.detailValue, { color: textPrimary }]}>{totalCapacity}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>People currently in ride:</Text>
              <Text style={[styles.detailValue, { color: textPrimary }]}>{totalPeopleNow}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Gender preference:</Text>
              <Text style={[styles.detailValue, { color: textPrimary }]}>{ride.genderPreference}</Text>
            </View>
            {ride.transportDetail ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: textSecondary }]}>Vehicle:</Text>
                <Text style={[styles.detailValue, styles.detailValueRight, { color: textPrimary }]}>{ride.transportDetail}</Text>
              </View>
            ) : null}
            {ride.notes ? (
              <View style={[styles.notesBlock, { borderTopColor: darkMode ? '#2A2A2A' : '#F3F4F6' }]}> 
                <Text style={[styles.notesLabel, { color: '#9CA3AF' }]}>Notes from creator</Text>
                <Text style={[styles.notesText, { color: textSecondary }]}>{ride.notes}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View>
          <Pressable onPress={() => setShowFareBreakdown((prev) => !prev)} style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Fare Breakdown</Text>
            <Ionicons name={showFareBreakdown ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
          </Pressable>
          {showFareBreakdown ? (
            <View style={[styles.card, styles.detailsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
              {ride.fare != null ? (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: textSecondary }]}>Total fare</Text>
                    <Text style={[styles.detailValue, { color: textPrimary }]}>BDT {ride.fare.toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: textSecondary }]}>Route distance</Text>
                    <Text style={[styles.detailValue, { color: textPrimary }]}>{rideDistanceKm.toFixed(1)} km</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: textSecondary }]}>Rate</Text>
                    <Text style={[styles.detailValue, { color: textPrimary }]}>BDT {perKmRate.toFixed(1)}/km</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: textSecondary }]}>Detour rate</Text>
                    <Text style={[styles.detailValue, { color: textPrimary }]}>BDT {detourRate.toFixed(1)}/km</Text>
                  </View>
                  <View style={[styles.detailRow, styles.fareSplitRow, { borderTopColor: darkMode ? '#2A2A2A' : '#F3F4F6' }]}> 
                    <Text style={[styles.fareSplitLabel, { color: darkMode ? colors.textPrimaryDark : '#374151' }]}>Equal split preview ({participantsForEqualPreview} people)</Text>
                    <Text style={styles.fareSplitValue}>BDT {equalSplitPreview.toFixed(0)}</Text>
                  </View>

                  {hasExplicitUserRoute ? (
                    matchMetrics.isMatch ? (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: textSecondary }]}>Your route segment</Text>
                          <Text style={[styles.detailValue, { color: textPrimary }]}>{matchMetrics.segmentDistanceKm.toFixed(1)} km</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: textSecondary }]}>Estimated detour</Text>
                          <Text style={[styles.detailValue, { color: textPrimary }]}>{matchMetrics.detourDistanceKm.toFixed(1)} km</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: textSecondary }]}>Estimated fare</Text>
                          <Text style={[styles.fareSplitValue, { color: textPrimary }]}>BDT {Math.max(0, estimatedFare).toFixed(0)}</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.routeMismatchInfo}>
                        <Ionicons name="alert-circle-outline" size={13} color="#B45309" />
                        <Text style={styles.routeMismatchText}>Your selected route is not aligned with this ride route.</Text>
                      </View>
                    )
                  ) : (
                    <View style={styles.routeMismatchInfo}>
                      <Ionicons name="information-circle-outline" size={13} color="#0369A1" />
                      <Text style={[styles.routeMismatchText, { color: '#0369A1' }]}>Set pickup/drop in Find Rides search to get exact segment fare.</Text>
                    </View>
                  )}

                  <Pressable
                    onPress={() => {
                      if (selectedRide) selectRide(selectedRide);
                      router.push(`/(app)/fare-calc?rideId=${ride.id}`);
                    }}
                    style={styles.fareCalcButton}
                  >
                    <Ionicons name="calculator-outline" size={14} color={colors.brand} />
                    <Text style={styles.fareCalcButtonText}>Calculate my exact fare →</Text>
                  </Pressable>
                </>
              ) : (
                <Text style={[styles.emptyText, { color: textSecondary }]}>Fare not set yet. The ride creator will update it later.</Text>
              )}
            </View>
          ) : null}
        </View>

        {!isMyRide ? (
          hasPassedJoinCutoff ? (
            <View style={[styles.fullRideBanner, { backgroundColor: darkSurface, borderColor: cardBorder }]}> 
              <Text style={styles.fullRideBannerText}>Join request cutoff reached</Text>
            </View>
          ) : isFull ? (
            <View style={[styles.fullRideBanner, { backgroundColor: darkSurface, borderColor: cardBorder }]}> 
              <Text style={styles.fullRideBannerText}>This ride is full</Text>
            </View>
          ) : myReqForThisRide ? (
            <View
              style={[
                styles.requestStatusBanner,
                myReqForThisRide.status === 'accepted' ? (darkMode ? styles.acceptedBannerDark : styles.acceptedBanner) : (darkMode ? styles.pendingBannerDark : styles.pendingBanner),
              ]}
            >
              <Text style={myReqForThisRide.status === 'accepted' ? styles.acceptedBannerText : styles.pendingBannerText}>
                {myReqForThisRide.status === 'accepted' ? '✓ You are a passenger' : '⏳ Request pending approval'}
              </Text>
            </View>
          ) : (
            <Pressable 
              style={[styles.primaryAction, { backgroundColor: darkMode ? '#1A1A1A' : '#1C1C1E' }]} 
              onPress={handleJoinRequest}
              disabled={requestsLoading || hasPassedJoinCutoff}
            >
              <Text style={styles.primaryActionText}>
                {requestsLoading ? 'Sending...' : hasPassedJoinCutoff ? 'Join closed' : 'Request to join'}
              </Text>
            </Pressable>
          )
        ) : (
          <Pressable style={styles.primaryAction} onPress={() => router.push('/(app)/ride-status')}>
            <Text style={styles.primaryActionText}>Manage this ride →</Text>
          </Pressable>
        )}

      </ScrollView>

      <MapBottomSheet visible={showMapSheet} onClose={() => setShowMapSheet(false)} height={280}>
        <Text style={styles.sheetTitle}>Route details</Text>
        <View style={styles.sheetRow}>
          <Text style={styles.sheetLabel}>From</Text>
          <Text style={styles.sheetValue}>{ride.from.shortName}</Text>
        </View>
        <View style={styles.sheetRow}>
          <Text style={styles.sheetLabel}>To</Text>
          <Text style={styles.sheetValue}>{ride.to.shortName}</Text>
        </View>
        <View style={styles.sheetRow}>
          <Text style={styles.sheetLabel}>Distance</Text>
          <Text style={styles.sheetValue}>{routeMetrics ? `${routeMetrics.distanceKm.toFixed(1)} km` : 'Computing...'}</Text>
        </View>
        <View style={styles.sheetRow}>
          <Text style={styles.sheetLabel}>Duration</Text>
          <Text style={styles.sheetValue}>{routeMetrics ? `${Math.round(routeMetrics.durationMin)} min` : 'Computing...'}</Text>
        </View>
      </MapBottomSheet>

      {callingUser ? <InCallModal user={callingUser} onClose={() => setCallingUser(null)} /> : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  creatorDetailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatorInfo: {
    flex: 1,
    minWidth: 0,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  creatorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  creatorUsername: {
    fontSize: 12,
  },
  creatorUniversity: {
    fontSize: 11,
    marginTop: 2,
  },
  genderBadge: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brand,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  genderBadgeText: {
    color: colors.brand,
    fontSize: 11,
  },
  myRideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0F2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  myRideText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  timeText: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: 2,
    paddingTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  statLabel: {
    fontSize: 11,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  mapSectionBlock: {
    gap: 8,
  },
  mapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  fromLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  toLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#3B82F6',
  },
  mapLegendText: {
    flex: 1,
    fontSize: 12,
  },
  mapLegendArrow: {
    fontSize: 12,
  },
  routeMetricsButton: {
    borderWidth: 1,
    borderColor: '#FBCFE8',
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  routeMetricsButtonText: {
    color: '#9F1239',
    fontSize: 12,
    fontWeight: '600',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetLabel: {
    color: '#6B7280',
    fontSize: 13,
  },
  sheetValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '66%',
    textAlign: 'right',
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  creatorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 13,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  paymentStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  smallCallButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCard: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailValueRight: {
    flex: 1,
    textAlign: 'right',
  },
  notesBlock: {
    borderTopWidth: 1,
    marginTop: 2,
    paddingTop: 8,
  },
  notesLabel: {
    fontSize: 11,
    marginBottom: 3,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 19,
  },
  fareSplitRow: {
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 8,
  },
  fareSplitLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  fareSplitValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand,
  },
  fareCalcButton: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 12,
    backgroundColor: '#FFF0F2',
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fareCalcButtonText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '600',
  },
  routeMismatchInfo: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeMismatchText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  fullRideBanner: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  fullRideBannerText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  requestStatusBanner: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  acceptedBanner: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  acceptedBannerDark: {
    backgroundColor: '#111111',
    borderColor: '#2A2A2A',
  },
  acceptedBannerText: {
    color: '#16A34A',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingBanner: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  pendingBannerDark: {
    backgroundColor: '#111111',
    borderColor: '#2A2A2A',
  },
  pendingBannerText: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryAction: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
