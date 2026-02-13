import React, { useState, useEffect } from 'react';
import { calculateFareBreakdown } from '../../../src/utils/fareCalc';
import { View, StyleSheet, Alert } from 'react-native'
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView'
import { StyledText as Text } from '../../../components/StyledText'
import { StyledTitle as Title } from '../../../components/StyledTitle' 
import { StyledCardButton as CardButton } from '../../../components/StyledCardButton'
import { StyledButton as Button } from '../../../components/StyledButton'
import { useRouter } from 'expo-router';
import { getDistance } from '../../../src/utils/mapServices'
import { normalizeRide } from '../../../src/utils/rideMapper';
import { useRide } from '../../../context/RideContext';



export default function FareCalculation() {
  const { selectedRide, myRides, joinedRides, rides: availableRides, completeRide, loading, getRideDetails } = useRide();
  const [currentRide, setCurrentRide] = useState(null);
  const [fareBreakdown, setFareBreakdown] = useState([]);
  const [completing, setCompleting] = useState(false);
  const router = useRouter();

  // Fetch latest ride details on mount
  useEffect(() => {
    let rideId = selectedRide?.id;
    if (!rideId && typeof window !== 'undefined' && window.location && window.location.pathname) {
      const match = window.location.pathname.match(/(ride|fareCalculation)[/\\]([\w-]+)/);
      if (match && match[2]) rideId = match[2];
    }
    if (rideId) {
      getRideDetails(rideId).then((fetched) => {
        setCurrentRide(fetched ? normalizeRide(fetched) : null);
      });
    } else {
      setCurrentRide(null);
    }
  }, [selectedRide, myRides, joinedRides, availableRides]);

  // Debug logging
  useEffect(() => {
    // Logging removed
  }, [selectedRide, myRides, joinedRides, availableRides, currentRide]);

  // Calculate fare breakdown
  useEffect(() => {
    if (
      currentRide &&
      currentRide.id &&
      currentRide.start?.coords &&
      currentRide.destination?.coords &&
      currentRide.fare &&
      currentRide.partners
    ) {
      try {
        const { breakdown } = calculateFareBreakdown(currentRide);
        setFareBreakdown(breakdown);
      } catch (e) {
        console.warn('Fare breakdown error:', e);
        setFareBreakdown([]);
      }
    } else {
      setFareBreakdown([]);
    }
  }, [currentRide]);

  const handleCompleteRide = async () => {
    if (!currentRide || !currentRide.id) {
      Alert.alert('Error', 'No ride selected or ride data incomplete.');
      console.warn('handleCompleteRide: currentRide', currentRide);
      return;
    }

    const status = String(currentRide.status ?? currentRide.currentStatus ?? currentRide.current_status ?? '').toLowerCase();
    const fareStatus = String(currentRide.fareStatus ?? '').toLowerCase();
    if (status === 'completed' && fareStatus === 'complete') {
      Alert.alert('Info', 'This ride is already completed.');
      return;
    }

    setCompleting(true);
    try {
      await completeRide(currentRide.id, {
        actualFare: parseFloat(currentRide.fare || 0),
        completionTime: new Date().toISOString(),
      });
      // Fetch latest ride details to ensure up-to-date partners list
      const latestRide = await getRideDetails(currentRide.id);
      Alert.alert('Success', 'Fare payment complete');
      if (latestRide && Array.isArray(latestRide.partners)) {
        router.push({
          pathname: '/(app)/(completeRide)/partnerFeedback',
          params: { participants: JSON.stringify(latestRide.partners) }
        });
      } else {
        router.push('/(app)/(completeRide)/partnerFeedback');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to complete ride');
    } finally {
      setCompleting(false);
    }
  };

  // Show error if ride data is missing
  if (!currentRide || !currentRide.creator || !currentRide.fare || !currentRide.start || !currentRide.destination) {
    return (
      <ScrollView>
        <Title>Ride participants</Title>
        <Text>No ride data available or ride is incomplete. Please try again.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView>
      <Title>Ride participants</Title>
      <CardButton>
        <View style={{width: '100%'}}>
          <View style={styles.participantRow}>
            <View style={styles.creatorRow}>
              <Text style={{ fontSize: 30 }}>👤 </Text>
              <View>
                <Text style={{ fontWeight: 'semibold', fontSize: 16 }}>{currentRide.creator.name}</Text>
                <Text style={styles.handle}>{currentRide.creator.handle}</Text>
              </View>
            </View>
            <Text style={styles.participantRole}>Creator</Text>
          </View>
          {(currentRide.partners || []).map((partner, index) => (
            <View key={index} style={styles.participantRow}>
              <View style={styles.creatorRow}>
                <Text style={{ fontSize: 30 }}>👤 </Text>
                <View>
                  <Text style={{ fontWeight: 'semibold', fontSize: 16 }}>{partner.name}</Text>
                  <Text style={styles.handle}>{partner.handle}</Text>
                </View>
              </View>
              <Text style={styles.participantRole}>Buddy</Text>
            </View>
          ))}
        </View>
      </CardButton>

      <CardButton>
        <View style={{width: '100%'}}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Total Fare:</Text>
            <Text style={styles.fareValue}>BDT {currentRide.fare}</Text>
          </View>

          {fareBreakdown.map((p, i) => (
            <View key={`${p.name || ''}-${p.handle || ''}-${i}`} style={styles.fareRow}>
              <Text>{p.handle}</Text>
              <Text>{p.distance.toFixed(2)} km</Text>
              <Text>BDT {p.fare}</Text>
            </View>
          ))}
        </View>
      </CardButton>

      <Button
        title={completing ? 'Completing...' : 'Finish'}
        onPress={handleCompleteRide}
        disabled={completing || loading}
        style={{marginTop: 20, width: '100%'}}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 8,
  },
  participantRole: { 
    fontSize: 12, 
    color: '#000',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  handle: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
  fareRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 8
  },
  fareLabel: { 
    fontSize: 16, 
    color: '#333' 
  },
  fareValue: { 
    fontSize: 16, 
    fontWeight: 'semibold' 
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd'
  },
})
