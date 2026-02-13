import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StyledText as Text } from '../components/StyledText';
import { StyledButton as Button } from '../components/StyledButton';
import { useLocalSearchParams } from 'expo-router';

export default function RemovePassengerScreen() {
  const params = useLocalSearchParams();
  let passenger = {};
  if (params.passenger) {
    try {
      passenger = typeof params.passenger === 'string' && params.passenger.startsWith('{')
        ? JSON.parse(params.passenger)
        : params.passenger;
    } catch (e) {
      passenger = params.passenger;
    }
  }
  const rideId = params.rideId;
  const [reason, setReason] = useState('');
  const [reportPrompt, setReportPrompt] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Remove Passenger</Text>
      <Text style={styles.subtitle}>Why are you removing {passenger?.name || passenger?.username || passenger?.handle}?</Text>
      <Button title="No-show" onPress={() => { setReason('No-show'); setReportPrompt(true); }} style={styles.button} />
      <Button title="Misbehavior" onPress={() => { setReason('Misbehavior'); setReportPrompt(true); }} style={styles.button} />
      <Button title="Payment issue" onPress={() => { setReason('Payment issue'); setReportPrompt(true); }} style={styles.button} />
      <Button title="Other" onPress={() => { setReason('Other'); setReportPrompt(true); }} style={styles.button} />
      {reportPrompt && (
        <View style={styles.reportPrompt}>
          <Text style={styles.subtitle}>Do you want to report this person?</Text>
          <Button title="Yes, report" onPress={() => {/* Placeholder: handle report */}} style={[styles.button, { backgroundColor: 'red' }]} />
          <Button title="No" onPress={() => {/* Placeholder: finish removal */}} style={styles.button} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 16, marginBottom: 12 },
  button: { marginBottom: 8, width: 200 },
  reportPrompt: { marginTop: 24, alignItems: 'center' },
});
