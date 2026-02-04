import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native'
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView'
import { StyledText as Text } from '../../../components/StyledText'
import { StyledTitle as Title } from '../../../components/StyledTitle' 
import { StyledCardButton as CardButton } from '../../../components/StyledCardButton'
import { StyledButton as Button } from '../../../components/StyledButton'
import { useRouter } from 'expo-router';
import { getDistance } from '../../../src/utils/mapServices'
import { useRide } from '../../../context/RideContext'

export default function FareCalculation() {
  const { selectedRide, myRides, rides: availableRides, completeRide, loading } = useRide();
  const currentRide = selectedRide || myRides[0] || availableRides[0];
  const router = useRouter();
  const [fareBreakdown, setFareBreakdown] = useState([]);
  const [completing, setCompleting] = useState(false);

  const getDistances = async () => {
    if (!currentRide?.start?.coords || !currentRide?.destination?.coords) {
      return;
    }

    const rideStart = currentRide.start.coords;
    const rideEnd   = currentRide.destination.coords;
    const totalFare = parseFloat(currentRide.fare || 0);

    const totalDistanceData = await getDistance(
      { latitude: rideStart.lat, longitude: rideStart.lng },
      { latitude: rideEnd.lat, longitude: rideEnd.lng }
    );

    const totalDistanceKm = totalDistanceData?.distance ?? 0;
  
    const participants = [];
  
    participants.push({
      name: currentRide.creator.name,
      handle: currentRide.creator.handle,
      distance: totalDistanceKm,
    });
  
    const partners = currentRide.partners || [];
    for (const partner of partners) {
      if (!partner.start?.coords || !partner.destination?.coords) {
        continue;
      }
      const start = partner.start.coords;
      const end = partner.destination.coords;
  
      const distanceData = await getDistance(
        { latitude: start.lat, longitude: start.lng },
        { latitude: end.lat, longitude: end.lng }
      );
      const userDistanceKm = distanceData?.distance ?? 0;
  
      participants.push({
        name: partner.name,
        handle: partner.handle,
        distance: userDistanceKm,
      });
    }
  
    const sumDistances = participants.reduce((sum, p) => sum + p.distance, 0);
  
    const breakdown = participants.map((p) => ({
      name: p.name,
      handle: p.handle,
      distance: p.distance,
      fare: ((p.distance / sumDistances) * totalFare).toFixed(2),
    }));
  
    setFareBreakdown(breakdown);
  };

  const handleCompleteRide = async () => {
    if (!currentRide?.id) {
      Alert.alert('Error', 'No ride selected');
      return;
    }

    const status = String(currentRide?.status ?? currentRide?.currentStatus ?? currentRide?.current_status ?? '').toLowerCase();
    const fareStatus = String(currentRide?.fareStatus ?? '').toLowerCase();
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
      Alert.alert('Success', 'Fare payment complete');
      router.push('/(dashboard)/(rides)/rides');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to complete ride');
    } finally {
      setCompleting(false);
    }
  };

  useEffect(() => {
    getDistances();
  }, [currentRide]);

  if (!currentRide) {
    return (
      <ScrollView>
        <Title>Ride participants</Title>
        <Text>No ride data available.</Text>
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
            <View key={i} style={styles.fareRow}>
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
  )
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
