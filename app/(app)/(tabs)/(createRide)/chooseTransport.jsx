import React, { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView';
import { StyledText as Text } from '../../../../components/StyledText';
import { StyledTitle as Title } from '../../../../components/StyledTitle';
import { StyledCardButton as CardButton } from '../../../../components/StyledCardButton';
import RideCard from '../../../../components/RideDisplayCard';
import { StyledNavigatorButton as NavButton } from '../../../../components/StyledNavigatorButton';
import { useRouter } from 'expo-router';
import { useRide } from '../../../../context/RideContext';
import Entypo from '@expo/vector-icons/Entypo';

export default function ChooseTransport() {
  const router = useRouter();
  const { rideData, setRideData } = useRide();
  const scrollViewRef = useRef(null);
  const fareInputRef = useRef(null);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const transportOptions = ['Uber', 'Pathao', 'Private Car', 'Other'];
  const [fareEstimate, setFareEstimate] = useState('');

  const handleNext = () => {
    let fareValue = fareEstimate.trim();
    if (fareValue === '' || isNaN(fareValue) || parseFloat(fareValue) < 0) {
      fareValue = 'TBA';
    } else {
      fareValue = parseFloat(fareValue).toFixed(2); // Format to 2 decimal places
    }

    setRideData({ ...rideData, transport: selectedTransport, fare: fareValue });

    router.push('/ridePreferences');
  };

  const handleFareInputFocus = () => {
    // Scroll to ensure input is visible when keyboard appears
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 50 }}
      >
      <Title>Your trip</Title>

      <RideCard create={true} ride={rideData} />

      <Title>Select transport</Title>

      <CardButton onPress={() => setShowOptions(!showOptions)} style={transportOptions.includes(selectedTransport) ? styles.selectedCard : {}}>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          <View style={styles.transportRow}>
            <Text style={styles.transportIcon}>🚗</Text>
            <Text style={[styles.transportText, transportOptions.includes(selectedTransport) ? {fontWeight: 'semibold', color: '#fff'} : {}]}>{selectedTransport && transportOptions.includes(selectedTransport) ? selectedTransport : 'Car'}</Text>
          </View>
          <Entypo name={showOptions ? "chevron-up" : "chevron-down"} size={18} color={transportOptions.includes(selectedTransport) ? "#fff" : "black"} />
        </View>
      </CardButton>

      {showOptions && ( <>
        <Title style={{fontSize: 20}}>Choose a service:</Title>
        <View style={styles.gridContainer}>
          {transportOptions.map((option) => (
          <CardButton key={option} 
            onPress={() => setSelectedTransport(option)}
            style={[styles.gridItem, selectedTransport === option ? styles.selectedCard : {}]}>
              <Text style={[styles.transportText, selectedTransport === option ? {fontWeight: 'semibold', color: '#fff'} : {}]}>{option}</Text>
          </CardButton>
        ))}
        </View></>
      )}

      <CardButton onPress={() => {setSelectedTransport('CNG'); setShowOptions(false);}} style={selectedTransport === 'CNG' ? styles.selectedCard : {}}>
        <View style={styles.transportRow}>
          <Text style={styles.transportIcon}>🛺</Text>
          <Text style={[styles.transportText, selectedTransport === 'CNG' ? {fontWeight: 'semibold', color: '#fff'} : {}]}>CNG</Text>
        </View>
      </CardButton>
      <CardButton onPress={() => {setSelectedTransport('Bus'); setShowOptions(false);}} style={selectedTransport === 'Bus' ? styles.selectedCard : {}}>
        <View style={styles.transportRow}>
          <Text style={styles.transportIcon}>🚌</Text>
          <Text style={[styles.transportText, selectedTransport === 'Bus' ? {fontWeight: 'semibold', color: '#fff'} : {}]}>Bus</Text>
        </View>
      </CardButton>

      {selectedTransport && (
        <>
        <Title>Fare (optional)</Title>

        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10,}}>
          <TextInput
            ref={fareInputRef}
            style={styles.fareInput}
            placeholder='Enter fare...'
            keyboardType='numeric'
            value={fareEstimate}
            onChangeText={(text) => setFareEstimate(text.replace(/[^0-9.]/g, ''))}
            onFocus={handleFareInputFocus}
          ></TextInput>
          <Text style={{marginLeft: 10}}>BDT</Text>
        </View>
        </>
      )}
      
      <View style={styles.buttonRow}>
      <NavButton
          onPress={() => router.back()}
          style={{ width: '25%' }}
        />
        {selectedTransport && (
        <NavButton
          onPress={() => handleNext()}
          back={false}
          style={{ width: '25%' }}
        />
        )}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
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
    marginTop: 20,
    marginBottom: 10,
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
    backgroundColor: '#1f1f1f',
    borderColor: '#1f1f1f',
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
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '47%',
    marginBottom: 10,
  }
})


