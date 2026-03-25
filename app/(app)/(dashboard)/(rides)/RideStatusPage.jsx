import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StyledText as Text } from '../../../../components/StyledText';
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView';
import { StyledTitle as Title } from '../../../../components/StyledTitle';
import RideCard from '../../../../components/RideDisplayCard';
import { useRide } from '../../../../context/RideContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '../../../../context/UserContext';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { joinRequestsAPI } from '../../../../src/api/joinRequests';

const TABS = [
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'created', label: 'Created' },
  { key: 'past', label: 'Past' },
  { key: 'requests', label: 'Requests' },
];

const TAB_TITLES = {
  ongoing: 'Ongoing rides',
  created: 'Created rides',
  past: 'Past rides',
};

export default function RideStatusPage() {
  const { myRides, fetchMyRides, loading } = useRide();
  const { currentUser } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ongoing');

  // Requests tab state
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState(null);

  const userId = String(currentUser?.user_id ?? currentUser?.id ?? '');

  // Refresh myRides whenever this screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchMyRides();
    }, [fetchMyRides])
  );

  // Fetch join requests whenever the Requests tab is activated
  useEffect(() => {
    if (activeTab !== 'requests') return;
    let isMounted = true;
    (async () => {
      setRequestsLoading(true);
      setRequestsError(null);
      try {
        const data = await joinRequestsAPI.getMyRequests();
        if (isMounted) setRequests(data?.joinRequests || []);
      } catch {
        if (isMounted) setRequestsError('Failed to load join requests');
      } finally {
        if (isMounted) setRequestsLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [activeTab]);

  const getStatus = (r) =>
    String(r.status ?? r.currentStatus ?? r.current_status ?? '').toLowerCase();

  const ridesForTab = (tab) => {
    switch (tab) {
      case 'ongoing':
        return myRides.filter((r) => ['ongoing', 'started'].includes(getStatus(r)));
      case 'created':
        return myRides.filter((r) => {
          const creator = String(r.creator_id ?? r.creator?.user_id ?? r.creator?.id ?? '');
          return getStatus(r) === 'unactive' && creator === userId;
        });
      case 'past':
        return myRides.filter((r) =>
          ['completed', 'cancelled', 'expired'].includes(getStatus(r))
        );
      default:
        return [];
    }
  };

  // Map a join-request record to the shape RideCard expects
  const mapToRideCard = (req) => {
    let date = {};
    if (req.start_time) {
      const d = new Date(req.start_time);
      date = {
        day: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
        time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }),
      };
    }
    const start = req.start_name
      ? { name: req.start_name }
      : req.ride_start_name
      ? { name: req.ride_start_name }
      : { name: 'Unknown location' };
    const destination = req.dest_name
      ? { name: req.dest_name }
      : req.ride_dest_name
      ? { name: req.ride_dest_name }
      : { name: 'Unknown location' };
    const creator = req.creator_id
      ? { name: req.creator_name || `User #${req.creator_id}`, user_id: req.creator_id, handle: req.creator_handle || '' }
      : { name: 'Unknown', user_id: '' };
    return {
      id: req.ride_id,
      ride_uuid: req.ride_uuid,
      status: req.ride_status || req.status || req.current_status,
      current_status: req.ride_status || req.status || req.current_status,
      start, destination,
      fare: req.fare ?? 'TBA',
      transportMode: req.transport_mode || '',
      available_seats: req.available_seats ?? 0,
      gender: req.gender_preference || 'Any',
      creator, partners: req.partners || [],
      date, rideProvider: req.ride_provider || '',
      totalPassengers: req.total_passengers || req.available_seats || 0,
      preferences: req.preference_notes || '',
    };
  };

  const filteredRides = activeTab === 'requests' ? [] : ridesForTab(activeTab);
  const pendingRequests = requests.filter((r) => (r.current_status || r.status) === 'pending');
  const joinedRequests  = requests.filter((r) => (r.current_status || r.status) === 'accepted');

  const Spinner = ({ label }) => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#1f1f1f" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );

  const renderRequestsContent = () => {
    if (requestsLoading) return <Spinner label="Loading requests..." />;
    if (requestsError)   return <Text style={styles.emptyText}>{requestsError}</Text>;
    return (
      <>
        <Title style={{ marginTop: 0, fontSize: 20 }}>Pending</Title>
        {pendingRequests.length === 0 && <Text style={styles.emptyText}>No pending requests.</Text>}
        {pendingRequests.map((req, idx) => (
          <View key={req.request_id || idx} style={styles.cardWrapper}>
            <RideCard ride={mapToRideCard(req)} join={true} />
          </View>
        ))}

        <Title style={{ marginTop: 14, fontSize: 20 }}>Joined</Title>
        {joinedRequests.length === 0 && <Text style={styles.emptyText}>No joined rides.</Text>}
        {joinedRequests.map((req, idx) => (
          <View key={req.request_id || idx} style={styles.cardWrapper}>
            <RideCard ride={mapToRideCard(req)} join={true} />
          </View>
        ))}
      </>
    );
  };

  const renderRidesContent = () => {
    if (loading) return <Spinner label="Loading rides..." />;
    if (filteredRides.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="car-side" size={36} color="#ccc" />
          <Text style={styles.emptyText}>No {activeTab} rides</Text>
        </View>
      );
    }
    return (
      <>
        <Title style={{ marginTop: 0, fontSize: 20 }}>{TAB_TITLES[activeTab]}</Title>
        {filteredRides.map((ride, idx) => (
          <View key={`${ride.id ?? 'noid'}-${idx}`} style={styles.cardWrapper}>
            <RideCard
              ride={ride}
              join={false}
              onPress={() => router.push(`/ride/${ride.id}`)}
            />
          </View>
        ))}
      </>
    );
  };

  return (
    <ScrollView>
      <Title>Your rides</Title>

      {/* Tab pills */}
      <View style={styles.pillsRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {activeTab === 'requests' ? renderRequestsContent() : renderRidesContent()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pillsRow: {
    flexDirection: 'row',
    backgroundColor: '#ebebeb',
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 16,
    gap: 2,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  pillActive: {
    backgroundColor: '#1f1f1f',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  pillTextActive: {
    color: '#fff',
  },
  cardWrapper: {
    width: '100%',
    marginBottom: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 50,
    gap: 12,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
});
