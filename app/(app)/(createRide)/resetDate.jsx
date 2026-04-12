import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useHideTabBar } from '../../../hooks/useHideTabBar';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledTitle as Title } from '../../../components/StyledTitle';
import { StyledCardButton as CardButton } from '../../../components/StyledCardButton';
import { StyledNavigatorButton as Button } from '../../../components/StyledNavigatorButton';
import { useRouter } from 'expo-router';
import { useRide } from '../../../context/RideContext';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import RideCard from '../../../components/RideDisplayCard';
import { Ionicons } from '@expo/vector-icons';

export default function TimeDetails() {
  useHideTabBar();
  const router = useRouter();
  const { rideData, setRideData } = useRide();
  const [selection, setSelection] = useState('now');
  const [date, setDate] = useState(rideData.fullDate ? new Date(rideData.fullDate) : null);
  const [showDatePicker, setShowDatePicker] = useState(false);


  const handleNext = () => {
    if (selection === 'now') {
      const now = new Date();
      const day = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
      const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
      setRideData({ ...rideData, date: { day, time }, fullDate: now.toISOString() });
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
    setRideData({ ...rideData, date: { day, time }, fullDate: currentDate.toISOString() });
    setShowDatePicker(false);
  };

  const formatScheduled = (d) => {
    if (!d) return 'Schedule for later';
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
  };
  

  return (
    <ScrollView>
      <Title>Your trip</Title>

      <RideCard create={true} ride={rideData} />

      <Title>Departure time</Title>

      <CardButton
        onPress={() => {
          setSelection('now');
          setDate(null);
          setRideData({ ...rideData, date: { day: '', time: '' }, fullDate: null });
        }}
        style={selection === 'now' ? styles.selectedCard : {}}
      >
        <Text style={[styles.timeText, selection === 'now' ? { fontWeight: 'semibold', color: '#fff' } : {}]}>Leave now</Text>
      </CardButton>

      <CardButton
        onPress={() => {
          setSelection('later');
          setShowDatePicker(true);
        }}
        style={selection === 'later' ? styles.selectedCard : {}}
      >
        {selection === 'later' && date ? (
          <View style={styles.scheduledRow}>
            <Ionicons name="calendar-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={[styles.timeText, { color: '#fff', fontWeight: 'semibold' }]}>{formatScheduled(date)}</Text>
          </View>
        ) : (
          <Text style={[styles.timeText, selection === 'later' ? { fontWeight: 'semibold', color: '#fff' } : {}]}>Schedule for later</Text>
        )}
      </CardButton>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="datetime"
        date={date || new Date()}
        onConfirm={onDateChange}
        onCancel={() => setShowDatePicker(false)}
      />

      <View style={styles.buttonRow}>
        <Button
          title='Back'
          onPress={() => router.back()}
          style={{ width: '30%' }}
        ></Button>

        {selection && (
          <Button
            title='Next'
            back={false}
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
    backgroundColor: '#1f1f1f',
    borderColor: '#1f1f1f',
  },
  scheduledRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
