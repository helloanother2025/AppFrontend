import { useState, useCallback, useEffect, useMemo } from 'react';
import { router } from 'expo-router';

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { ScreenShell } from '../components/ScreenShell';
import {
  transportEmoji,
  type TransportMode,
} from '../utils/rideMapper';

import { useAppContext } from '../context/AppContext';
import { useUser } from '../context/UserContext';
import { useRide } from '../context/RideContext';
import { useJoinRequests } from '../context/JoinRequestContext';
import { useSearch } from '../context/SearchContext';
import { LocationDisplay } from '../components/LocationDisplay';

import { UserAvatar } from '../components/UserAvatar';
import { InCallModal } from '../components/InCallModal';
import { formatRideDate } from '../utils/date';
import { type RideLocation, type User } from '../utils/rideMapper';
import { RefreshControl } from 'react-native';



type HomeTab = 'activity' | 'rides' | 'discover';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen() {
  const { darkMode, toggleDarkMode, isDemoMode } = useAppContext();
  const { user } = useUser();
  const { setSearchData } = useSearch();
  const { 
    myRides, 
    joinedRides, 
    rides,
    selectRide,
    getRideDetails,
    fetchMyRides, 
    fetchJoinedRides, 
    fetchAvailableRides,
    loading: ridesLoading 
  } = useRide();
  const { 
    incomingRequests, 
    myRequests, 
    fetchIncomingRequests,
    fetchMyRequests, 
    loading: requestsLoading 
  } = useJoinRequests();

  const [activeTab, setActiveTab] = useState<HomeTab>('activity');
  const [callingUser, setCallingUser] = useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (isDemoMode) {
      await fetchAvailableRides({}, true);
      return;
    }
    const createdRides = await fetchMyRides();
    await Promise.all([
      fetchJoinedRides(),
      fetchMyRequests(),
      fetchAvailableRides({}, false),
      ...createdRides.map((ride) => fetchIncomingRequests(Number(ride.id))),
    ]);
  }, [isDemoMode, fetchMyRides, fetchJoinedRides, fetchMyRequests, fetchAvailableRides, fetchIncomingRequests]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
  }, [fetchAllData]);

  const pendingPaymentRequests = (myRequests ?? []).filter(
    (jr: any) =>
      jr.status === 'accepted' &&
      jr.paymentStatus === 'pending'
  );

  const createdRideIds = useMemo(() => new Set((myRides ?? []).map((ride) => String(ride.id))), [myRides]);

  const pendingIncoming = useMemo(
    () => (incomingRequests ?? []).filter((jr: any) => jr.status === 'pending' && createdRideIds.has(String(jr.rideId))),
    [incomingRequests, createdRideIds]
  );

  const popularRoutes = useMemo(() => {
    const routeMap = new Map<string, { route: string; count: number; nextDepartureTs?: number; from: RideLocation; to: RideLocation }>();

    const allRides = [...(rides ?? []), ...(myRides ?? []), ...(joinedRides ?? [])];

    allRides.forEach((ride: any) => {
      const fromName = ride?.from?.shortName || ride?.from?.name || ride?.start?.shortName || ride?.start?.name;
      const toName = ride?.to?.shortName || ride?.to?.name || ride?.destination?.shortName || ride?.destination?.name;
      if (!fromName || !toName) return;

      const fromLocation: RideLocation = {
        name: ride?.from?.name || ride?.start?.name || fromName,
        shortName: ride?.from?.shortName || ride?.start?.shortName || fromName,
        coords: ride?.from?.coords || ride?.start?.coords || null,
        lat: Number(ride?.from?.lat ?? ride?.start?.lat ?? ride?.from?.coords?.lat ?? ride?.start?.coords?.lat ?? 0),
        lng: Number(ride?.from?.lng ?? ride?.start?.lng ?? ride?.from?.coords?.lng ?? ride?.start?.coords?.lng ?? 0),
      };

      const toLocation: RideLocation = {
        name: ride?.to?.name || ride?.destination?.name || toName,
        shortName: ride?.to?.shortName || ride?.destination?.shortName || toName,
        coords: ride?.to?.coords || ride?.destination?.coords || null,
        lat: Number(ride?.to?.lat ?? ride?.destination?.lat ?? ride?.to?.coords?.lat ?? ride?.destination?.coords?.lat ?? 0),
        lng: Number(ride?.to?.lng ?? ride?.destination?.lng ?? ride?.to?.coords?.lng ?? ride?.destination?.coords?.lng ?? 0),
      };

      const key = `${fromName} -> ${toName}`;
      const departureTs = Date.parse(String(ride?.departureTime || ride?.startTime || ''));
      const existing = routeMap.get(key);
      if (!existing) {
        routeMap.set(key, {
          route: key,
          count: 1,
          nextDepartureTs: Number.isFinite(departureTs) ? departureTs : undefined,
          from: fromLocation,
          to: toLocation,
        });
        return;
      }

      const nextDepartureTs = existing.nextDepartureTs == null
        ? (Number.isFinite(departureTs) ? departureTs : undefined)
        : (Number.isFinite(departureTs) ? Math.min(existing.nextDepartureTs, departureTs) : existing.nextDepartureTs);

      routeMap.set(key, {
        route: key,
        count: existing.count + 1,
        nextDepartureTs,
        from: existing.from,
        to: existing.to,
      });
    });

    return Array.from(routeMap.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        if (a.nextDepartureTs == null && b.nextDepartureTs == null) return a.route.localeCompare(b.route);
        if (a.nextDepartureTs == null) return 1;
        if (b.nextDepartureTs == null) return -1;
        return a.nextDepartureTs - b.nextDepartureTs;
      })
      .slice(0, 5);
  }, [rides, myRides, joinedRides]);
  
  // Dynamic ride selectors
  const ongoingRide = (myRides ?? []).find(r => r.status === 'started');
  const upcomingRide = (myRides ?? []).find(r => r.status === 'unactive') || (joinedRides ?? []).find(r => r.status === 'unactive');
  const pastRides = [...(myRides ?? []), ...(joinedRides ?? [])].filter(r => r.status === 'completed');

  const pastRideNeedsReview = pastRides.find(r => r.status === 'completed'); // Simplification for now




  const textPrimary = darkMode ? colors.textPrimaryDark : colors.textPrimaryLight;
  const textSecondary = darkMode ? colors.textSecondaryDark : colors.textSecondaryLight;
  const bg = darkMode ? '#0A0A0A' : '#F5F5F7';
  const card = darkMode ? '#1A1A1A' : '#FFFFFF';
  const border = darkMode ? '#2A2A2A' : '#EEEEEE';
  const tabBg = darkMode ? '#1A1A1A' : '#EBEBEB';

  
  const tabs: { key: HomeTab; label: string }[] = [
    { key: 'activity', label: 'Activity' },
    { key: 'rides', label: 'My Rides' },
    { key: 'discover', label: 'Discover' },
  ];

  const statusBg = (color: string) => {
    if (color === '#E83950') {
      return darkMode ? 'rgba(232,57,80,0.2)' : 'rgba(232,57,80,0.1)';
    }
    return darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  };

  const statusText = (color: string) => {
    if (color === '#E83950') {
      return '#E83950';
    }
    return darkMode ? '#BBBBBB' : '#444444';
  };

  return (
    <ScreenShell scroll={false}>
      <View style={[styles.root, { backgroundColor: bg }]}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.brand]} tintColor={colors.brand} />
          }
        >

          <View style={[styles.heroHeader, { backgroundColor: card, borderBottomColor: border }]}>
            <View style={styles.heroTopRow}>
              <View>
                <Text style={[styles.greetingText, { color: textSecondary }]}>{getGreeting()},</Text>
                <View style={styles.nameRow}>
                  <Text style={[styles.heroName, { color: textPrimary }]}>{isDemoMode || !user ? 'Guest' : user.name.split(' ')[0]}</Text>
                  {!isDemoMode && user ? <Text style={styles.wave}>👋</Text> : null}
                </View>
              </View>

              <View style={styles.heroActions}>
                <Pressable
                  onPress={toggleDarkMode}
                  style={[styles.themeButton, { backgroundColor: darkMode ? '#2A2A2A' : '#F5F5F7' }]}
                >
                  <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={18} color={darkMode ? '#F5C542' : '#666666'} />
                </Pressable>

                <Pressable onPress={() => router.push('/(app)/profile')}>
                  <UserAvatar
                    size={36}
                    name={isDemoMode || !user ? 'Guest' : user.name}
                    source={user?.avatar || undefined}
                  />
                </Pressable>

              </View>
            </View>

            <View style={styles.quickGrid}>
              <Pressable
                onPress={() => router.push('/(app)/dashboard')}
                style={[styles.quickActionCard, { backgroundColor: bg, borderColor: border }]}
              >
                <View style={styles.quickActionIconDark}>
                  <Ionicons name="search" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.quickActionCopy}>
                  <Text style={[styles.quickActionTitle, { color: textPrimary }]}>Find Rides</Text>
                  <Text style={[styles.quickActionSubtitle, { color: textSecondary }]}>Browse available</Text>
                </View>
              </Pressable>

              <Pressable onPress={() => router.push('/(app)/create-ride')} style={styles.createCard}>
                <View style={styles.quickActionIconLight}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.quickActionCopy}>
                  <Text style={styles.quickActionTitleLight}>Create Ride</Text>
                  <Text style={styles.quickActionSubtitleLight}>Share your trip</Text>
                </View>
              </Pressable>
            </View>
          </View>

          <View style={styles.tabWrapOuter}>
            <View style={[styles.tabWrap, { backgroundColor: tabBg }]}>
              {tabs.map((tab) => (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[styles.tabButton, activeTab === tab.key ? styles.tabButtonActive : null]}
                >
                  <Text style={[styles.tabText, { color: activeTab === tab.key ? '#FFFFFF' : textSecondary, fontWeight: activeTab === tab.key ? '600' : '400' }]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.tabBody}>
            {activeTab === 'activity' ? (
              <>
                {ongoingRide ? (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionLabelRow}>
                      <Ionicons name="alert-circle-outline" size={14} color="#E83950" />
                      <Text style={[styles.sectionLabel, { color: textSecondary }]}>ONGOING RIDE</Text>
                    </View>

                    <Pressable
                      onPress={async () => {
                        await getRideDetails(ongoingRide.id);
                        router.push({ pathname: '/(app)/ride-details', params: { rideId: String(ongoingRide.id) } });
                      }}
                      style={[styles.cardContainer, { backgroundColor: card, borderColor: border }]}
                    >

                      <View style={styles.cardInnerPad}>
                        <View style={styles.cardTopRow}>
                          <View style={[styles.statusPill, { backgroundColor: statusBg('#E83950') }]}>
                            <View style={styles.statusDot} />
                            <Text style={[styles.statusPillText, { color: statusText('#E83950') }]}>In Progress</Text>
                          </View>
                          <Text style={[styles.transportText, { color: textSecondary }]}>{transportEmoji[ongoingRide.transport as TransportMode] || '🚗'} {ongoingRide.transport}</Text>
                        </View>



                        <LocationDisplay from={ongoingRide.from.shortName} to={ongoingRide.to.shortName} compact />

                        <View style={styles.metaRow}>
                          <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={11} color={textSecondary} />
                            <Text style={[styles.metaText, { color: textSecondary }]}>{formatRideDate(ongoingRide.departureTime)}</Text>
                          </View>
                          <View style={styles.metaItem}>
                            <Ionicons name="people-outline" size={11} color={textSecondary} />
                            <Text style={[styles.metaText, { color: textSecondary }]}>{ongoingRide.currentPassengers} joined • {Math.max(0, ongoingRide.seats - ongoingRide.currentPassengers)} spots left</Text>
                          </View>
                        </View>
                      </View>

                      <View style={[styles.footerAction, { borderTopColor: border, backgroundColor: darkMode ? '#111111' : '#F9F9F9' }]}>
                        <Text style={styles.footerActionBrand}>Manage ride</Text>
                        <Ionicons name="chevron-forward" size={14} color="#E83950" />
                      </View>
                    </Pressable>
                  </View>
                ) : null}

                {upcomingRide ? (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionLabelRow}>
                      <Ionicons name="time-outline" size={14} color={textSecondary} />
                      <Text style={[styles.sectionLabel, { color: textSecondary }]}>UPCOMING RIDE</Text>
                    </View>

                    <Pressable
                      onPress={async () => {
                        await getRideDetails(upcomingRide.id);
                        router.push({ pathname: '/(app)/ride-details', params: { rideId: String(upcomingRide.id) } });
                      }}
                      style={[styles.cardContainer, { backgroundColor: card, borderColor: border }]}
                    >
                      <View style={styles.cardInnerPad}>
                        <View style={styles.cardTopRow}>
                          <View style={[styles.statusPill, { backgroundColor: statusBg('#1C1C1E') }]}>
                            <Text style={[styles.statusPillText, { color: statusText('#1C1C1E') }]}>Scheduled</Text>
                          </View>
                          <Text style={[styles.transportText, { color: textSecondary }]}>{transportEmoji[upcomingRide.transport as TransportMode] || '🚗'} {upcomingRide.transport}</Text>
                        </View>



                        <LocationDisplay from={upcomingRide.from.shortName} to={upcomingRide.to.shortName} compact />

                        <View style={styles.metaRow}>
                          <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={11} color={textSecondary} />
                            <Text style={[styles.metaText, { color: textSecondary }]}>{formatRideDate(upcomingRide.departureTime)}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={[styles.footerAction, { borderTopColor: border, backgroundColor: darkMode ? '#111111' : '#F9F9F9' }]}>
                        <Text style={[styles.footerActionMuted, { color: textSecondary }]}>Manage</Text>
                        <Ionicons name="chevron-forward" size={14} color={textSecondary} />
                      </View>
                    </Pressable>
                  </View>
                ) : null}


                {pendingIncoming.length > 0 ? (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionLabelRow}>
                      <Ionicons name="notifications-outline" size={14} color="#E83950" />
                      <Text style={[styles.sectionLabel, { color: textSecondary }]}>JOIN REQUESTS</Text>
                    </View>

                    <Pressable
                      style={[styles.requestCard, { backgroundColor: card, borderColor: border }]}
                      onPress={() => router.push('/(app)/ride-status')}
                    >
                      <View style={styles.requestLeft}>
                        <View style={styles.requestIconWrap}>
                          <Ionicons name="people" size={18} color="#FFFFFF" />
                        </View>
                        <View>
                          <Text style={[styles.requestTitle, { color: textPrimary }]}> 
                            {pendingIncoming.length} pending request{pendingIncoming.length > 1 ? 's' : ''}
                          </Text>
                          <Text style={[styles.requestSubtitle, { color: textSecondary }]}>Tap to review</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={textSecondary} />
                    </Pressable>
                  </View>
                ) : null}

                {pendingPaymentRequests.length > 0 ? (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionLabelRow}>
                      <Ionicons name="card-outline" size={14} color="#E83950" />
                      <Text style={[styles.sectionLabel, { color: textSecondary }]}>PAYMENT DUE</Text>
                    </View>

                    {pendingPaymentRequests.map((jr: any) => (
                      <Pressable
                        key={jr.id}
                        onPress={() => router.push('/(app)/payment')}
                        style={[styles.cardContainer, { backgroundColor: card, borderColor: border }]}
                      >

                        <View style={styles.cardInnerPad}>
                          <View style={styles.paymentTopRow}>
                            <UserAvatar size={32} name={jr.ride.creator.name} />
                            <View style={styles.paymentNameWrap}>
                              <Text style={[styles.paymentName, { color: textPrimary }]}>{jr.ride.creator.name}</Text>
                              <Text style={[styles.paymentHandle, { color: textSecondary }]}>@{jr.ride.creator.username}</Text>
                            </View>
                            <View style={styles.paymentAmountWrap}>
                              <Text style={styles.paymentAmount}>BDT {jr.ride.fare != null ? Math.round(jr.ride.fare / (jr.ride.seats + 1)) : '–'}</Text>
                              <Text style={[styles.paymentLabel, { color: textSecondary }]}>your share</Text>
                            </View>
                          </View>

                          <LocationDisplay from={jr.ride.from.shortName} to={jr.ride.to.shortName} compact />
                        </View>

                        <View style={[styles.footerAction, { borderTopColor: border, backgroundColor: darkMode ? '#1A0A0D' : '#FFF5F5' }]}>
                          <Text style={styles.footerActionBrand}>Pay now</Text>
                          <Ionicons name="chevron-forward" size={14} color="#E83950" />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {pastRideNeedsReview ? (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionLabelRow}>
                      <Ionicons name="checkmark-circle-outline" size={14} color={textSecondary} />
                      <Text style={[styles.sectionLabel, { color: textSecondary }]}>RECENT RIDE</Text>
                    </View>

                    <View style={[styles.cardContainer, { backgroundColor: card, borderColor: border }]}> 
                      <View style={styles.cardInnerPad}>
                        <View style={styles.recentTopRow}>
                          <UserAvatar size={32} name={pastRideNeedsReview.creator.name} />
                          <View style={styles.recentNameWrap}>
                            <Text style={[styles.paymentName, { color: textPrimary }]}>{pastRideNeedsReview.creator.name}</Text>
                            <View style={styles.ratingRow}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Ionicons key={s} name={s <= Math.round(pastRideNeedsReview.creator.rating || 5) ? 'star' : 'star-outline'} size={10} color={s <= Math.round(pastRideNeedsReview.creator.rating || 5) ? '#F59E0B' : '#D1D5DB'} />
                              ))}
                              <Text style={[styles.ratingText, { color: textSecondary }]}>{pastRideNeedsReview.creator.rating || 5.0}</Text>
                            </View>
                          </View>

                          <Pressable
                            onPress={() => setCallingUser(pastRideNeedsReview.creator as any)}
                            style={[styles.callButton, { backgroundColor: darkMode ? '#2A2A2A' : '#F5F5F7' }]}
                          >
                            <Ionicons name="call-outline" size={14} color={textSecondary} />
                          </Pressable>

                          <View style={[styles.statusPill, { backgroundColor: statusBg('#1C1C1E') }]}> 
                            <Text style={[styles.statusPillText, { color: statusText('#1C1C1E') }]}>Completed</Text>
                          </View>
                        </View>

                        <LocationDisplay from={pastRideNeedsReview.from.shortName} to={pastRideNeedsReview.to.shortName} compact />
                        <Text style={[styles.recentMeta, { color: textSecondary }]}>{formatRideDate(pastRideNeedsReview.departureTime)} · BDT {pastRideNeedsReview.fare}</Text>
                      </View>

                      <View style={[styles.recentButtonsWrap, { borderTopColor: border }]}>
                        <Pressable onPress={() => router.push('/(app)/ride-review')} style={styles.recentPrimaryButton}>
                          <Text style={styles.recentPrimaryButtonText}>Leave Review</Text>
                        </Pressable>
                        <Pressable onPress={() => router.push('/(app)/payment')} style={styles.recentSecondaryButton}>
                          <Text style={styles.recentSecondaryButtonText}>Pay Now</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ) : null}


                <Pressable onPress={() => router.push('/(app)/ride-status')} style={styles.bigDarkCta}>
                  <Text style={styles.bigDarkCtaText}>View all my rides</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </>
            ) : null}

            {activeTab === 'rides' ? (
              <>
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionLabelRow}>
                    <Ionicons name="location-outline" size={14} color={textSecondary} />
                    <Text style={[styles.sectionLabel, { color: textSecondary }]}>MY CURRENT RIDES</Text>
                  </View>

                  {[...(myRides ?? []), ...(joinedRides ?? [])].filter(r => r.status !== 'completed' && r.status !== 'cancelled').map((ride) => (
                    <Pressable
                      key={ride.id}
                      style={[styles.simpleRideCard, { backgroundColor: card, borderColor: border }]}
                      onPress={async () => {
                        await getRideDetails(ride.id);
                        router.push({ pathname: '/(app)/ride-details', params: { rideId: String(ride.id) } });
                      }}
                    >
                      <View style={styles.cardTopRow}>
                        <View style={[styles.statusPill, { backgroundColor: statusBg(ride.status === 'started' ? '#E83950' : '#1C1C1E') }]}>
                          {ride.status === 'started' ? <View style={styles.statusDot} /> : null}
                          <Text style={[styles.statusPillText, { color: statusText(ride.status === 'started' ? '#E83950' : '#1C1C1E') }]}> 
                            {ride.status === 'started' ? 'Ongoing' : 'Scheduled'}
                          </Text>
                        </View>
                        <Text style={[styles.transportText, { color: textSecondary }]}>{transportEmoji[ride.transport as TransportMode] || '🚗'} {ride.transport}</Text>
                      </View>



                      <LocationDisplay from={ride.from.shortName} to={ride.to.shortName} compact />

                      <View style={styles.metaRowWide}>
                        <View style={styles.metaItem}>
                          <Ionicons name="time-outline" size={11} color={textSecondary} />
                          <Text style={[styles.metaText, { color: textSecondary }]}>{formatRideDate(ride.departureTime)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="people-outline" size={11} color={textSecondary} />
                          <Text style={[styles.metaText, { color: textSecondary }]}>{ride.currentPassengers} joined • {Math.max(0, ride.seats - ride.currentPassengers)} spots left</Text>
                        </View>
                        <Text style={styles.fareText}>BDT {ride.fare}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.sectionBlock}>
                  <View style={styles.sectionLabelRow}>
                    <Ionicons name="refresh-outline" size={14} color={textSecondary} />
                    <Text style={[styles.sectionLabel, { color: textSecondary }]}>PAST RIDES</Text>
                  </View>

                  {pastRides.slice(0, 3).map((ride) => (
                    <Pressable
                      key={ride.id}
                      style={[styles.simpleRideCard, { backgroundColor: card, borderColor: border }]}
                      onPress={() => {
                        selectRide(ride);
                        router.push({ pathname: '/(app)/ride-details', params: { rideId: String(ride.id) } });
                      }}
                    >
                      <View style={styles.cardTopRow}>
                        <View style={[styles.statusPill, { backgroundColor: statusBg('#1C1C1E') }]}> 
                          <Text style={[styles.statusPillText, { color: statusText('#1C1C1E') }]}>Completed</Text>
                        </View>
                        <Text style={[styles.transportText, { color: textSecondary }]}>{transportEmoji[ride.transport as TransportMode] || '🚗'} {ride.transport}</Text>
                      </View>


                      <LocationDisplay from={ride.from.shortName} to={ride.to.shortName} compact />
                      <Text style={[styles.recentMeta, { color: textSecondary }]}>{formatRideDate(ride.departureTime)} · BDT {ride.fare}</Text>
                    </Pressable>
                  ))}

                  <Pressable onPress={() => router.push('/(app)/ride-status')} style={styles.outlineActionButton}>
                    <Text style={styles.outlineActionButtonText}>View full history</Text>
                  </Pressable>
                </View>


                <Pressable onPress={() => router.push('/(app)/create-ride')} style={styles.bigBrandCta}>
                  <Text style={styles.bigBrandCtaText}>+ Create a new ride</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </>
            ) : null}

            {activeTab === 'discover' ? (
              <>
                <View style={[styles.discoverCard, { backgroundColor: card, borderColor: border }]}> 
                  <Text style={[styles.discoverTitle, { color: textPrimary }]}>Find a ride near you</Text>
                  <Text style={[styles.discoverSubtitle, { color: textSecondary }]}>Browse rides going your way</Text>
                  <Pressable onPress={() => router.push('/(app)/dashboard')} style={styles.searchRideButton}>
                    <Text style={styles.searchRideButtonText}>Search Rides</Text>
                  </Pressable>
                </View>

                <View style={styles.sectionBlock}>
                  <View style={styles.sectionLabelRow}>
                    <Ionicons name="location-outline" size={14} color={textSecondary} />
                    <Text style={[styles.sectionLabel, { color: textSecondary }]}>POPULAR ROUTES</Text>
                  </View>

                  {popularRoutes.length > 0 ? popularRoutes.map((item) => (
                    <Pressable
                      key={item.route}
                      style={[styles.routeRow, { backgroundColor: darkMode ? '#1A1A1A' : '#F9F9F9', borderColor: border }]}
                      onPress={() => {
                        setSearchData((prev) => ({
                          ...prev,
                          start: item.from,
                          destination: item.to,
                        }));
                        router.push('/(app)/dashboard');
                      }}
                    >
                      <View style={styles.routeRowLeft}>
                        <View style={[styles.routePinWrap, { backgroundColor: darkMode ? '#2A2A2A' : '#EEEEEE' }]}>
                          <Ionicons name="location" size={14} color="#E83950" />
                        </View>
                        <View style={styles.routeCopy}>
                          <Text style={[styles.routeText, { color: textPrimary }]}>{item.route}</Text>
                          <Text style={[styles.routeCountText, { color: textSecondary }]}>{item.count} ride{item.count > 1 ? 's' : ''} found</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={textSecondary} />
                    </Pressable>
                  )) : (
                    <View style={[styles.routeRow, { backgroundColor: darkMode ? '#1A1A1A' : '#F9F9F9', borderColor: border }]}>
                      <View style={styles.routeRowLeft}>
                        <View style={[styles.routePinWrap, { backgroundColor: darkMode ? '#2A2A2A' : '#EEEEEE' }]}> 
                          <Ionicons name="location" size={14} color="#9CA3AF" />
                        </View>
                        <Text style={[styles.routeText, { color: textSecondary }]}>No route trends yet. Explore rides to build popularity.</Text>
                      </View>
                    </View>
                  )}
                </View>

                {isDemoMode ? (
                  <View style={[styles.demoCard, { backgroundColor: card }]}> 
                    <Text style={[styles.demoTitle, { color: textPrimary }]}>You're in demo mode</Text>
                    <Text style={[styles.demoSubtitle, { color: textSecondary }]}>Sign up to join or create rides and access all features.</Text>
                    <Pressable onPress={() => router.push('/Login')} style={styles.demoButton}>
                      <Text style={styles.demoButtonText}>Sign Up / Sign In</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </ScrollView>
      </View>

      {callingUser ? <InCallModal user={callingUser} onClose={() => setCallingUser(null)} /> : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 13,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 27,
  },
  wave: {
    fontSize: 20,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  createCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#E83950',
  },
  quickActionIconDark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
  },
  quickActionIconLight: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  quickActionCopy: {
    flexShrink: 1,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionSubtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  quickActionTitleLight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickActionSubtitleLight: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
  },
  tabWrapOuter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  tabWrap: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#E83950',
  },
  tabText: {
    fontSize: 12,
  },
  tabBody: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  cardContainer: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardInnerPad: {
    padding: 16,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E83950',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  transportText: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaRowWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  footerAction: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerActionBrand: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E83950',
  },
  footerActionMuted: {
    fontSize: 12,
    fontWeight: '500',
  },
  requestCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requestIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E83950',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  requestSubtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  paymentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentNameWrap: {
    flex: 1,
  },
  paymentName: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentHandle: {
    fontSize: 12,
  },
  paymentAmountWrap: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    color: '#E83950',
    fontSize: 14,
    fontWeight: '700',
  },
  paymentLabel: {
    fontSize: 11,
  },
  recentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recentNameWrap: {
    flex: 1,
  },
  ratingRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    marginLeft: 2,
    fontSize: 12,
  },
  callButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentMeta: {
    fontSize: 12,
  },
  recentButtonsWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 8,
  },
  recentPrimaryButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    paddingVertical: 10,
    alignItems: 'center',
  },
  recentPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  recentSecondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E83950',
    paddingVertical: 10,
    alignItems: 'center',
  },
  recentSecondaryButtonText: {
    color: '#E83950',
    fontSize: 12,
    fontWeight: '600',
  },
  bigDarkCta: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bigDarkCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  simpleRideCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginBottom: 8,
  },
  fareText: {
    marginLeft: 'auto',
    color: '#E83950',
    fontSize: 12,
    fontWeight: '600',
  },
  outlineActionButton: {
    borderWidth: 1,
    borderColor: '#E83950',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineActionButtonText: {
    color: '#E83950',
    fontSize: 12,
    fontWeight: '500',
  },
  bigBrandCta: {
    backgroundColor: '#E83950',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bigBrandCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  discoverCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  discoverTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  discoverSubtitle: {
    fontSize: 12,
    marginBottom: 14,
  },
  searchRideButton: {
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    paddingVertical: 12,
  },
  searchRideButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  routeRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  routeRowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  routeCopy: {
    flex: 1,
    minWidth: 0,
  },
  routePinWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeText: {
    fontSize: 12,
    fontWeight: '500',
    flexWrap: 'wrap',
    lineHeight: 17,
  },
  routeCountText: {
    fontSize: 10,
    marginTop: 2,
  },
  demoCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E83950',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  demoSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  demoButton: {
    borderRadius: 12,
    backgroundColor: '#E83950',
    alignItems: 'center',
    paddingVertical: 10,
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
