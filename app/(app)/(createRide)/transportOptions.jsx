import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledTitle as Title } from '../../../components/StyledTitle';
import { StyledCardButton as CardButton } from '../../../components/StyledCardButton';
import RideCard from '../../../components/RideDisplayCard';
import { StyledButton as Button } from '../../../components/StyledButton';
import { useRide } from '../../../context/RideContext';
import { useRouter } from 'expo-router';

export default function TransportOptions() {
  const router = useRouter();
  const { rideData, setRideData } = useRide();
  const [selectedTransport, setSelectedTransport] = useState(null);
  const transportOptions = ['Uber', 'Pathao', 'Private Car', 'Other'];
  const [fareEstimate, setFareEstimate] = useState('');

  const handleNext = () => {
    let fareValue = fareEstimate.trim();
    if (fareValue === '' || isNaN(fareValue) || parseFloat(fareValue) < 0) {
      fareValue = 'TBA';
    } else {
      fareValue = parseFloat(fareValue).toFixed(2); 
    }
    
    // Map frontend transport options to database enum values
    const transportMapping = {
      'Uber': 'Car',
      'Pathao': 'Bike',
      'Private Car': 'Car',
      'Other': 'Car'
    };
    
    const transportMode = transportMapping[selectedTransport] || selectedTransport;
    setRideData({ ...rideData, fare: fareValue, transport: transportMode });
    router.push('/ridePreferences');
  }

  return (
    <ScrollView>
      <Title>Your Trip</Title>

      <RideCard create={true} ride={rideData} />

      <Title>Choose a service</Title>

      {transportOptions.map((option) => (
        <CardButton key={option} onPress={() => setSelectedTransport(option)}  style={selectedTransport === option ? styles.selectedCard : {}} >
          <Text style={styles.transportText}>{option}</Text>
        </CardButton>
      ))}

      {selectedTransport && (
        <>
        <Title>Fare (optional)</Title>

        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10,}}>
          <TextInput
            style={styles.fareInput}
            placeholder='Enter fare...'
            keyboardType='numeric'
            value={fareEstimate}
            onChangeText={(text) => setFareEstimate(text.replace(/[^0-9.]/g, ''))} 
          ></TextInput>
          <Text style={{marginLeft: 10}}>BDT</Text>
        </View>
        </>
      )}
      
      <View style={styles.buttonRow}>
        <Button
        title='Back'
        onPress={() => router.back()}
        style={{ width: '30%' }}
        ></Button>

        {selectedTransport && (
          <Button
            title="Next"
            onPress={handleNext}
          ></Button>
        )}
      </View>
      
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    paddingTop: 10,
    backgroundColor: '#f7f7f7',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    width: '100%',
  },
  transportText: {
    fontSize: 16,
    fontWeight: '500',
    width: '100%',
  },
  primaryCta: {
    marginTop: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
  },
  primaryCtaText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectedCard: {
    backgroundColor: '#888',
    borderWidth: 2,
    borderColor: '#000',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    width: '100%',
  },
  fareInput: {
    width: '50%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#000',
    fontSize: 16,
    fontFamily: 'Montserrat-Regular'
  }
})
