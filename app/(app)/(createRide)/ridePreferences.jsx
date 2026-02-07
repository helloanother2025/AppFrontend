import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import { useRouter } from 'expo-router';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledTitle as Title } from '../../../components/StyledTitle'; 
import RideCard from '../../../components/RideDisplayCard';
import { StyledCard as Card} from '../../../components/StyledCard';
import { StyledSearchBar as TextInput } from '../../../components/StyledSearchBar';
import { StyledButton as Button } from '../../../components/StyledButton';
import { useRide } from '../../../context/RideContext';


export default function RidePreferences() {
  const router = useRouter();
  const { rideData, setRideData } = useRide();
  const [preferences, setPreferences] = useState({
    numPartners: 1,
    gender: 'Any',
    otherNotes: ''
  });
  const maxPartners = rideData.transport === 'Car' ? 4 : rideData.transport === 'CNG' ? 3 : 10;

  const handleNext = () => {
    setRideData({
      ...rideData,
      gender: preferences.gender,
      totalPassengers: preferences.numPartners,
      preferences: preferences.otherNotes,
    });
    router.replace('/rideCreated');
  };
  

  return (
    <ScrollView>
      <Title>Your trip</Title>

      <RideCard create={true} ride={rideData} />

      <Title>Ride preferences</Title>

      <Card>
        <Text style={styles.formText}>Number of ride partners</Text>
        <View style={styles.numericInputContainer}>
          <TouchableOpacity onPress={() => setPreferences(p => ({ ...p, numPartners: Math.max(1, p.numPartners - 1) }))} style={styles.numericButton}>
            <Text style={styles.numericButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.numericValue}>{preferences.numPartners}</Text>
          <TouchableOpacity onPress={() => setPreferences(p => ({ ...p, numPartners: Math.min(maxPartners, p.numPartners + 1 )}))} style={styles.numericButton}>
            <Text style={styles.numericButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.formText}>Preferred gender</Text>
        <View style={{ flexDirection: 'row', marginVertical: 5 }}>
          {['Any', 'Male', 'Female'].map(opt => (
            <TouchableOpacity
              key={opt}
              onPress={() => setPreferences(p => ({ ...p, gender: opt }))}
              style={[styles.pill, preferences.gender === opt && styles.pillActive]}>
              <Text style={[styles.pillText, preferences.gender === opt && styles.pillTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.formText}>Other</Text>
        <TextInput
          placeholder='Add notes (optional)'
          value={preferences.otherNotes}
          onChangeText={text => setPreferences(p => ({ ...p, otherNotes: text }))}
          multiline
        />
      </Card>


      <View style={styles.buttonRow}>
        <Button
          title='Back'
          onPress={() => router.back()}
          style={{ width: '30%' }}
        ></Button>
        <Button
          title='Finish'
          onPress={handleNext}
          style={{ width: '35%' }}
        ></Button>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  formText: {
    fontSize: 16,
    fontWeight: 'semibold',
    marginTop: 10
  },
  primaryCta: { 
    marginTop: 10, 
    padding: 16, 
    borderRadius: 14, 
    backgroundColor: '#1f1f1f', 
    alignItems: 'center' 
  },
  primaryCtaText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  pill: { 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 999, 
    borderWidth: 1, 
    borderColor: '#000', 
    marginRight: 8, 
    backgroundColor: '#fff', 
    marginTop: 5
  },
  pillActive: { 
    backgroundColor: 
    '#1f1f1f', 
    borderColor: '#1f1f1f' 
  },
  pillText: { 
    fontSize: 14 
  },
  pillTextActive: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    width: '100%',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    flex: 1,
  },
  rideText: {
    fontSize: 14,
    flex: 1,
  },
  handle: {
    color: '#888',
    flex: 1,
  },
  icon: {
    marginRight: 10,
  },
  numericInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  numericButton: {
    backgroundColor: '#eee',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
  },
  numericButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  numericValue: {
    fontSize: 16,
    marginHorizontal: 15,
  },
})
