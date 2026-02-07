import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledTitle as Title } from '../../../components/StyledTitle';
import { StyledCardButton as CardButton } from '../../../components/StyledCardButton';
import RideCard from '../../../components/RideDisplayCard';
import { StyledButton as Button } from '../../../components/StyledButton';
import { useRouter } from 'expo-router';
import { useRide } from '../../../context/RideContext';

export default function ChooseTransport() {
  const router = useRouter();
  const { rideData, setRideData } = useRide();
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [fareEstimate, setFareEstimate] = useState('');

  const handleNext = () => {
    let fareValue = fareEstimate.trim();
    if (fareValue === '' || isNaN(fareValue) || parseFloat(fareValue) < 0) {
      fareValue = 'TBA';
    } else {
      fareValue = parseFloat(fareValue).toFixed(2); // Format to 2 decimal places
    }

    setRideData({ ...rideData, transport: selectedTransport, fare: fareValue });

    if (selectedTransport === 'Car') {
      router.push('/transportOptions');
    } else {
      router.push('/ridePreferences');
    }
  };

  return (
    <ScrollView>
      <Title>Your trip</Title>

      <RideCard create={true} ride={rideData} />

      <Title>Select transport</Title>

      <CardButton onPress={() => setSelectedTransport('Car')} style={selectedTransport === 'Car' ? styles.selectedCard : {}}>
        <View style={styles.transportRow}>
          <Text style={styles.transportIcon}>🚗</Text>
          <Text style={styles.transportText}>Car</Text>
        </View>
      </CardButton>
      <CardButton onPress={() => setSelectedTransport('CNG')} style={selectedTransport === 'CNG' ? styles.selectedCard : {}}>
        <View style={styles.transportRow}>
          <Text style={styles.transportIcon}>🛺</Text>
          <Text style={styles.transportText}>CNG</Text>
        </View>
      </CardButton>
      <CardButton onPress={() => setSelectedTransport('Bus')} style={selectedTransport === 'Bus' ? styles.selectedCard : {}}>
        <View style={styles.transportRow}>
          <Text style={styles.transportIcon}>🚌</Text>
          <Text style={styles.transportText}>Bus</Text>
        </View>
      </CardButton>

      {(selectedTransport === 'Bus' || selectedTransport === 'CNG') && (
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
          title='Next'
          onPress={handleNext}
          style={{ width: '30%' }}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    width: '100%',
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transportIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  transportText: {
    fontSize: 16,
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


