
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledTitle as Title } from '../../../components/StyledTitle';
import { StyledCardButton as CardButton } from '../../../components/StyledCardButton';
import { StyledButton as Button } from '../../../components/StyledButton';
import { useRouter } from 'expo-router';
import { useRide } from '../../../context/RideContext';
import { StyledDateTimePicker } from '../../../components/StyledDateTimePicker';
import RideCard from '../../../components/RideDisplayCard';

export default function TimeDetails() {
  const router = useRouter();
  const { rideData, setRideData } = useRide();
  const [selection, setSelection] = useState('now');
  const [date, setDate] = useState(null);


  const handleNext = () => {
    if (selection === 'now') {
      const now = new Date();
      const day = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
      const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
      setRideData({ ...rideData, date: { day, time } });
    } else if (selection === 'later') {
      if (!rideData.date.day || !rideData.date.time) {
        alert('Please select a date and time');
        return;
      }
    }
    router.push('/(createRide)/rideCreated');
  };

  const onDateChange = (selectedDate) => {
    const currentDate = selectedDate || date;
    setDate(currentDate);
    const day = currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    const time = currentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    setRideData({ ...rideData, date: { day, time } });
  };
  

  return (
    <ScrollView>
      <Title>Your trip</Title>

      <RideCard create={true} ride={rideData} />

      <Title>Departure time</Title>

      <CardButton onPress={() => setSelection('now')} style={selection === 'now' ? styles.selectedCard : {}}>
        <Text style={styles.timeText}>Leave now</Text>
      </CardButton>
      <CardButton onPress={() => setSelection('later')} style={selection === 'later' ? styles.selectedCard : {}}>
        <Text style={styles.timeText}>Schedule for later</Text>
      </CardButton>

      {selection === 'later' && (
        <StyledDateTimePicker
        style={{width: '100%'}}
          value={date}
          mode="datetime"
          onChange={onDateChange}
        />
      )}

      <View style={styles.buttonRow}>
        <Button
          title='Back'
          onPress={() => router.back()}
          style={{ width: '30%' }}
        ></Button>

        {selection && (
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    width: '100%',
  },
  timeText: {
    flex: 1,
    fontSize: 16
  },
  selectedCard: {
    fontWeight: 'bold',
    borderWidth: 2,
    borderColor: '#000',
  }
})
