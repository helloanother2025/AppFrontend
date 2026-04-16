import { useMemo, useState, useEffect, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { LocationDisplay } from '../components/LocationDisplay';
import { MapRouteCard } from '../components/MapRouteCard';
import { UserAvatar } from '../components/UserAvatar';
import { ScreenShell } from '../components/ScreenShell';
import { type RideLocation } from '../utils/rideMapper';
import { useAppContext } from '../context/AppContext';
import { useRide } from '../context/RideContext';
import { useUser } from '../context/UserContext';
import { useSearch } from '../context/SearchContext';
import { useJoinRequests } from '../context/JoinRequestContext';
import { colors } from '../theme';
import { reverseGeocode } from '../utils/mapServices';
import {
  getParsedRouteCoords,
  getRouteDistanceKm,
  getRouteMatchMetrics,
} from '../utils/routeMatcher';
import { calculateFareBreakdown, type FareBreakdownResult } from '../utils/fareCalculator';

interface PassengerSegment {
  userId: number | string;
  name: string;
  avatar?: string;
  distanceKm: number;
  polyline?: any;
}

export function FareCalculationScreen() {
  const { darkMode } = useAppContext();
  const { user: currentUser } = useUser();
  const { selectedRide: ride, getRideDetails, loading: rideLoading } = useRide();
  const { searchData } = useSearch();
  const { incomingRequests } = useJoinRequests();
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();

  const [myPickup, setMyPickup] = useState<RideLocation | null>(searchData.start || null);
  const [myDropoff, setMyDropoff] = useState<RideLocation | null>(searchData.destination || null);
  const [splitMethod, setSplitMethod] = useState<'equal' | 'distance'>('distance');
  const [showPickupPicker, setShowPickupPicker] = useState(false);
  const [showDropoffPicker, setShowDropoffPicker] = useState(false);
  const [passengerSegments, setPassengerSegments] = useState<PassengerSegment[]>([]);
  const [mapTapTarget, setMapTapTarget] = useState<'pickup' | 'dropoff'>('pickup');
  const [mapTapLoading, setMapTapLoading] = useState(false);
  const [creatorFareBreakdown, setCreatorFareBreakdown] = useState<FareBreakdownResult | null>(null);
  const [joinerFareBreakdown, setJoinerFareBreakdown] = useState<FareBreakdownResult | null>(null);

  // Fetch ride details if not already loaded
  const fetchRideDetails = useCallback(async () => {
    if (!ride && rideId) {
      try {
        await getRideDetails(Number(rideId));
      } catch (err) {
        console.error('Failed to fetch ride details:', err);
      }
    }
  }, [ride, rideId, getRideDetails]);

  useEffect(() => {
    fetchRideDetails();
  }, [fetchRideDetails]);

  const textPrimary = darkMode ? colors.textPrimaryDark : '#111827';
  const textSecondary = darkMode ? colors.textSecondaryDark : '#6B7280';
  const cardBg = darkMode ? colors.cardDark : '#FFFFFF';
  const cardBorder = darkMode ? colors.borderDark : '#E5E7EB';

  const isMyRide = !!(ride && currentUser && String(ride.creator.id) === String(currentUser.id));

  // Check if user has requested to join (for payment validation)
  const hasJoinRequest = useMemo(() => {
    if (!ride || isMyRide || !currentUser) return false;
    
    // Check if current user has an accepted join request for this ride
    const myRequest = incomingRequests.find(
      req => String(req.rideId) === String(ride.id) && 
             String(req.requesterId) === String(currentUser.id) &&
             req.status === 'accepted'
    );
    return !!myRequest;
  }, [ride, isMyRide, currentUser, incomingRequests]);

  // Polyline-based distance calculation
  const driverStart = {
    latitude: ride?.start.coords?.lat ?? ride?.start.lat ?? 0,
    longitude: ride?.start.coords?.lng ?? ride?.start.lng ?? 0,
  };
  const driverEnd = {
    latitude: ride?.destination.coords?.lat ?? ride?.destination.lat ?? 0,
    longitude: ride?.destination.coords?.lng ?? ride?.destination.lng ?? 0,
  };

  const routeCoords = getParsedRouteCoords(ride?.routePolyline, driverStart, driverEnd);
  const computedRouteDistanceKm = getRouteDistanceKm(routeCoords);
  const totalRideDistanceKm = computedRouteDistanceKm > 0 ? computedRouteDistanceKm : (ride?.totalDistanceKm ?? 0);

  const getLocationCoords = (location: RideLocation | null) => {
    if (!location) return null;
    const lat = location.coords?.lat ?? location.lat;
    const lng = location.coords?.lng ?? location.lng;
    if (lat == null || lng == null) return null;
    return { lat: Number(lat), lng: Number(lng) };
  };

  // Calculate passenger segment distances from their polylines
  useEffect(() => {
    if (!ride?.passengers || ride.passengers.length === 0) {
      setPassengerSegments([]);
      return;
    }

    const segments: PassengerSegment[] = [];
    
    for (const passenger of ride.passengers) {
      let distanceKm = 0;
      
      // If passenger has a route_polyline, calculate distance from it
      if (passenger.route_polyline) {
        try {
          const polylineCoords = getParsedRouteCoords(
            passenger.route_polyline,
            { latitude: passenger.start_lat, longitude: passenger.start_lng },
            { latitude: passenger.dest_lat, longitude: passenger.dest_lng }
          );
          distanceKm = getRouteDistanceKm(polylineCoords);
        } catch (err) {
          console.warn('Failed to calculate segment distance for passenger', passenger.user_id, err);
          distanceKm = totalRideDistanceKm;
        }
      } else {
        distanceKm = totalRideDistanceKm;
      }

      segments.push({
        userId: passenger.user_id,
        name: passenger.name,
        avatar: passenger.avatar_url,
        distanceKm,
        polyline: passenger.route_polyline,
      });
    }

    setPassengerSegments(segments);
  }, [ride?.passengers, totalRideDistanceKm]);

  const mySegmentMetrics = useMemo(() => {
    if (!myPickup || !myDropoff) {
      return null;
    }

    // Use either coords or direct lat/lng from selected locations
    const pickupCoords = getLocationCoords(myPickup);
    const dropoffCoords = getLocationCoords(myDropoff);

    if (!pickupCoords || !dropoffCoords) {
      return null;
    }

    const metrics = getRouteMatchMetrics(
      { latitude: pickupCoords.lat, longitude: pickupCoords.lng },
      { latitude: dropoffCoords.lat, longitude: dropoffCoords.lng },
      routeCoords,
      2.5
    );
    return metrics;
  }, [myPickup, myDropoff, routeCoords]);

  const perKmRate = ride?.fare != null && totalRideDistanceKm > 0 ? ride.fare / totalRideDistanceKm : 0;
  const detourRate = perKmRate * 0.6;

  const myFareBreakdown = useMemo(() => {
    if (ride?.fare == null) {
      return null;
    }

    const pickupCoords = getLocationCoords(myPickup);
    const dropoffCoords = getLocationCoords(myDropoff);

    if (!pickupCoords || !dropoffCoords) {
      return {
        segmentDistanceKm: totalRideDistanceKm,
        segmentCost: ride.fare,
        detourDistanceKm: 0,
        detourCost: 0,
        total: ride.fare,
        isExact: false,
      };
    }

    if (!mySegmentMetrics || !mySegmentMetrics.isMatch) {
      return {
        segmentDistanceKm: totalRideDistanceKm,
        segmentCost: ride.fare,
        detourDistanceKm: 0,
        detourCost: 0,
        total: ride.fare,
        isExact: false,
      };
    }

    const segmentCost = mySegmentMetrics.segmentDistanceKm * perKmRate;
    const detourCost = mySegmentMetrics.detourDistanceKm * detourRate;
    const total = Math.max(0, segmentCost + detourCost);

    return {
      segmentDistanceKm: mySegmentMetrics.segmentDistanceKm,
      segmentCost,
      detourDistanceKm: mySegmentMetrics.detourDistanceKm,
      detourCost,
      total,
      isExact: true,
    };
  }, [ride?.fare, myPickup, myDropoff, mySegmentMetrics, perKmRate, detourRate, totalRideDistanceKm]);

  const acceptedPassengers = useMemo(
    () => (ride?.passengers ?? []).filter((p: any) => String(p.status ?? '').toLowerCase() === 'accepted'),
    [ride?.passengers]
  );

  // Calculate creator fare breakdown when ride or split method changes
  useEffect(() => {
    if (!ride || !isMyRide || ride.fare == null) {
      setCreatorFareBreakdown(null);
      return;
    }

    try {
      const result = calculateFareBreakdown({
        creator: {
          userId: ride.creator.id,
          name: ride.creator.name,
          handle: ride.creator.username || ride.creator.handle,
          startName: ride.start?.name || 'Start',
          endName: ride.destination?.name || 'Destination',
        },
        partners: acceptedPassengers.map((p: any) => {
          const segment = passengerSegments.find((s) => String(s.userId) === String(p.user_id));
          return {
            userId: p.user_id,
            name: p.name,
            handle: p.handle || p.username,
            startCoords: segment?.polyline
              ? { latitude: p.start_lat, longitude: p.start_lng }
              : undefined,
            endCoords: segment?.polyline
              ? { latitude: p.dest_lat, longitude: p.dest_lng }
              : undefined,
            startName: p.start_name || 'Pickup',
            endName: p.destination_name || 'Drop-off',
          };
        }),
        totalFare: Number(ride.fare),
        routePolyline: ride.routePolyline,
        rideStart: {
          latitude: ride.start?.lat ?? ride.start?.coords?.lat ?? 0,
          longitude: ride.start?.lng ?? ride.start?.coords?.lng ?? 0,
        },
        rideEnd: {
          latitude: ride.destination?.lat ?? ride.destination?.coords?.lat ?? 0,
          longitude: ride.destination?.lng ?? ride.destination?.coords?.lng ?? 0,
        },
        method: splitMethod,
      });
      setCreatorFareBreakdown(result);
    } catch (err) {
      console.warn('Failed to calculate creator fare breakdown:', err);
      setCreatorFareBreakdown(null);
    }
  }, [ride, isMyRide, ride?.fare, splitMethod, acceptedPassengers, passengerSegments]);

  // Calculate joiner fare breakdown when joining (non-creator view)
  useEffect(() => {
    if (isMyRide || !ride || ride.fare == null || !myPickup || !myDropoff) {
      setJoinerFareBreakdown(null);
      return;
    }

    try {
      // For joiner, calculate as if they are a passenger joining the ride
      const pickupCoords = getLocationCoords(myPickup);
      const dropoffCoords = getLocationCoords(myDropoff);

      if (!pickupCoords || !dropoffCoords) {
        setJoinerFareBreakdown(null);
        return;
      }

      const result = calculateFareBreakdown({
        creator: {
          userId: ride.creator.id,
          name: ride.creator.name,
          handle: ride.creator.username || ride.creator.handle,
          startName: ride.start?.name || 'Start',
          endName: ride.destination?.name || 'Destination',
        },
        partners: [
          {
            userId: currentUser?.id || 'user',
            name: 'You',
            handle: currentUser?.username || 'user',
            startCoords: { latitude: pickupCoords.lat, longitude: pickupCoords.lng },
            endCoords: { latitude: dropoffCoords.lat, longitude: dropoffCoords.lng },
            startName: myPickup?.name || 'My pickup',
            endName: myDropoff?.name || 'My drop-off',
          },
        ],
        totalFare: Number(ride.fare),
        routePolyline: ride.routePolyline,
        rideStart: {
          latitude: ride.start?.lat ?? ride.start?.coords?.lat ?? 0,
          longitude: ride.start?.lng ?? ride.start?.coords?.lng ?? 0,
        },
        rideEnd: {
          latitude: ride.destination?.lat ?? ride.destination?.coords?.lat ?? 0,
          longitude: ride.destination?.lng ?? ride.destination?.coords?.lng ?? 0,
        },
        method: splitMethod,
      });
      setJoinerFareBreakdown(result);
    } catch (err) {
      console.warn('Failed to calculate joiner fare breakdown:', err);
      setJoinerFareBreakdown(null);
    }
  }, [ride, isMyRide, ride?.fare, splitMethod, myPickup, myDropoff, currentUser?.id, currentUser?.username]);

  const showEstimatedYouRow = !isMyRide && !hasJoinRequest;
  const estimatedYouDistanceKm = myFareBreakdown?.segmentDistanceKm ?? totalRideDistanceKm;

  const splitParticipants = useMemo(() => {
    const participants: Array<{ key: string; distanceKm: number }> = [
      { key: 'creator', distanceKm: totalRideDistanceKm },
    ];

    for (const passenger of acceptedPassengers) {
      const segment = passengerSegments.find((s) => String(s.userId) === String(passenger.user_id));
      participants.push({
        key: `passenger-${passenger.user_id}`,
        distanceKm: segment?.distanceKm ?? totalRideDistanceKm,
      });
    }

    if (showEstimatedYouRow) {
      participants.push({ key: 'you', distanceKm: estimatedYouDistanceKm });
    }

    return participants;
  }, [acceptedPassengers, passengerSegments, showEstimatedYouRow, estimatedYouDistanceKm, totalRideDistanceKm]);

  const equalShare = useMemo(() => {
    if (ride?.fare == null || splitParticipants.length === 0) return 0;
    return ride.fare / splitParticipants.length;
  }, [ride?.fare, splitParticipants]);

  const totalSplitDistanceKm = useMemo(
    () => splitParticipants.reduce((sum, participant) => sum + participant.distanceKm, 0),
    [splitParticipants]
  );

  const getDistanceShare = useCallback(
    (distanceKm: number) => {
      if (ride?.fare == null) return 0;
      if (totalSplitDistanceKm > 0) {
        return ride.fare * (distanceKm / totalSplitDistanceKm);
      }
      return equalShare;
    },
    [ride?.fare, totalSplitDistanceKm, equalShare]
  );

  const handleMapTapSelect = useCallback(async (coordinate: { lat: number; lng: number }) => {
    setMapTapLoading(true);
    try {
      const resolved = await reverseGeocode(coordinate.lat, coordinate.lng);
      const tappedLocation: RideLocation = resolved ?? {
        name: `Pinned location (${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)})`,
        shortName: 'Pinned location',
        lat: coordinate.lat,
        lng: coordinate.lng,
        coords: { lat: coordinate.lat, lng: coordinate.lng },
      };

      if (mapTapTarget === 'pickup') {
        setMyPickup(tappedLocation);
        setMapTapTarget('dropoff');
      } else {
        setMyDropoff(tappedLocation);
        setMapTapTarget('pickup');
      }
    } finally {
      setMapTapLoading(false);
    }
  }, [mapTapTarget]);

  if (!ride) {
    return (
      <ScreenShell>
        <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: cardBorder }]}> 
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={textSecondary} />
            <Text style={[styles.backText, { color: textSecondary }]}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.body}>
          <Text style={{ color: textSecondary, textAlign: 'center' }}>
            {rideLoading ? 'Loading ride details...' : 'Ride not found'}
          </Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell scroll={false}>
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: cardBorder }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={textSecondary} />
          <Text style={[styles.backText, { color: textSecondary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Fare Calculation</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <MapRouteCard from={ride.from} to={ride.to} title="Full ride route" height={180} />

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <LocationDisplay from={ride.from.shortName} to={ride.to.shortName} />
          <View style={[styles.summaryGrid, { borderTopColor: cardBorder }]}>
            <View style={[styles.summaryItem, { borderColor: cardBorder }]}> 
              <Text style={styles.infoLabel}>Total fare</Text>
              <Text style={[styles.infoValue, { color: textPrimary }]}>
                {ride.fare != null ? `BDT ${ride.fare}` : 'TBD'}
              </Text>
            </View>
            <View style={[styles.summaryItem, { borderColor: cardBorder }]}> 
              <Text style={styles.infoLabel}>Total distance</Text>
              <Text style={[styles.infoValue, { color: textPrimary }]}>{totalRideDistanceKm.toFixed(1)} km</Text>
            </View>
            <View style={[styles.summaryItem, { borderColor: cardBorder }]}> 
              <Text style={styles.infoLabel}>Rate</Text>
              <Text style={[styles.infoValue, { color: textPrimary }]}>
                BDT {perKmRate.toFixed(1)}/km
              </Text>
            </View>
            <View style={[styles.summaryItem, { borderColor: cardBorder }]}> 
              <Text style={styles.infoLabel}>Detour rate</Text>
              <Text style={[styles.infoValue, { color: textPrimary }]}>
                BDT {detourRate.toFixed(1)}/km
              </Text>
            </View>
          </View>
        </View>

        {!isMyRide ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="git-compare-outline" size={16} color={colors.brand} />
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Your Route</Text>
            </View>
            <Text style={[styles.sectionHint, { color: textSecondary }]}>
              Set your pickup and drop-off for a precise polyline-based fare calculation.
            </Text>

            <Pressable
              onPress={() => setShowPickupPicker(true)}
              style={[styles.locationPickRow, { borderColor: myPickup ? colors.brand : cardBorder }]}
            >
              <View style={styles.pickDotStart} />
              <View style={styles.pickCopy}>
                <Text style={styles.pickLabel}>My pickup</Text>
                <Text style={[styles.pickValue, { color: textPrimary }]} numberOfLines={1}>
                  {myPickup?.shortName ?? 'Tap to set pickup point'}
                </Text>
              </View>
              <Ionicons name="map-outline" size={14} color="#9CA3AF" />
            </Pressable>

            <Pressable
              onPress={() => setShowDropoffPicker(true)}
              style={[styles.locationPickRow, { borderColor: myDropoff ? '#3B82F6' : cardBorder }]}
            >
              <View style={styles.pickDotEnd} />
              <View style={styles.pickCopy}>
                <Text style={styles.pickLabel}>My drop-off</Text>
                <Text style={[styles.pickValue, { color: textPrimary }]} numberOfLines={1}>
                  {myDropoff?.shortName ?? 'Tap to set drop-off point'}
                </Text>
              </View>
              <Ionicons name="map-outline" size={14} color="#9CA3AF" />
            </Pressable>

            <View style={styles.mapTapControls}>
              <Text style={[styles.mapTapHint, { color: textSecondary }]}>Tap on map to set location:</Text>
              <View style={styles.mapTapTargetRow}>
                <Pressable
                  onPress={() => setMapTapTarget('pickup')}
                  style={[
                    styles.mapTapTargetChip,
                    mapTapTarget === 'pickup' ? styles.mapTapTargetChipActive : [styles.mapTapTargetChipIdle, { borderColor: cardBorder }],
                  ]}
                >
                  <Text style={styles.mapTapTargetText}>Pickup</Text>
                </Pressable>
                <Pressable
                  onPress={() => setMapTapTarget('dropoff')}
                  style={[
                    styles.mapTapTargetChip,
                    mapTapTarget === 'dropoff' ? styles.mapTapTargetChipActive : [styles.mapTapTargetChipIdle, { borderColor: cardBorder }],
                  ]}
                >
                  <Text style={styles.mapTapTargetText}>Drop-off</Text>
                </Pressable>
              </View>
            </View>

            <MapRouteCard
              from={myPickup ?? ride.from}
              to={myDropoff ?? ride.to}
              title={mapTapLoading ? 'Resolving tapped location...' : 'Tap map to set your segment'}
              height={165}
              onMapPress={handleMapTapSelect}
            />
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Pricing Model</Text>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={14} color="#60A5FA" style={styles.infoIcon} />
            <Text style={styles.infoBoxText}>
              Your fare is calculated based on the exact distance of your segment within the ride route, plus a
              detour penalty if you're off-route.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Split Method</Text>
          <View style={styles.methodGrid}>
            <Pressable
              onPress={() => setSplitMethod('distance')}
              style={[
                styles.methodCard,
                splitMethod === 'distance'
                  ? styles.methodCardActive
                  : [styles.methodCardIdle, { borderColor: cardBorder }],
              ]}
            >
              <Ionicons name="git-network-outline" size={18} color={splitMethod === 'distance' ? colors.brand : '#9CA3AF'} />
              <View>
                <Text style={[styles.methodTitle, { color: textPrimary }]}>Distance</Text>
                <Text style={[styles.methodCaption, { color: textSecondary }]}>By route length</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setSplitMethod('equal')}
              style={[
                styles.methodCard,
                splitMethod === 'equal'
                  ? styles.methodCardActive
                  : [styles.methodCardIdle, { borderColor: cardBorder }],
              ]}
            >
              <Ionicons name="people-outline" size={18} color={splitMethod === 'equal' ? colors.brand : '#9CA3AF'} />
              <View>
                <Text style={[styles.methodTitle, { color: textPrimary }]}>Equal</Text>
                <Text style={[styles.methodCaption, { color: textSecondary }]}>Split evenly</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={14} color="#60A5FA" style={styles.infoIcon} />
            <Text style={styles.infoBoxText}>
              {splitMethod === 'distance'
                ? 'Each person pays proportionally to their traveled distance within the ride route. Fairer for partial-route riders.'
                : 'All participants share the total fare equally regardless of distance. Simple and straightforward.'}
            </Text>
          </View>
        </View>

        {ride.fare != null ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Fare Breakdown</Text>

            {/* Header row */}
            <View style={[styles.breakdownHeaderRow, { borderBottomColor: cardBorder }]}>
              <Text style={[styles.breakdownHeaderCell, { color: textSecondary }, { flex: 1 }]}>Person</Text>
              {splitMethod === 'distance' && (
                <Text style={[styles.breakdownHeaderCell, { color: textSecondary }, { width: 60, textAlign: 'center' }]}>
                  Distance
                </Text>
              )}
              <Text style={[styles.breakdownHeaderCell, { color: textSecondary }, { width: 70, textAlign: 'right' }]}>
                Share
              </Text>
            </View>

            {/* Use calculated breakdown if creator, otherwise use manual calculation */}
            {isMyRide && creatorFareBreakdown ? (
              creatorFareBreakdown.breakdown.map((participant, idx) => (
                <View key={idx} style={[styles.breakdownDataRow, { borderBottomColor: cardBorder }]}>
                  <View style={styles.breakdownPersonInfo}>
                    <UserAvatar size="sm" name={participant.name} source={undefined} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.breakdownPersonName, { color: textPrimary }]} numberOfLines={1}>
                        {participant.name}
                      </Text>
                      <View
                        style={[styles.breakdownBadge, { backgroundColor: participant.isCreator ? colors.brand : '#3B82F6' }]}
                      >
                        <Text style={styles.breakdownBadgeText}>{participant.isCreator ? 'Creator' : 'Buddy'}</Text>
                      </View>
                    </View>
                  </View>
                  {splitMethod === 'distance' && participant.distance !== null && (
                    <Text style={[styles.breakdownHeaderCell, { color: textSecondary }, { width: 60, textAlign: 'center' }]}>
                      {participant.distance.toFixed(1)} km
                    </Text>
                  )}
                  <Text style={[styles.breakdownShare, { color: textPrimary }]}>
                    BDT {Number(participant.fare).toFixed(0)}
                  </Text>
                </View>
              ))
            ) : (
              <>
                {/* Creator row */}
                <View style={[styles.breakdownDataRow, { borderBottomColor: cardBorder }]}>
                  <View style={styles.breakdownPersonInfo}>
                    <UserAvatar size="sm" name={ride.creator.name} source={ride.creator.avatar ?? undefined} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.breakdownPersonName, { color: textPrimary }]} numberOfLines={1}>
                        {ride.creator.name}
                      </Text>
                      <View style={[styles.breakdownBadge, { backgroundColor: colors.brand }]}>
                        <Text style={styles.breakdownBadgeText}>Creator</Text>
                      </View>
                    </View>
                  </View>
                  {splitMethod === 'distance' && (
                    <Text style={[styles.breakdownHeaderCell, { color: textSecondary }, { width: 60, textAlign: 'center' }]}>
                      {totalRideDistanceKm.toFixed(1)} km
                    </Text>
                  )}
                  <Text style={[styles.breakdownShare, { color: textPrimary }]}>
                    BDT {splitMethod === 'equal' ? equalShare.toFixed(0) : getDistanceShare(totalRideDistanceKm).toFixed(0)}
                  </Text>
                </View>

                {/* Passengers */}
                {acceptedPassengers.map((passenger) => {
                  const segment = passengerSegments.find((s) => String(s.userId) === String(passenger.user_id));
                  const passengerDistanceKm = segment?.distanceKm ?? totalRideDistanceKm;
                  const passengerFare = splitMethod === 'equal' ? equalShare : getDistanceShare(passengerDistanceKm);

                  return (
                    <View key={passenger.user_id} style={[styles.breakdownDataRow, { borderBottomColor: cardBorder }]}>
                      <View style={styles.breakdownPersonInfo}>
                        <UserAvatar size="sm" name={passenger.name} source={passenger.avatar_url ?? undefined} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.breakdownPersonName, { color: textPrimary }]} numberOfLines={1}>
                            {passenger.name}
                          </Text>
                          <View style={[styles.breakdownBadge, { backgroundColor: '#3B82F6' }]}>
                            <Text style={styles.breakdownBadgeText}>Buddy</Text>
                          </View>
                        </View>
                      </View>
                      {splitMethod === 'distance' && (
                        <Text style={[styles.breakdownHeaderCell, { color: textSecondary }, { width: 60, textAlign: 'center' }]}>
                          {passengerDistanceKm.toFixed(1)} km
                        </Text>
                      )}
                      <Text style={[styles.breakdownShare, { color: textPrimary }]}>
                        BDT {passengerFare.toFixed(0)}
                      </Text>
                    </View>
                  );
                })}

                {/* You row (if not creator and not already accepted) */}
                {showEstimatedYouRow && (
                  <View style={[styles.breakdownDataRow, { borderBottomColor: cardBorder }]}>
                    <View style={styles.breakdownPersonInfo}>
                      <UserAvatar size="sm" name="You" source={undefined} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.breakdownPersonName, { color: textPrimary }]} numberOfLines={1}>
                          You
                        </Text>
                        <View style={[styles.breakdownBadge, { backgroundColor: joinerFareBreakdown ? '#3B82F6' : '#10B981' }]}>
                          <Text style={styles.breakdownBadgeText}>{joinerFareBreakdown ? 'Joiner' : 'Estimated'}</Text>
                        </View>
                      </View>
                    </View>
                    {splitMethod === 'distance' && (
                      <Text style={[styles.breakdownHeaderCell, { color: textSecondary }, { width: 60, textAlign: 'center' }]}>
                        {joinerFareBreakdown && joinerFareBreakdown.breakdown[1]?.distance !== null
                          ? joinerFareBreakdown.breakdown[1].distance.toFixed(1)
                          : estimatedYouDistanceKm.toFixed(1)}{' '}
                        km
                      </Text>
                    )}
                    <Text style={[styles.breakdownShare, { color: textPrimary }]}>
                      BDT{' '}
                      {joinerFareBreakdown && joinerFareBreakdown.breakdown[1]
                        ? Number(joinerFareBreakdown.breakdown[1].fare).toFixed(0)
                        : splitMethod === 'equal'
                          ? equalShare.toFixed(0)
                          : getDistanceShare(estimatedYouDistanceKm).toFixed(0)}
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Total row */}
            <View style={[styles.breakdownTotalRow, { borderTopColor: cardBorder }]}>
              <Text style={[styles.breakdownTotalLabel, { color: textPrimary }]}>Total Fare</Text>
              <Text style={styles.breakdownTotalValue}>BDT {ride.fare}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.noFareCard}>
            <Text style={styles.noFareText}>Fare not set yet. The ride creator will update it later.</Text>
          </View>
        )}

        {myFareBreakdown && myFareBreakdown.total > 0 && hasJoinRequest ? (
          <View style={styles.payHighlight}>
            <View>
              <Text style={styles.payHighlightLabel}>Your estimated fare ({splitMethod} split)</Text>
              <Text style={styles.payHighlightValue}>
                BDT {
                  joinerFareBreakdown && joinerFareBreakdown.breakdown[1]
                    ? Number(joinerFareBreakdown.breakdown[1].fare).toFixed(0)
                    : splitMethod === 'equal'
                      ? ((ride.fare ?? 0) / (1 + ((ride.passengers ?? []).filter(p => p.status?.toLowerCase() === 'accepted').length))).toFixed(0)
                      : (myFareBreakdown.total).toFixed(0)
                }
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(app)/payment')} style={styles.payButton}>
              <Ionicons name="card-outline" size={15} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Pay Now</Text>
            </Pressable>
          </View>
        ) : showEstimatedYouRow && joinerFareBreakdown && joinerFareBreakdown.breakdown[1] ? (
          <View style={styles.payHighlight}>
            <View>
              <Text style={styles.payHighlightLabel}>Your estimated fare ({splitMethod} split)</Text>
              <Text style={styles.payHighlightValue}>
                BDT {Number(joinerFareBreakdown.breakdown[1].fare).toFixed(0)}
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(app)/(joinRide)/requestToJoin')} style={styles.payButton}>
              <Ionicons name="person-add-outline" size={15} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Join Ride</Text>
            </Pressable>
          </View>
        ) : !isMyRide && !hasJoinRequest ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.noFareText, { textAlign: 'center', marginBottom: 0 }]}>
              Set your pickup and drop-off to see your estimated fare
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {showPickupPicker ? (
        <LocationPickerModal
          visible
          title="Set your pickup point"
          onSelect={(location) => {
            setMyPickup(location);
            setShowPickupPicker(false);
          }}
          onClose={() => setShowPickupPicker(false)}
        />
      ) : null}

      {showDropoffPicker ? (
        <LocationPickerModal
          visible
          title="Set your drop-off point"
          onSelect={(location) => {
            setMyDropoff(location);
            setShowDropoffPicker(false);
          }}
          onClose={() => setShowDropoffPicker(false)}
        />
      ) : null}
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
    paddingBottom: 28,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  summaryGrid: {
    marginTop: 2,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
  },
  summaryItem: {
    width: '48.5%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  infoLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  locationPickRow: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickDotStart: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  pickDotEnd: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#3B82F6',
  },
  pickCopy: {
    flex: 1,
    minWidth: 0,
  },
  pickLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 1,
  },
  pickValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  mapTapControls: {
    gap: 8,
  },
  mapTapHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  mapTapTargetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mapTapTargetChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapTapTargetChipActive: {
    backgroundColor: '#FFE4E6',
    borderColor: colors.brand,
  },
  mapTapTargetChipIdle: {
    backgroundColor: 'transparent',
  },
  mapTapTargetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  methodGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  methodCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodCardActive: {
    borderColor: colors.brand,
    backgroundColor: '#FFF0F2',
  },
  methodCardIdle: {
    backgroundColor: 'transparent',
  },
  methodTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  methodCaption: {
    fontSize: 11,
  },
  infoBox: {
    marginTop: 2,
    borderRadius: 12,
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoBoxText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
    flex: 1,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownHeaderCell: {
    fontSize: 11,
    fontWeight: '600',
  },
  breakdownDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownPersonInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  breakdownPersonName: {
    fontSize: 12,
    fontWeight: '600',
  },
  breakdownShare: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'right',
  },
  breakdownRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownCopy: {
    flex: 1,
    minWidth: 0,
  },
  breakdownName: {
    fontSize: 12,
    fontWeight: '600',
  },
  breakdownBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
  },
  breakdownBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  breakdownDistanceInfo: {
    width: 56,
    alignItems: 'center',
  },
  breakdownDistance: {
    fontSize: 11,
    textAlign: 'center',
  },
  breakdownFare: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 62,
    textAlign: 'right',
  },
  breakdownDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownLeft: {
    flex: 1,
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownLabel: {
    fontSize: 12,
    marginBottom: 3,
  },
  breakdownCost: {
    fontSize: 14,
    fontWeight: '700',
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  breakdownTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brand,
  },
  totalRow: {
    marginTop: 2,
    paddingTop: 9,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brand,
  },
  noFareCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  noFareText: {
    color: '#B45309',
    fontSize: 13,
    textAlign: 'center',
  },
  payHighlight: {
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  payHighlightLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginBottom: 2,
  },
  payHighlightValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  payButton: {
    borderRadius: 10,
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
