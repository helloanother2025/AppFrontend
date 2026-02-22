
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StyledText as Text } from '../../../../components/StyledText';
import { StyledTitle as Title } from '../../../../components/StyledTitle';
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView';
import { joinRequestsAPI } from '../../../../src/api/joinRequests';
import RideDisplayCard from '../../../../components/RideDisplayCard';

export default function JoinRequestsList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await joinRequestsAPI.getMyRequests();
        if (isMounted) setRequests(data?.joinRequests || []);
      } catch (err) {
        if (isMounted) setError('Failed to load join requests');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  if (loading) return <ActivityIndicator style={{marginTop: 40}} />;
  if (error) return <Text style={{color: 'red', marginTop: 40}}>{error}</Text>;

  // Group requests
  const pending = requests.filter(r => (r.current_status || r.status) === 'pending');
  const joined = requests.filter(r => (r.current_status || r.status) === 'accepted');

  // Helper to map join request to RideDisplayCard props
  const mapToRideCard = (req) => {
    // Parse date from start_time if available
    let date = {};
    if (req.start_time) {
      const d = new Date(req.start_time);
      date = {
        day: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
        time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
      };
    }
    // Prefer ride's main start/dest if join request's own are missing
    const start = req.start_name ? { name: req.start_name } : (req.ride_start_name ? { name: req.ride_start_name } : { name: 'Unknown location' });
    const destination = req.dest_name ? { name: req.dest_name } : (req.ride_dest_name ? { name: req.ride_dest_name } : { name: 'Unknown location' });
    const creator = req.creator_id ? { name: req.creator_name || `User #${req.creator_id}`, user_id: req.creator_id, handle: req.creator_handle || '' } : { name: 'Unknown', user_id: '' };
    return {
      id: req.ride_id,
      ride_uuid: req.ride_uuid,
      status: req.ride_status || req.status || req.current_status,
      current_status: req.ride_status || req.status || req.current_status,
      start,
      destination,
      fare: req.fare ?? 'TBA',
      transportMode: req.transport_mode || '',
      available_seats: req.available_seats ?? 0,
      gender: req.gender_preference || 'Any',
      creator,
      partners: req.partners || [],
      date,
      rideProvider: req.ride_provider || '',
      totalPassengers: req.total_passengers || req.available_seats || 0,
      preferences: req.preference_notes || '',
    };
  };

  return (
    <ScrollView>
      <Title>Pending requests</Title>
      {pending.length === 0 && <Text style={styles.empty}>No pending requests.</Text>}
      {requests.length > 0 && requests.some(r => !r.start_name || !r.dest_name || !r.creator_id) && (
        <Text style={{color: 'orange', marginBottom: 8}}>
          Some rides are missing location or creator info. Please check ride data integrity.
        </Text>
      )}
      {pending.map((req, idx) => (
        <View key={req.request_id || idx} style={styles.cardWrapper}>
          <RideDisplayCard ride={mapToRideCard(req)} join={true} />
        </View>
      ))}

      <Title style={{marginTop: 14}}>Rides joined</Title>
      {joined.length === 0 && <Text style={styles.empty}>No joined rides.</Text>}
      {joined.map((req, idx) => (
        <View key={req.request_id || idx} style={styles.cardWrapper}>
          <RideDisplayCard ride={mapToRideCard(req)} join={true} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 16,
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
  },
  cardWrapper: {
    marginBottom: 2,
    width: '100%',
  },
  rideText: {
    fontSize: 14,
    marginBottom: 4,
  },
});
