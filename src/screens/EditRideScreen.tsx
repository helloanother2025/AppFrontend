import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationDisplay } from '../components/LocationDisplay';
import { MapRouteCard } from '../components/MapRouteCard';
import { StyledDateTimePicker } from '../components/StyledDateTimePicker';
import { ScreenShell } from '../components/ScreenShell';
import { formatRideDate, transportEmoji, type GenderPreference, type NormalizedRide } from '../utils/rideMapper';
import { useAppContext } from '../context/AppContext';
import type { RouteMetrics } from '../types/map';
import { colors } from '../theme';
import { useRide } from '../context/RideContext';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTime(dateValue: string, timeValue: string) {
  const parsed = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

const genderOptions: GenderPreference[] = ['Any', 'Male', 'Female'];

export function EditRideScreen() {
  const { darkMode } = useAppContext();
  const { getRideDetails, updateRide, loading: rideContextLoading } = useRide();
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();

  const rideIdValue = useMemo(() => (Array.isArray(rideId) ? rideId[0] : rideId), [rideId]);
  const [ride, setRide] = useState<NormalizedRide | null>(null);
  const [isLoadingRide, setIsLoadingRide] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState(1);
  const [fare, setFare] = useState<number | ''>('');
  const [fareSkip, setFareSkip] = useState(false);
  const [genderPref, setGenderPref] = useState<GenderPreference>('Any');
  const [transportDetail, setTransportDetail] = useState('');
  const [notes, setNotes] = useState('');
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [saved, setSaved] = useState(false);
  const dateValue = date ? parseDateTime(date, '12:00') : new Date();
  const timeValue = date && time ? parseDateTime(date, time) : new Date();

  useEffect(() => {
    const loadRide = async () => {
      if (!rideIdValue) {
        setErrorText('Missing ride id');
        setIsLoadingRide(false);
        return;
      }

      setIsLoadingRide(true);
      setErrorText(null);

      try {
        const data = await getRideDetails(rideIdValue);
        if (!data) {
          setErrorText('Ride not found');
          return;
        }
        setRide(data);
      } catch (err: any) {
        setErrorText(err?.message || 'Failed to load ride');
      } finally {
        setIsLoadingRide(false);
      }
    };

    loadRide();
  }, [getRideDetails, rideIdValue]);

  useEffect(() => {
    if (!ride) return;

    const initialStartTime = ride.startTime || ride.departureTime;
    const initialDate = initialStartTime?.split('T')[0] || toDateInputValue(new Date());
    const initialTime = initialStartTime?.split('T')[1]?.slice(0, 5) || toTimeInputValue(new Date());

    setDate(initialDate);
    setTime(initialTime);
    setSeats(ride.seats || 1);
    setFare(ride.fare ?? '');
    setFareSkip(ride.fare == null);
    setGenderPref(ride.genderPreference || 'Any');
    setTransportDetail(ride.transportDetail ?? '');
    setNotes(ride.notes ?? '');
    setRouteMetrics(null);
  }, [ride]);

  const hasChanges = useMemo(() => {
    if (!ride) return false;

    const nextStartTime = parseDateTime(date, time).toISOString();
    const currentStartTime = ride.startTime || ride.departureTime;
    const nextFare = fareSkip ? null : Number(fare);

    return (
      nextStartTime !== currentStartTime ||
      seats !== ride.seats ||
      nextFare !== ride.fare ||
      genderPref !== ride.genderPreference ||
      transportDetail.trim() !== (ride.transportDetail ?? '') ||
      notes.trim() !== (ride.notes ?? '')
    );
  }, [date, fare, fareSkip, genderPref, notes, ride, seats, time, transportDetail]);

  const acceptedPassengers = ride?.currentPassengers ?? 0;

  const handleSave = async () => {
    if (!ride) return;

    const nextStartTime = parseDateTime(date, time);
    if (ride.status === 'unactive' && nextStartTime.getTime() <= Date.now()) {
      Alert.alert('Invalid departure', 'Please choose a future departure date and time.');
      return;
    }

    setSaveLoading(true);
    try {
      const updated = await updateRide(ride.id, {
        startTime: nextStartTime.toISOString(),
        availableSeats: seats,
        fare: fareSkip ? null : Number(fare),
        genderPreference: genderPref,
        transportDetail: transportDetail.trim() || undefined,
        notes: notes.trim(),
      });

      if (!updated) {
        throw new Error('Failed to update ride');
      }

      setSaved(true);
      setTimeout(() => {
        router.back();
      }, 1200);
    } catch (err: any) {
      Alert.alert('Failed to update ride', err?.message || 'Something went wrong.');
    } finally {
      setSaveLoading(false);
    }
  };

  const cardBg = darkMode ? colors.cardDark : '#FFFFFF';
  const cardBorder = darkMode ? colors.borderDark : '#E5E7EB';
  const textPrimary = darkMode ? colors.textPrimaryDark : '#111827';
  const textSecondary = darkMode ? colors.textSecondaryDark : '#6B7280';

  const handleDateChange = (selectedDate: Date) => {
    setDate(toDateInputValue(selectedDate));
  };

  const handleTimeChange = (selectedTime: Date) => {
    setTime(toTimeInputValue(selectedTime));
  };

  if (isLoadingRide || (rideContextLoading && !ride)) {
    return (
      <ScreenShell scroll={false}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading ride...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (errorText || !ride) {
    return (
      <ScreenShell scroll={false}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>{errorText || 'Ride not found'}</Text>
          <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  if (saved) {
    return (
      <ScreenShell scroll={false}>
        <View style={styles.successWrap}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={32} color="#16A34A" />
          </View>
          <Text style={[styles.successTitle, { color: textPrimary }]}>Ride updated!</Text>
          <Text style={[styles.successText, { color: textSecondary }]}>All passengers have been notified.</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell scroll={false}>
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: cardBorder }]}> 
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={textSecondary} />
          <Text style={[styles.backText, { color: textSecondary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Edit Ride</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
          <Text style={styles.routeLabel}>Route (cannot be changed)</Text>
          <LocationDisplay from={ride.from.shortName} to={ride.to.shortName} compact />
          <MapRouteCard from={ride.from} to={ride.to} title="Current route" height={170} onMetricsChange={setRouteMetrics} />
          <View style={styles.routeMeta}>
            <Text style={styles.routeMetaEmoji}>{transportEmoji[ride.transport]}</Text>
            <Text style={[styles.routeMetaText, { color: textSecondary }]}>{ride.transport}</Text>
            <Text style={[styles.routeMetaText, { color: textSecondary }]}>• {formatRideDate(ride.departureTime).day} {formatRideDate(ride.departureTime).time}</Text>
            {routeMetrics ? (
              <Text style={[styles.routeMetaText, { color: textSecondary }]}>• {routeMetrics.distanceKm.toFixed(1)} km</Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
          <View style={styles.sectionTitleRow}>
            <Ionicons name="time-outline" size={16} color={colors.brand} />
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Departure Time</Text>
          </View>
          <View style={styles.pickerStack}> 
            <StyledDateTimePicker
              text="Pick date"
              value={dateValue}
              mode="date"
              onChange={handleDateChange}
              minimumDate={new Date()}
              style={styles.pickerWrap}
            />
            <StyledDateTimePicker
              text="Pick time"
              value={timeValue}
              mode="time"
              onChange={handleTimeChange}
              minimumDate={date === toDateInputValue(new Date()) ? new Date() : undefined}
              style={styles.pickerWrap}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
          <View style={styles.seatsHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="people-outline" size={16} color={colors.brand} />
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Available Seats</Text>
            </View>
            <View style={styles.seatControlRow}>
              <Pressable
                onPress={() => setSeats(Math.max(ride.currentPassengers, seats - 1))}
                style={styles.seatStepButton}
              >
                <Text style={styles.seatStepText}>-</Text>
              </Pressable>
              <Text style={[styles.seatCount, { color: textPrimary }]}>{seats}</Text>
              <Pressable onPress={() => setSeats(Math.min(12, seats + 1))} style={styles.seatStepButton}>
                <Text style={styles.seatStepText}>+</Text>
              </Pressable>
            </View>
          </View>
          <Text style={[styles.helperText, { color: '#9CA3AF' }]}>Minimum: {ride.currentPassengers} (accepted participants)</Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
          <View style={styles.fareHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="card-outline" size={16} color={colors.brand} />
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Fare (BDT)</Text>
            </View>
            <Pressable onPress={() => setFareSkip((prev) => !prev)} style={styles.setLaterToggle}>
              <View style={[styles.setLaterBox, fareSkip ? styles.setLaterBoxActive : null]}>
                {fareSkip ? <Text style={styles.setLaterTick}>✓</Text> : null}
              </View>
              <Text style={[styles.setLaterText, { color: fareSkip ? colors.brand : textSecondary }]}>Set later</Text>
            </Pressable>
          </View>

          {!fareSkip ? (
            <TextInput
              value={fare === '' ? '' : String(fare)}
              onChangeText={(value) => {
                const cleaned = value.replace(/[^0-9]/g, '');
                setFare(cleaned ? Number(cleaned) : '');
              }}
              keyboardType="numeric"
              style={styles.textInput}
              placeholder="Enter total fare"
              placeholderTextColor="#9CA3AF"
            />
          ) : (
            <Text style={[styles.helperText, { color: textSecondary }]}>Fare will be communicated to riders later</Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Gender Preference</Text>
          <View style={styles.genderRow}>
            {genderOptions.map((option) => (
              <Pressable
                key={option}
                onPress={() => setGenderPref(option)}
                style={[
                  styles.genderChip,
                  genderPref === option ? styles.genderChipActive : styles.genderChipIdle,
                ]}
              >
                <Text style={genderPref === option ? styles.genderChipActiveText : styles.genderChipIdleText}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Transport Detail (optional)</Text>
          <TextInput
            value={transportDetail}
            onChangeText={setTransportDetail}
            style={styles.textInput}
            placeholder="e.g. Toyota Allion - Dhaka Metro Ga-11-1234"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
          <View style={styles.sectionTitleRow}>
            <Ionicons name="document-text-outline" size={16} color={colors.brand} />
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Notes for Riders</Text>
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            style={styles.notesInput}
            multiline
            placeholder="e.g. Pick up at main gate. Be on time!"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.notifyCard}>
          <Text style={styles.notifyEmoji}>?</Text>
          <Text style={styles.notifyText}>
            {acceptedPassengers > 0
              ? `All ${acceptedPassengers} accepted passenger(s) will be notified about these updates.`
              : 'Accepted passengers will be notified about these updates.'}
          </Text>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={!hasChanges || saveLoading}
          style={[styles.primaryButton, (!hasChanges || saveLoading) ? styles.primaryButtonDisabled : null]}
        >
          <Text style={styles.primaryButtonText}>{saveLoading ? 'Saving...' : 'Save Changes & Notify Passengers'}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  routeLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  routeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  routeMetaEmoji: {
    fontSize: 14,
  },
  routeMetaText: {
    fontSize: 11,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerStack: {
    gap: 8,
  },
  pickerWrap: {
    flex: 1,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  colBlock: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111111',
    backgroundColor: '#FFFFFF',
  },
  strongInput: {
    borderColor: colors.brand,
    color: colors.brand,
  },
  seatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seatControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seatStepButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatStepText: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 18,
  },
  seatCount: {
    width: 26,
    textAlign: 'center',
    fontSize: 21,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  fareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setLaterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setLaterBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setLaterBoxActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  setLaterTick: {
    color: '#FFFFFF',
    fontSize: 9,
    lineHeight: 9,
  },
  setLaterText: {
    fontSize: 12,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 2,
    paddingVertical: 10,
    alignItems: 'center',
  },
  genderChipActive: {
    borderColor: colors.brand,
    backgroundColor: '#FFF0F2',
  },
  genderChipIdle: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  genderChipActiveText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '600',
  },
  genderChipIdleText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111111',
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },
  notifyCard: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  notifyEmoji: {
    fontSize: 15,
    lineHeight: 18,
  },
  notifyText: {
    flex: 1,
    color: '#B45309',
    fontSize: 12,
    lineHeight: 17,
  },
  primaryButton: {
    backgroundColor: colors.brand,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  successText: {
    fontSize: 13,
  },
});
