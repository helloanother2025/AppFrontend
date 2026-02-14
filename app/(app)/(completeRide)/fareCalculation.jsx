import React, { useState, useEffect } from 'react';
import { calculateFareBreakdown, getMethodDisplayText, getMethodDescription } from '../../../src/utils/fareCalc';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledTitle as Title } from '../../../components/StyledTitle';
import { StyledCardButton as CardButton } from '../../../components/StyledCardButton';
import { StyledButton as Button } from '../../../components/StyledButton';
import { useRouter } from 'expo-router';
import { normalizeRide } from '../../../src/utils/rideMapper';
import { useRide } from '../../../context/RideContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function FareCalculation() {
  const { selectedRide, myRides, joinedRides, rides: availableRides, completeRide, loading, getRideDetails } = useRide();
  const [currentRide, setCurrentRide] = useState(null);
  const [fareBreakdown, setFareBreakdown] = useState([]);
  const [completing, setCompleting] = useState(false);
  const [calculationMethod, setCalculationMethod] = useState('distance'); // 'equal' or 'distance'
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
        setCurrentRide(fetched || null);
      });
    } else {
      setCurrentRide(null);
    }
  }, [selectedRide, myRides, joinedRides, availableRides]);

  // Calculate fare breakdown when ride or method changes
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
        const { breakdown } = calculateFareBreakdown(currentRide, calculationMethod);
        setFareBreakdown(breakdown);
      } catch (e) {
        console.warn('Fare breakdown error:', e);
        setFareBreakdown([]);
      }
    } else {
      setFareBreakdown([]);
    }
  }, [currentRide, calculationMethod]);

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
      
      {/* Participants Card */}
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

      {/* Calculation Method Toggle */}
      <View style={styles.methodContainer}>
        <Text style={styles.methodLabel}>Fare calculation:</Text>
        <View style={styles.methodToggle}>
          <TouchableOpacity
            style={[
              styles.methodOption,
              calculationMethod === 'equal' && styles.methodOptionActive
            ]}
            onPress={() => setCalculationMethod('equal')}
          >
            <FontAwesome 
              name="users" 
              size={14} 
              color={calculationMethod === 'equal' ? '#fff' : '#666'} 
            />
            <Text style={[
              styles.methodOptionText,
              calculationMethod === 'equal' && styles.methodOptionTextActive
            ]}>
              Equal Split
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.methodOption,
              calculationMethod === 'distance' && styles.methodOptionActive
            ]}
            onPress={() => setCalculationMethod('distance')}
          >
            <FontAwesome 
              name="road" 
              size={14} 
              color={calculationMethod === 'distance' ? '#fff' : '#666'} 
            />
            <Text style={[
              styles.methodOptionText,
              calculationMethod === 'distance' && styles.methodOptionTextActive
            ]}>
              Distance-Based
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.methodDescription}>
          {getMethodDescription(calculationMethod)}
        </Text>
      </View>

      {/* Fare Breakdown Card */}
      <CardButton>
        <View style={{width: '100%'}}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Total Fare:</Text>
            <Text style={styles.fareValue}>BDT {currentRide.fare}</Text>
          </View>

          <View style={styles.divider} />

          {/* Column Headers */}
          {calculationMethod === 'distance' && (
            <View style={[styles.fareRow, styles.headerRow]}>
              <Text style={styles.headerText}>Person</Text>
              <Text style={styles.headerText}>Distance</Text>
              <Text style={styles.headerText}>Share</Text>
            </View>
          )}

          {/* Breakdown Rows */}
          {fareBreakdown.map((p, i) => (
            <View key={`${p.name || ''}-${p.handle || ''}-${i}`} style={styles.breakdownRow}>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{p.name}</Text>
                <Text style={styles.personHandle}>@{p.handle}</Text>
              </View>
              
              {calculationMethod === 'distance' && (
                <View style={styles.distanceInfo}>
                  <Text style={styles.distanceText}>{(p.distance ?? 0).toFixed(2)} km</Text>
                </View>
              )}
              
              <View style={styles.fareInfo}>
                <Text style={styles.fareText}>BDT {p.fare}</Text>
              </View>
            </View>
          ))}

          {/* Summary */}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {fareBreakdown.length} {fareBreakdown.length === 1 ? 'participant' : 'participants'}
            </Text>
            {calculationMethod === 'distance' && (
              <Text style={styles.summaryText}>
                Total: {fareBreakdown.reduce((sum, p) => sum + parseFloat(p.fare), 0).toFixed(2)} BDT
              </Text>
            )}
          </View>
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
  
  // Method Selection
  methodContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: '#e6e6e6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  methodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  methodOptionActive: {
    backgroundColor: '#1f1f1f',
  },
  methodOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  methodOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  methodDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Fare Breakdown
  fareRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 8
  },
  fareLabel: { 
    fontSize: 16, 
    color: '#333',
    fontWeight: '600',
  },
  fareValue: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#1f1f1f',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  headerRow: {
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  personInfo: {
    flex: 2,
  },
  personName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f1f1f',
  },
  personHandle: {
    fontSize: 12,
    color: '#888',
  },
  distanceInfo: {
    flex: 1,
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 13,
    color: '#333',
  },
  fareInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  fareText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f1f1f',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});