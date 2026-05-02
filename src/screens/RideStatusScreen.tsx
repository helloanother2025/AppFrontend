import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Modal } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { InCallModal } from '../components/InCallModal';
import { LocationDisplay } from '../components/LocationDisplay';
import { UserAvatar } from '../components/UserAvatar';
import { ScreenShell } from '../components/ScreenShell';
import { StyledDateTimePicker } from '../components/StyledDateTimePicker';
import { RemoveAndReportModal } from '../components/RemoveAndReportModal';
import { ConfirmCancelModal } from '../components/ConfirmCancelModal';
import {
  transportEmoji,
  type TransportMode,
  type RideStatus,
} from '../utils/rideMapper';
import { useAppContext } from '../context/AppContext';
import { useUser } from '../context/UserContext';
import { useRide } from '../context/RideContext';
import { useJoinRequests } from '../context/JoinRequestContext';
import { formatRideDate } from '../utils/date';
import { colors } from '../theme';
import { ridesAPI } from '../api/rides';
import { feedbackAPI } from '../api/feedback';
import { joinRequestsAPI } from '../api/joinRequests';

type Tab = 'created' | 'joined' | 'past';
type CreatedFilter = 'all' | 'ongoing' | 'scheduled' | 'requests';
type JoinedFilter = 'all' | 'accepted' | 'pending' | 'unpaid';
type PastFilter = 'all' | 'pending_payment' | 'pending_review';

const statusConfig = {
  unactive: { label: 'Scheduled', color: '#1C1C1E', bg: '#F5F5F7', icon: 'time-outline' as const },
  started: { label: 'Ongoing', color: '#E83950', bg: '#FFF0F2', icon: 'alert-circle-outline' as const },
  completed: { label: 'Completed', color: '#1C1C1E', bg: '#F5F5F7', icon: 'checkmark-circle-outline' as const },
  cancelled: { label: 'Cancelled', color: '#E83950', bg: '#FFF0F2', icon: 'close-circle-outline' as const },
  expired: { label: 'Expired', color: '#888888', bg: '#F5F5F7', icon: 'close-circle-outline' as const },
};

const joinStatusConfig = {
  pending: { label: 'Pending approval', color: '#1C1C1E', bg: '#F5F5F7' },
  accepted: { label: 'Accepted', color: '#1C1C1E', bg: '#F5F5F5' },
  rejected: { label: 'Declined', color: '#E83950', bg: '#FFF0F2' },
  cancelled: { label: 'Cancelled', color: '#888888', bg: '#F5F5F7' },
  removed: { label: 'Removed', color: '#E83950', bg: '#FFF0F2' },
};

function cardStatusTone(status: RideStatus) {
  if (status === 'started') return '#FFF0F2';
  if (status === 'cancelled') return '#FEF2F2';
  return '#FFFFFF';
}


export function RideStatusScreen() {
  const params = useLocalSearchParams<{
    tab?: string;
    createdFilter?: string;
    rideId?: string;
    requestId?: string;
  }>();
  const { darkMode, addNotification } = useAppContext();
  const { user } = useUser();
  const { 
    myRides, 
    joinedRides, 
    fetchMyRides, 
    fetchJoinedRides, 
    updateRideStatus, 
    selectRide,
    loading: ridesLoading 
  } = useRide();

  const { 
    incomingRequests, 
    myRequests, 
    fetchIncomingRequests,
    fetchMyRequests, 
    acceptRequest, 
    rejectRequest, 
    cancelJoinRequest,
    loading: requestsLoading 
  } = useJoinRequests();

  const [activeTab, setActiveTab] = useState<Tab>('created');
  const [createdFilter, setCreatedFilter] = useState<CreatedFilter>('all');
  const [joinedFilter, setJoinedFilter] = useState<JoinedFilter>('all');
  const [pastFilter, setPastFilter] = useState<PastFilter>('all');
  const [expandedRide, setExpandedRide] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAllData = useCallback(async () => {
    const createdRides = await fetchMyRides();
    await Promise.all([
      fetchJoinedRides(),
      fetchMyRequests(),
      ...createdRides.map((ride) => fetchIncomingRequests(Number(ride.id))),
    ]);
  }, [fetchMyRides, fetchJoinedRides, fetchMyRequests, fetchIncomingRequests]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (params.tab === 'created' || params.tab === 'joined' || params.tab === 'past') {
      setActiveTab(params.tab);
    }
    if (params.createdFilter === 'all' || params.createdFilter === 'ongoing' || params.createdFilter === 'scheduled' || params.createdFilter === 'requests') {
      setCreatedFilter(params.createdFilter);
    }
  }, [params.tab, params.createdFilter]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
  }, [fetchAllData]);

  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, 'pending' | 'paid'>>({});
  const [callingUser, setCallingUser] = useState<any>(null);
  const [selectedJoinRequest, setSelectedJoinRequest] = useState<any>(null);
  const [removeModalPayload, setRemoveModalPayload] = useState<{ rideId: string; request: any } | null>(null);
  const [cancelModalPayload, setCancelModalPayload] = useState<{ ride: any; passengers: any[] } | null>(null);
  const [searchDate, setSearchDate] = useState<Date | null>(null);
  const [searchTime, setSearchTime] = useState<Date | null>(null);
  const [showScheduleSearchModal, setShowScheduleSearchModal] = useState(false);
  const handledRequestParamRef = useRef<string | null>(null);
  const [reviewedRideIds, setReviewedRideIds] = useState<Record<string, boolean>>({});

  const textPrimary = darkMode ? colors.textPrimaryDark : '#111827';
  const textSecondary = darkMode ? colors.textSecondaryDark : '#6B7280';
  const cardBorder = darkMode ? colors.borderDark : '#E5E7EB';
  const cardBg = darkMode ? '#1A1A1A' : '#FFFFFF';

  const pendingRequestCountsByRide = useMemo(() => {
    return incomingRequests.reduce<Record<string, number>>((acc, request) => {
      if (request.status !== 'pending') return acc;
      const key = String(request.rideId);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [incomingRequests]);

  const getPassengersForRide = (rideId: string) => incomingRequests.filter((jr) => String(jr.rideId) === String(rideId) && jr.status === 'accepted');
  const getPendingRequestsForRide = (rideId: string) => incomingRequests.filter((jr) => String(jr.rideId) === String(rideId) && jr.status === 'pending');

  const totalPendingRequestsToReview = useMemo(
    () => Object.values(pendingRequestCountsByRide).reduce((sum, count) => sum + count, 0),
    [pendingRequestCountsByRide]
  );

  const matchesScheduledSearch = useCallback((departureTime?: string) => {
    if (!searchDate || !departureTime) return true;

    const rideDate = new Date(departureTime);
    if (Number.isNaN(rideDate.getTime())) return true;

    const sameDay =
      rideDate.getFullYear() === searchDate.getFullYear() &&
      rideDate.getMonth() === searchDate.getMonth() &&
      rideDate.getDate() === searchDate.getDate();

    if (!sameDay) return false;

    if (!searchTime) return true;

    const threshold = new Date(searchDate);
    threshold.setHours(searchTime.getHours(), searchTime.getMinutes(), 0, 0);
    return rideDate.getTime() >= threshold.getTime();
  }, [searchDate, searchTime]);

  const handleSearchDateChange = (value: Date) => {
    setSearchDate(value);
  };

  const handleSearchTimeChange = (value: Date) => {
    setSearchTime(value);
    if (!searchDate) {
      setSearchDate(new Date());
    }
  };

  const clearScheduleSearch = () => {
    setSearchDate(null);
    setSearchTime(null);
  };

  const filteredCreatedRides = useMemo(() => {
    return myRides.filter((ride) => {
      if (ride.status === 'completed' || ride.status === 'cancelled') return false;
      if (!matchesScheduledSearch(ride.departureTime)) return false;
      if (createdFilter === 'requests') return (pendingRequestCountsByRide[String(ride.id)] || 0) > 0;
      if (createdFilter === 'ongoing') return ride.status === 'started';
      if (createdFilter === 'scheduled') return ride.status === 'unactive';
      return true;
    });
  }, [createdFilter, myRides, pendingRequestCountsByRide, matchesScheduledSearch]);

  const filteredJoinedReqs = useMemo(() => {
    return myRequests.filter((request) => {
      if (request.ride?.status === 'completed' || request.ride?.status === 'cancelled') return false;
      if (!matchesScheduledSearch(request.ride?.departureTime)) return false;
      if (joinedFilter === 'accepted') return request.status === 'accepted';
      if (joinedFilter === 'pending') return request.status === 'pending';
      if (joinedFilter === 'unpaid') {
        const payState = paymentStatuses[request.id] ?? (request as any).paymentStatus;
        return request.status === 'accepted' && payState === 'pending';
      }
      return true;
    });
  }, [joinedFilter, myRequests, paymentStatuses, matchesScheduledSearch]);

  const allPastRides = useMemo(() => {
    const myPast = myRides.filter((r) => (r.status === 'completed' || r.status === 'cancelled') && matchesScheduledSearch(r.departureTime));
    const joinedPast = myRequests.filter((jr) => (jr.ride?.status === 'completed' || jr.ride?.status === 'cancelled') && matchesScheduledSearch(jr.ride?.departureTime));
    
    return [
      ...myPast.map((ride) => ({ type: 'created' as const, id: `created_${ride.id}`, ride })),
      ...joinedPast.map((request) => ({ type: 'joined' as const, id: `joined_${request.id}`, request })),
    ];
  }, [myRides, myRequests, matchesScheduledSearch]);

  const completedJoinedPastRideIds = useMemo(() => {
    const ids = new Set<string>();
    myRequests.forEach((request) => {
      if (request.ride?.status !== 'completed') return;
      if (!matchesScheduledSearch(request.ride?.departureTime)) return;
      const rideId = String(request.ride?.id ?? request.rideId ?? '');
      if (rideId) ids.add(rideId);
    });
    return Array.from(ids);
  }, [myRequests, matchesScheduledSearch]);

  useEffect(() => {
    let active = true;

    const loadReviewedRideIds = async () => {
      if (!user?.id || completedJoinedPastRideIds.length === 0) {
        if (active) setReviewedRideIds({});
        return;
      }

      const results = await Promise.allSettled(
        completedJoinedPastRideIds.map((rideId) => feedbackAPI.getRideReviewerFeedback(rideId, user.id))
      );

      if (!active) return;

      const next: Record<string, boolean> = {};
      completedJoinedPastRideIds.forEach((rideId, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
          next[rideId] = Array.isArray(result.value?.feedback) && result.value.feedback.length > 0;
        } else {
          next[rideId] = false;
        }
      });
      setReviewedRideIds(next);
    };

    loadReviewedRideIds();
    return () => {
      active = false;
    };
  }, [completedJoinedPastRideIds, user?.id]);

  const isPastItemPendingPayment = useCallback((item: any) => {
    if (item.type === 'created') {
      const ride = item.ride;
      if (ride?.status !== 'completed') return false;
      const passengers = getPassengersForRide(ride.id);
      return passengers.some((request: any) => {
        const payState = paymentStatuses[request.id] ?? (request as any).paymentStatus;
        return payState === 'pending';
      });
    }

    if (item.type === 'joined') {
      const request = item.request;
      const payState = paymentStatuses[request.id] ?? (request as any).paymentStatus;
      return request.status === 'accepted' && payState === 'pending';
    }

    return false;
  }, [paymentStatuses, incomingRequests]);

  const isPastItemPendingReview = useCallback((item: any) => {
    if (item.type !== 'joined') return false;
    const rideStatus = item.request?.ride?.status;
    if (rideStatus !== 'completed') return false;
    const rideId = String(item.request?.ride?.id ?? item.request?.rideId ?? '');
    if (!rideId) return false;
    return !Boolean(reviewedRideIds[rideId]);
  }, [reviewedRideIds]);

  const filteredPastRides = useMemo(() => {
    if (pastFilter === 'all') return allPastRides;
    if (pastFilter === 'pending_payment') return allPastRides.filter((item) => isPastItemPendingPayment(item));
    return allPastRides.filter((item) => isPastItemPendingReview(item));
  }, [allPastRides, pastFilter, isPastItemPendingPayment, isPastItemPendingReview]);

  useEffect(() => {
    if (!params.requestId) return;
    if (handledRequestParamRef.current === String(params.requestId)) return;
    const target = incomingRequests.find((req) => String(req.id) === String(params.requestId));
    if (target) {
      setActiveTab('created');
      setCreatedFilter('requests');
      if (params.rideId) {
        setExpandedRide(String(params.rideId));
      }
      if (target.status === 'pending') {
        setSelectedJoinRequest(target);
      }
      handledRequestParamRef.current = String(params.requestId);
    }
  }, [incomingRequests, params.requestId, params.rideId]);


  const markRideCompleted = async (ride: any) => {
    try {
      await updateRideStatus(Number(ride.id), 'completed');
      
      const passengers = getPassengersForRide(ride.id);
      passengers.forEach((request) => {
        addNotification({
          type: 'payment_request',
          title: 'Ride completed - payment due',
          body: `Please complete payment for your ride from ${ride.from.shortName} to ${ride.to.shortName}.`,
          rideId: String(ride.id),
        });
      });

      router.push('/(app)/payment');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to complete ride');
    }
  };

  const cancelRide = async (ride: any, options: { transferToUserId?: string | number; forceCancel?: boolean } = {}) => {
    try {
      const response = await updateRideStatus(Number(ride.id), 'cancelled', options);
      const ownershipTransferred = Boolean(response?.ownershipTransferred);

      if (ownershipTransferred) {
        Alert.alert('Ownership transferred', 'Ride ownership was transferred. The ride remains active.');
      } else {
        const passengers = getPassengersForRide(ride.id);
        passengers.forEach((request) => {
          addNotification({
            type: 'ride_cancelled',
            title: 'Ride cancelled',
            body: `Your ride from ${ride.from.shortName} to ${ride.to.shortName} has been cancelled.`,
            rideId: String(ride.id),
          });
        });
        Alert.alert('Ride cancelled', 'The ride has been cancelled.');
      }

      await fetchAllData();
      
    } catch (err: any) {
      Alert.alert('Error', 'Failed to cancel ride');
    }
  };

  const promptCancelRide = (ride: any) => {
    setCancelModalPayload({
      ride,
      passengers: getPassengersForRide(ride.id),
    });
  };

  const handleTransferOwnership = async (toUser: { id: string | number }) => {
    if (!cancelModalPayload) return;
    await cancelRide(cancelModalPayload.ride, { transferToUserId: toUser.id });
    setCancelModalPayload(null);
  };

  const handleJustCancelRide = async () => {
    if (!cancelModalPayload) return;
    await cancelRide(cancelModalPayload.ride, { forceCancel: true });
    setCancelModalPayload(null);
  };

  const handleAcceptRequest = async (request: any) => {
    try {
      await acceptRequest(Number(request.id));
      addNotification({ 
        type: 'ride_update', 
        title: 'Request Accepted', 
        body: `You accepted ${request.requester.name}'s request` 
      });
    } catch (err: any) {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (request: any) => {
    try {
      await rejectRequest(Number(request.id));
      Alert.alert('Success', `Declined ${request.requester.name}'s request`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to decline request');
    }
  };

  const handleRemovePassenger = async (
    rideId: string,
    request: any,
    options: { report?: boolean; reportReason?: string; reportDetails?: string } = {}
  ) => {
    try {
      await ridesAPI.removePassenger(rideId, request.requester.id, options);
      await fetchIncomingRequests(Number(rideId));
      addNotification({
        type: 'passenger_removed',
        title: 'Removed from ride',
        body: 'You were removed from the ride by the creator',
        fromUser: user as any,
        rideId: String(rideId),
      });
      Alert.alert('Success', options.report ? 'Passenger removed and reported.' : 'Passenger removed from this ride.');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to remove passenger');
    }
  };

  const promptRemovePassenger = (rideId: string, request: any) => {
    setRemoveModalPayload({ rideId, request });
  };

  const handleRemoveWithModal = async (reason: string, reportReason?: string) => {
    if (!removeModalPayload) return;
    const { rideId, request } = removeModalPayload;
    await handleRemovePassenger(rideId, request, {
      report: Boolean(reportReason),
      reportReason: reportReason || undefined,
      reportDetails: reason,
    });
    setRemoveModalPayload(null);
  };

  const handleCancelJoinedRequest = async (requestId: string) => {
    try {
      await cancelJoinRequest(Number(requestId));
      Alert.alert('Success', 'Your join request was cancelled');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to cancel request');
    }
  };

  const handleSendPanicAlert = async (rideId: string) => {
    try {
      await ridesAPI.sendPanicAlert(rideId);
      Alert.alert('Panic alert sent', 'Other ride members have been notified.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send panic alert');
    }
  };

  const handleSendReminder = async (requestId: string) => {
    try {
      await joinRequestsAPI.sendReminder(Number(requestId));
      Alert.alert('Success', 'Payment reminder sent to passenger.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send reminder. Reminders are limited to once per day.');
    }
  };

  return (
    <ScreenShell scroll={false}>
      <View style={[styles.topBlock, { borderBottomColor: cardBorder }]}> 
        <Text style={[styles.topTitle, { color: textPrimary }]}>My Rides</Text>

        <View style={styles.tabRow}>
          {(['created', 'joined', 'past'] as Tab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, activeTab === tab ? styles.tabButtonActive : styles.tabButtonIdle]}
            >
              <Text style={activeTab === tab ? styles.tabButtonActiveText : styles.tabButtonIdleText}>
                {tab === 'created' ? 'Created' : tab === 'joined' ? 'Joined' : 'Past'}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'created' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
            {(['all', 'ongoing', 'scheduled'] as CreatedFilter[]).map((filter) => (
              <Pressable
                key={filter}
                onPress={() => setCreatedFilter(filter)}
                style={[
                  styles.chip,
                  createdFilter === filter ? styles.chipActive : styles.chipIdle,
                ]}
              >
                <Text style={createdFilter === filter ? styles.chipActiveText : styles.chipIdleText}>
                  {filter === 'all' ? 'All' : filter === 'ongoing' ? 'Ongoing' : 'Scheduled'}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setCreatedFilter('requests')}
              style={[
                styles.chip,
                createdFilter === 'requests' ? styles.chipActive : styles.chipIdle,
                styles.joinRequestsFilterChip,
              ]}
            >
              <Text style={createdFilter === 'requests' ? styles.chipActiveText : styles.chipIdleText}>Join Requests</Text>
              {totalPendingRequestsToReview > 0 ? (
                <View style={styles.joinRequestsBubble}>
                  <Text style={styles.joinRequestsBubbleText}>{totalPendingRequestsToReview > 99 ? '99+' : totalPendingRequestsToReview}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => setShowScheduleSearchModal(true)}
              style={[
                styles.chip,
                searchDate || searchTime ? styles.chipActive : styles.chipIdle,
                styles.calendarChip,
              ]}
            >
              <Ionicons name="calendar-outline" size={12} color={searchDate || searchTime ? '#FFFFFF' : '#6B7280'} />
            </Pressable>
          </ScrollView>
        ) : null}

        {activeTab === 'joined' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
            {(['all', 'accepted', 'pending', 'unpaid'] as JoinedFilter[]).map((filter) => (
              <Pressable
                key={filter}
                onPress={() => setJoinedFilter(filter)}
                style={[
                  styles.chip,
                  joinedFilter === filter ? styles.chipActive : styles.chipIdle,
                ]}
              >
                <Text style={joinedFilter === filter ? styles.chipActiveText : styles.chipIdleText}>
                  {filter === 'all' ? 'All' : filter === 'accepted' ? 'Accepted' : filter === 'pending' ? 'Pending' : 'Unpaid'}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setShowScheduleSearchModal(true)}
              style={[
                styles.chip,
                searchDate || searchTime ? styles.chipActive : styles.chipIdle,
                styles.calendarChip,
              ]}
            >
              <Ionicons name="calendar-outline" size={12} color={searchDate || searchTime ? '#FFFFFF' : '#6B7280'} />
            </Pressable>
          </ScrollView>
        ) : null}

        {activeTab === 'past' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
            {([
              { key: 'all', label: 'All' },
              { key: 'pending_payment', label: 'Pending payment' },
              { key: 'pending_review', label: 'Pending review' },
            ] as { key: PastFilter; label: string }[]).map((filter) => (
              <Pressable
                key={filter.key}
                onPress={() => setPastFilter(filter.key)}
                style={[styles.chip, pastFilter === filter.key ? styles.chipActive : styles.chipIdle]}
              >
                <Text style={pastFilter === filter.key ? styles.chipActiveText : styles.chipIdleText}>{filter.label}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setShowScheduleSearchModal(true)}
              style={[
                styles.chip,
                searchDate || searchTime ? styles.chipActive : styles.chipIdle,
                styles.calendarChip,
              ]}
            >
              <Ionicons name="calendar-outline" size={12} color={searchDate || searchTime ? '#FFFFFF' : '#6B7280'} />
            </Pressable>
          </ScrollView>
        ) : null}
      </View>

      <ScrollView 
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.brand]} tintColor={colors.brand} />
        }
      >

        {activeTab === 'created'
          ? filteredCreatedRides.map((ride) => {
              const cfg: any = statusConfig[ride.status as keyof typeof statusConfig] ?? statusConfig.unactive;
              const expanded = expandedRide === ride.id;
              const passengers = getPassengersForRide(ride.id);
              const pendingReqs = getPendingRequestsForRide(ride.id);
              const isOpen = ride.status === 'unactive' || ride.status === 'started';

              return (
                <View key={ride.id} style={[styles.card, { borderColor: cardBorder, backgroundColor: darkMode ? cardBg : cardStatusTone(ride.status) }]}> 
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusPill, { backgroundColor: darkMode ? '#111111' : cfg.bg }]}> 
                      <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                      <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      {pendingReqs.length > 0 ? (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>{pendingReqs.length} request{pendingReqs.length > 1 ? 's' : ''}</Text>
                        </View>
                      ) : null}
                      <Pressable onPress={() => setExpandedRide(expanded ? null : ride.id)}>
                        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color="#6B7280" />
                      </Pressable>
                    </View>
                  </View>

                  <LocationDisplay from={ride.from.shortName} to={ride.to.shortName} compact />

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                      <Text style={[styles.metaText, { color: textSecondary }]}>{formatRideDate(ride.departureTime)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="people-outline" size={12} color="#9CA3AF" />
                      <Text style={[styles.metaText, { color: textSecondary }]}>{passengers.length} joined • {Math.max(0, ride.seats - passengers.length)} spots left</Text>
                    </View>
                    <View style={[styles.openPill, isOpen ? styles.openPillOpen : styles.openPillClosed]}>
                      <Ionicons name={isOpen ? 'lock-open-outline' : 'lock-closed-outline'} size={10} color={isOpen ? '#16A34A' : '#DC2626'} />
                      <Text style={[styles.openPillText, { color: isOpen ? '#16A34A' : '#DC2626' }]}>{isOpen ? 'Open' : 'Closed'}</Text>
                    </View>
                  </View>

                  <View style={[styles.statsGrid, { borderTopColor: darkMode ? '#2A2A2A' : '#F3F4F6' }]}> 
                    <View style={styles.statCell}>
                      <Text style={styles.statLabel}>Transport</Text>
                      <Text style={[styles.statValue, { color: textPrimary }]}>
                        {transportEmoji[ride.transport as TransportMode] || '🚗'} {ride.transport}
                      </Text>
                    </View>
                    <View style={[styles.statCell, styles.statCellBorder, { borderLeftColor: darkMode ? '#2A2A2A' : '#F3F4F6', borderRightColor: darkMode ? '#2A2A2A' : '#F3F4F6' }]}>
                      <Text style={styles.statLabel}>Fare</Text>
                      <Text style={[styles.statValue, { color: textPrimary }]}>{ride.fare != null ? `BDT ${ride.fare}` : 'TBD'}</Text>
                    </View>
                    <View style={styles.statCell}>
                      <Text style={styles.statLabel}>Gender</Text>
                      <Text style={[styles.statValue, { color: textPrimary }]}>{ride.genderPreference}</Text>
                    </View>
                  </View>

                  {expanded ? (
                    <View style={[styles.expandedArea, { borderTopColor: darkMode ? '#2A2A2A' : '#F3F4F6' }]}> 
                      <View style={styles.actionGrid}>
                        <Pressable style={styles.editButton} onPress={() => router.push({ pathname: '/(app)/edit-ride', params: { rideId: ride.id } })}>
                          <Ionicons name="create-outline" size={13} color={colors.brand} />
                          <Text style={styles.editButtonText}>Edit Ride</Text>
                        </Pressable>
                        
                        {ride.status === 'unactive' ? (
                          <Pressable 
                            style={styles.openJoinButton} 
                            onPress={() => updateRideStatus(Number(ride.id), 'started')}
                          >
                            <Ionicons name="play-outline" size={13} color="#16A34A" />
                            <Text style={[styles.joinButtonText, { color: '#16A34A' }]}>Start Ride</Text>
                          </Pressable>
                        ) : null}

                        {ride.status === 'started' ? (
                          <Pressable 
                            style={[styles.cancelRideButton, { backgroundColor: '#FEE2E2', borderColor: '#EF4444', marginBottom: 8 }]} 
                            onPress={() => handleSendPanicAlert(ride.id)}
                          >
                            <Ionicons name="alert-circle-outline" size={13} color="#B91C1C" />
                            <Text style={[styles.cancelRideText, { color: '#B91C1C' }]}>Panic Alert</Text>
                          </Pressable>
                        ) : null}

                        {ride.status === 'started' ? (
                          <Pressable style={styles.completeButton} onPress={() => markRideCompleted(ride)}>
                            <Ionicons name="checkmark-circle-outline" size={13} color="#FFFFFF" />
                            <Text style={styles.completeButtonText}>Complete & Request Payment</Text>
                          </Pressable>
                        ) : null}
                      </View>

                      <View style={styles.subBlock}>
                        <Text style={[styles.subBlockTitle, { color: textSecondary }]}>Passengers ({passengers.length})</Text>
                        {passengers.length === 0 ? (
                          <Text style={[styles.emptyText, { color: '#9CA3AF' }]}>No passengers yet</Text>
                        ) : (
                          passengers.map((request: any) => {
                            const payState = paymentStatuses[request.id] ?? (request as any).paymentStatus;
                            return (
                              <View key={request.id} style={[styles.passengerItem, { backgroundColor: darkMode ? '#1A1A1A' : '#F9FAFB' }]}> 
                                <UserAvatar size="sm" name={request.requester.name} source={request.requester.avatar} />
                                <View style={styles.passengerCopy}>
                                  <Pressable onPress={() => router.push({ pathname: '/(app)/user/[id]', params: { id: request.requester.id } })}>
                                    <Text style={[styles.passengerName, { color: textPrimary }]}>{request.requester.name}</Text>
                                  </Pressable>
                                  <View style={payState === 'paid' ? styles.paymentPillPaid : styles.paymentPillPending}>
                                    <Ionicons name="card-outline" size={9} color={payState === 'paid' ? '#16A34A' : '#D97706'} />
                                    <Text style={[styles.paymentPillText, { color: payState === 'paid' ? '#16A34A' : '#D97706' }]}>
                                      {payState === 'paid' ? 'Paid' : 'Pending'}
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.passengerActions}>
                                  <Pressable style={styles.callIconButton} onPress={() => setCallingUser(request.requester)}>
                                    <Ionicons name="call-outline" size={12} color="#6B7280" />
                                  </Pressable>
                                  {ride.status === 'unactive' ? (
                                    <Pressable style={styles.removeIconButton} onPress={() => promptRemovePassenger(ride.id, request)}>
                                      <Ionicons name="person-remove-outline" size={12} color="#DC2626" />
                                    </Pressable>
                                  ) : null}
                                  {ride.status === 'completed' && payState !== 'paid' ? (
                                    <Pressable 
                                      style={styles.callIconButton} 
                                      onPress={() => handleSendReminder(request.id)}
                                    >
                                      <Ionicons name="notifications-outline" size={12} color={colors.brand} />
                                    </Pressable>
                                  ) : null}
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>

                      {pendingReqs.length > 0 ? (
                        <View style={styles.subBlock}>
                          <Text style={[styles.subBlockTitle, { color: textSecondary }]}>Join requests ({pendingReqs.length})</Text>
                          {pendingReqs.map((request: any) => (
                            <View key={request.id} style={styles.requestItem}>
                              <UserAvatar size="sm" name={request.requester.name} source={request.requester.avatar} />
                              <View style={styles.requestCopy}>
                                <Pressable onPress={() => router.push({ pathname: '/(app)/user/[id]', params: { id: request.requester.id } })}>
                                  <Text style={[styles.passengerName, { color: textPrimary }]}>{request.requester.name}</Text>
                                </Pressable>
                                <Text style={[styles.requestRoute, { color: textSecondary }]} numberOfLines={1}>
                                  {(request.startLocation?.name || request.pickupAddress || 'Unknown pickup')} {'->'} {(request.endLocation?.name || request.dropAddress || 'Unknown drop-off')}
                                </Text>
                                <Text style={[styles.requestMetaLine, { color: textSecondary }]} numberOfLines={1}>
                                  {request.segmentDistanceKm != null ? `${request.segmentDistanceKm.toFixed(1)} km` : 'Distance n/a'}
                                  {' • '}
                                  {request.calculatedFare != null ? `BDT ${request.calculatedFare.toFixed(0)}` : 'Fare n/a'}
                                  {' • '}
                                  {request.routePolyline ? 'Custom route included' : 'No custom route'}
                                </Text>
                              </View>
                              <View style={styles.requestActions}>
                                <Pressable style={styles.requestViewButton} onPress={() => setSelectedJoinRequest(request)}>
                                  <Ionicons name="eye-outline" size={12} color={colors.brand} />
                                  <Text style={styles.requestViewText}>View</Text>
                                </Pressable>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {(ride.status === 'unactive' || ride.status === 'started') ? (
                        <Pressable style={styles.cancelRideButton} onPress={() => promptCancelRide(ride)}>
                          <Ionicons name="ban-outline" size={14} color="#DC2626" />
                          <Text style={styles.cancelRideText}>Cancel this ride</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })
          : null}

        {activeTab === 'created' && filteredCreatedRides.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyPrimary, { color: textSecondary }]}>No rides matching this filter.</Text>
          </View>
        ) : null}

        {activeTab === 'created' ? (
          <Pressable style={[styles.createRideButton, { backgroundColor: darkMode ? '#111111' : '#FFFFFF' }]} onPress={() => router.push('/(app)')}>
            <Text style={styles.createRideText}>+ Create new ride</Text>
          </Pressable>
        ) : null}

        {activeTab === 'joined' ? (
          filteredJoinedReqs.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyPrimary, { color: textSecondary }]}>No rides matching this filter.</Text>
              <Pressable style={styles.browseButton} onPress={() => router.push('/(app)/dashboard')}>
                <Text style={styles.browseButtonText}>Browse rides</Text>
              </Pressable>
            </View>
          ) : (
            filteredJoinedReqs.map((request: any, index: number) => {
              const statusTone: any = joinStatusConfig[request.status as keyof typeof joinStatusConfig] || joinStatusConfig.pending;
              const payState = paymentStatuses[request.id] ?? (request as any).paymentStatus;
              const requestKey = String(request.id ?? `${request.rideId ?? request.ride?.id ?? 'ride'}_${request.status ?? 'status'}_${index}`);

              return (
                <View key={requestKey} style={[styles.card, { borderColor: cardBorder, backgroundColor: cardBg }]}> 
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusPill, { backgroundColor: darkMode ? '#111111' : statusTone.bg }]}> 
                      <Text style={[styles.statusPillText, { color: statusTone.color }]}>{statusTone.label}</Text>
                    </View>
                    <Pressable onPress={() => {
                        selectRide(request.ride);
                      router.push({ pathname: '/(app)/ride-details', params: { rideId: String(request.rideId || '') } });
                    }}>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </Pressable>
                  </View>

                  <View style={styles.joinedCreatorRow}>
                    <UserAvatar size="sm" name={request.ride?.creator?.name || 'Unknown'} source={request.ride?.creator?.avatar} />
                    <View>
                      <Pressable onPress={() => router.push({ pathname: '/(app)/user/[id]', params: { id: request.ride?.creator?.id } })}>
                        <Text style={[styles.passengerName, { color: textPrimary }]}>{request.ride?.creator?.name || 'Unknown'}</Text>
                      </Pressable>
                      <Text style={[styles.creatorUsernameTiny, { color: '#9CA3AF' }]}>@{request.ride?.creator?.username || 'user'}</Text>
                    </View>
                    {request.status === 'accepted' ? (
                      <Pressable style={styles.callIconButton} onPress={() => setCallingUser(request.ride?.creator)}>
                        <Ionicons name="call-outline" size={13} color="#6B7280" />
                      </Pressable>
                    ) : null}
                  </View>

                  {request.ride && (
                    <LocationDisplay from={request.ride.from.shortName} to={request.ride.to.shortName} compact />
                  )}

                  <View style={styles.metaRowJoined}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                      <Text style={[styles.metaText, { color: textSecondary }]}>{request.ride ? formatRideDate(request.ride.departureTime) : 'TBD'}</Text>
                    </View>
                    {request.status === 'accepted' ? (
                      <View style={payState === 'paid' ? styles.paymentPillPaid : styles.paymentPillPending}>
                        <Ionicons name="card-outline" size={9} color={payState === 'paid' ? '#16A34A' : '#D97706'} />
                        <Text style={[styles.paymentPillText, { color: payState === 'paid' ? '#16A34A' : '#D97706' }]}>
                          {payState === 'paid' ? 'Paid' : 'Unpaid'}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.joinedActionsRow}>
                    {request.status === 'accepted' && payState === 'pending' ? (
                      <Pressable
                        style={styles.payNowJoinedButton}
                        onPress={() => router.push('/(app)/payment')}
                      >
                        <Ionicons name="card-outline" size={13} color="#FFFFFF" />
                        <Text style={styles.payNowJoinedText}>Pay now</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={styles.detailJoinedButton}
                      onPress={() => {
                        selectRide(request.ride);
                        router.push({ pathname: '/(app)/ride-details', params: { rideId: String(request.rideId || '') } });
                      }}
                    >
                      <Text style={styles.detailJoinedText}>View details</Text>
                    </Pressable>

                    {request.status === 'pending' ? (
                      <Pressable style={styles.cancelJoinedButton} onPress={() => handleCancelJoinedRequest(request.id)}>
                        <Text style={styles.cancelJoinedText}>Cancel request</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          )
        ) : null}

        {activeTab === 'past' ? (
          filteredPastRides.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyPrimary, { color: textSecondary }]}>No rides matching this filter.</Text>
            </View>
          ) : (
            filteredPastRides.map((item: any) => {
              if (item.type === 'created') {
                const ride = item.ride;
                const pendingPayment = isPastItemPendingPayment(item);
                return (
                  <View key={item.id} style={[styles.card, { borderColor: cardBorder, backgroundColor: cardBg }]}> 
                    <View style={styles.cardHeader}>
                      <Text style={[styles.pastLabel, ride.status === 'completed' ? styles.pastCompleted : styles.pastCancelled]}>
                        {ride.status === 'completed' ? 'Completed ride' : 'Cancelled ride'}
                      </Text>
                      <Pressable onPress={() => {
                          selectRide(ride);
                          router.push({ pathname: '/(app)/ride-details', params: { rideId: String(ride.id) } });
                      }}>
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                      </Pressable>
                    </View>

                    <LocationDisplay from={ride.from.shortName} to={ride.to.shortName} compact />
                    {pendingPayment ? (
                      <View style={styles.pastFooterRow}>
                        <Text style={[styles.pastMeta, { color: textSecondary }]}>Passenger payment pending</Text>
                      </View>
                    ) : null}
                  </View>
                );
              }

              const request = item.request;
              const payState = paymentStatuses[request.id] ?? (request as any).paymentStatus;
              const pendingPayment = isPastItemPendingPayment(item);
              const pendingReview = isPastItemPendingReview(item);
              return (
                <View key={item.id} style={[styles.card, { borderColor: cardBorder, backgroundColor: cardBg }]}> 
                  <View style={styles.cardHeader}>
                    <Text style={styles.pastLabel}>Past joined ride</Text>
                    <Pressable onPress={() => {
                        selectRide(request.ride);
                        router.push({ pathname: '/(app)/ride-details', params: { rideId: String(request.ride?.id ?? request.rideId ?? '') } });
                    }}>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </Pressable>
                  </View>

                  {request.ride && (
                    <LocationDisplay from={request.ride.from.shortName} to={request.ride.to.shortName} compact />
                  )}
                  <View style={styles.pastFooterRow}>
                    <Text style={[styles.pastMeta, { color: textSecondary }]}>{request.ride ? formatRideDate(request.ride.departureTime) : 'TBD'}</Text>
                    <View style={styles.pastActionsRow}>
                      {pendingPayment ? (
                        <Pressable style={styles.pastPayButton} onPress={() => router.push('/(app)/payment')}>
                          <Text style={styles.pastPayButtonText}>Pay now</Text>
                        </Pressable>
                      ) : null}
                      {pendingReview ? (
                        <Pressable style={styles.reviewButton} onPress={() => router.push({ pathname: '/(app)/ride-review', params: { rideId: String(request.ride?.id ?? request.rideId ?? '') } })}>
                          <Text style={styles.reviewButtonText}>Review ride</Text>
                        </Pressable>
                      ) : null}
                      {!pendingPayment && !pendingReview && payState === 'paid' ? (
                        <Text style={styles.pastDoneText}>All clear</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          )
        ) : null}

      </ScrollView>

      <Modal visible={!!selectedJoinRequest} transparent animationType="fade" onRequestClose={() => setSelectedJoinRequest(null)}>
        {selectedJoinRequest ? (
          <View style={styles.modalBackdrop}>
            <View style={[styles.joinRequestModal, { backgroundColor: darkMode ? '#111827' : '#FFFFFF' }]}>
              <View style={styles.joinRequestHeader}>
                <Text style={[styles.joinRequestTitle, { color: textPrimary }]}>Join Request</Text>
                <Pressable onPress={() => setSelectedJoinRequest(null)} style={styles.joinRequestCloseButton}>
                  <Ionicons name="close" size={18} color={textSecondary} />
                </Pressable>
              </View>

              <View style={styles.joinRequestUserRow}>
                <UserAvatar
                  size="md"
                  name={selectedJoinRequest.requester.name}
                  source={selectedJoinRequest.requester.avatar}
                />
                <View style={styles.joinRequestUserCopy}>
                  <Pressable
                    onPress={() => {
                      const userId = selectedJoinRequest.requester.id;
                      setSelectedJoinRequest(null);
                      router.push({ pathname: '/(app)/user/[id]', params: { id: userId } });
                    }}
                  >
                    <Text style={[styles.joinRequestUserName, { color: textPrimary }]}>{selectedJoinRequest.requester.name}</Text>
                  </Pressable>
                  <Text style={[styles.joinRequestUserHandle, { color: textSecondary }]}>@{selectedJoinRequest.requester.username}</Text>
                </View>
              </View>

              <View style={[styles.joinRequestRouteCard, { backgroundColor: darkMode ? '#1F2937' : '#F9FAFB' }]}>
                <Text style={[styles.joinRequestSectionTitle, { color: textSecondary }]}>Their Route</Text>
                <LocationDisplay
                  from={selectedJoinRequest.startLocation?.name || selectedJoinRequest.pickupAddress || 'Unknown pickup'}
                  to={selectedJoinRequest.endLocation?.name || selectedJoinRequest.dropAddress || 'Unknown drop-off'}
                  compact
                />
                <View style={styles.joinRequestMetaGrid}>
                  <Text style={[styles.joinRequestMetaText, { color: textSecondary }]}>Request ID: {selectedJoinRequest.id}</Text>
                  <Text style={[styles.joinRequestMetaText, { color: textSecondary }]}>Status: {selectedJoinRequest.status}</Text>
                  <Text style={[styles.joinRequestMetaText, { color: textSecondary }]}>Segment: {selectedJoinRequest.segmentDistanceKm != null ? `${selectedJoinRequest.segmentDistanceKm.toFixed(2)} km` : 'n/a'}</Text>
                  <Text style={[styles.joinRequestMetaText, { color: textSecondary }]}>Detour: {selectedJoinRequest.detourDistanceKm != null ? `${selectedJoinRequest.detourDistanceKm.toFixed(2)} km` : 'n/a'}</Text>
                  <Text style={[styles.joinRequestMetaText, { color: textSecondary }]}>Estimated fare: {selectedJoinRequest.calculatedFare != null ? `BDT ${selectedJoinRequest.calculatedFare.toFixed(2)}` : 'n/a'}</Text>
                  <Text style={[styles.joinRequestMetaText, { color: textSecondary }]}>Duration: {selectedJoinRequest.estimatedDurationMin != null ? `${selectedJoinRequest.estimatedDurationMin} min` : 'n/a'}</Text>
                  <Text style={[styles.joinRequestMetaText, { color: textSecondary }]}>Pricing: {selectedJoinRequest.pricingVersion || 'n/a'}</Text>
                  <Text style={[styles.joinRequestMetaText, { color: textSecondary }]}>Route payload: {selectedJoinRequest.routePolyline ? 'present' : 'none'}</Text>
                  {selectedJoinRequest.requestMessage ? (
                    <Text style={[styles.joinRequestMetaText, { color: textSecondary }]}>Message: {selectedJoinRequest.requestMessage}</Text>
                  ) : null}
                </View>
              </View>

              <Text style={[styles.joinRequestRequestedAt, { color: textSecondary }]}>Requested {selectedJoinRequest.requestedAt ? formatRideDate(selectedJoinRequest.requestedAt) : 'unknown time'}</Text>

              {selectedJoinRequest.status === 'pending' ? (
                <View style={styles.joinRequestActionRow}>
                  <Pressable
                    style={styles.requestDeclineButton}
                    onPress={() => {
                      handleDeclineRequest(selectedJoinRequest);
                      setSelectedJoinRequest(null);
                    }}
                  >
                    <Text style={styles.requestDeclineText}>Decline</Text>
                  </Pressable>
                  <Pressable
                    style={styles.requestAcceptButton}
                    onPress={() => {
                      handleAcceptRequest(selectedJoinRequest);
                      setSelectedJoinRequest(null);
                    }}
                  >
                    <Text style={styles.requestAcceptText}>Accept</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.joinRequestResolvedPill}>
                  <Text style={styles.joinRequestResolvedText}>
                    {selectedJoinRequest.status === 'accepted' ? 'Accepted' : 'Declined'}
                  </Text>
                </View>
              )}

            </View>
          </View>
        ) : null}
      </Modal>

      {callingUser ? <InCallModal user={callingUser} onClose={() => setCallingUser(null)} /> : null}
      <RemoveAndReportModal
        visible={Boolean(removeModalPayload)}
        passenger={removeModalPayload?.request?.requester ?? null}
        onClose={() => setRemoveModalPayload(null)}
        onConfirm={handleRemoveWithModal}
      />
      <ConfirmCancelModal
        visible={Boolean(cancelModalPayload)}
        ride={cancelModalPayload?.ride ?? null}
        passengers={cancelModalPayload?.passengers ?? []}
        onTransferOwnership={handleTransferOwnership}
        onJustCancel={handleJustCancelRide}
        onClose={() => setCancelModalPayload(null)}
      />

      <Modal visible={showScheduleSearchModal} transparent animationType="fade" onRequestClose={() => setShowScheduleSearchModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.scheduleSearchModalCard}>
            <View style={styles.scheduleSearchHeader}>
              <Text style={styles.scheduleSearchTitle}>Search by date/time</Text>
              <Pressable onPress={() => setShowScheduleSearchModal(false)}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </Pressable>
            </View>

            <StyledDateTimePicker
              text="Pick date"
              value={searchDate}
              mode="date"
              onChange={handleSearchDateChange}
              style={styles.scheduleSearchPicker}
            />

            <StyledDateTimePicker
              text="Pick time (optional)"
              value={searchTime}
              mode="time"
              onChange={handleSearchTimeChange}
              style={styles.scheduleSearchPicker}
            />

            <View style={styles.scheduleSearchActions}>
              <Pressable onPress={clearScheduleSearch} style={styles.scheduleSearchClearBtn}>
                <Text style={styles.scheduleSearchClearText}>Clear</Text>
              </Pressable>
              <Pressable onPress={() => setShowScheduleSearchModal(false)} style={styles.scheduleSearchApplyBtn}>
                <Text style={styles.scheduleSearchApplyText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  topBlock: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  topTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    padding: 4,
    marginTop: 10,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.brand,
  },
  tabButtonIdle: {
    backgroundColor: 'transparent',
  },
  tabButtonActiveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tabButtonIdleText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  filtersRow: {
    gap: 8,
    paddingTop: 10,
    paddingBottom: 2,
  },
  calendarChip: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  scheduleSearchModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 420,
    padding: 14,
    gap: 10,
  },
  scheduleSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleSearchTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  scheduleSearchPicker: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  scheduleSearchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  scheduleSearchClearBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  scheduleSearchClearText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  scheduleSearchApplyBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  scheduleSearchApplyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipIdle: {
    borderColor: '#E5E5E5',
  },
  chipActiveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  chipIdleText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  joinRequestsFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  joinRequestsBubble: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  joinRequestsBubbleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  body: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: colors.brand,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaRowJoined: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  openPill: {
    marginLeft: 'auto',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  openPillOpen: {
    backgroundColor: '#F0FDF4',
  },
  openPillClosed: {
    backgroundColor: '#FEF2F2',
  },
  openPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statCellBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 10,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandedArea: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 10,
  },
  actionGrid: {
    gap: 8,
  },
  editButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brand,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  editButtonText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '600',
  },
  closeJoinButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  openJoinButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completeButton: {
    borderRadius: 10,
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  subBlock: {
    gap: 8,
  },
  subBlockTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  passengerItem: {
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  passengerCopy: {
    flex: 1,
    minWidth: 0,
  },
  passengerName: {
    fontSize: 13,
    fontWeight: '600',
  },
  paymentPillPaid: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0FDF4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentPillPending: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFBEB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  passengerActions: {
    flexDirection: 'row',
    gap: 5,
  },
  callIconButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIconButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestItem: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FFFBEB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  requestCopy: {
    flex: 1,
    minWidth: 0,
  },
  requestRoute: {
    fontSize: 11,
    marginTop: 2,
  },
  requestMetaLine: {
    fontSize: 10,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 6,
  },
  requestViewButton: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F9A8B4',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requestViewText: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '600',
  },
  requestDeclineButton: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  requestDeclineText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  requestAcceptButton: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#1C1C1E',
  },
  requestAcceptText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  cancelRideButton: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cancelRideText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyPrimary: {
    fontSize: 13,
    marginBottom: 10,
  },
  createRideButton: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  createRideText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '600',
  },
  browseButton: {
    borderRadius: 12,
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  joinedCreatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorUsernameTiny: {
    fontSize: 11,
  },
  joinedActionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  payNowJoinedButton: {
    borderRadius: 10,
    backgroundColor: colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  payNowJoinedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  detailJoinedButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailJoinedText: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '600',
  },
  cancelJoinedButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cancelJoinedText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
  },
  pastLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  pastCompleted: {
    color: '#16A34A',
  },
  pastCancelled: {
    color: '#DC2626',
  },
  pastMeta: {
    fontSize: 11,
  },
  pastFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pastActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pastPayButton: {
    borderRadius: 8,
    backgroundColor: colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pastPayButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  reviewButton: {
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  pastDoneText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  joinRequestModal: {
    width: '100%',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  joinRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinRequestTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  joinRequestCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  joinRequestUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  joinRequestUserCopy: {
    flex: 1,
    minWidth: 0,
  },
  joinRequestUserName: {
    fontSize: 14,
    fontWeight: '600',
  },
  joinRequestUserHandle: {
    fontSize: 12,
    marginTop: 2,
  },
  joinRequestRouteCard: {
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  joinRequestSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  joinRequestRequestedAt: {
    fontSize: 11,
  },
  joinRequestMetaGrid: {
    marginTop: 6,
    gap: 3,
  },
  joinRequestMetaText: {
    fontSize: 11,
  },
  joinRequestActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  joinRequestResolvedPill: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  joinRequestResolvedText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
});
