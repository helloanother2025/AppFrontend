import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { LocationDisplay } from '../components/LocationDisplay';
import { MapRouteCard } from '../components/MapRouteCard';
import { StyledDateTimePicker } from '../components/StyledDateTimePicker';
import { RouteLocationPickerModal } from '../components/RouteLocationPickerModal';
import { ScreenShell } from '../components/ScreenShell';
import { UserAvatar } from '../components/UserAvatar';
import { useAppContext } from '../context/AppContext';
import {
  transportEmoji,
  type GenderPreference,
  type Ride,
  type RideLocation,
  type TransportMode,
} from '../utils/rideMapper';
import type { RouteMetrics } from '../types/map';
import { colors } from '../theme';
import { useRide } from '../context/RideContext';
import { useUser } from '../context/UserContext';


type Step = 1 | 2 | 3 | 4 | 5;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseScheduledDateTime(dateValue: string, timeValue: string) {
  const parsed = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatScheduledDateTime(value: Date) {
  const dateString = value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeString = value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dateString}, ${timeString}`;
}

const transportOptions: { mode: TransportMode; emoji: string; label: string; placeholder: string }[] = [
  { mode: 'Car', emoji: '🚗', label: 'Car', placeholder: 'e.g. Toyota Allion - Dhaka Metro Ga-11-1234' },
  { mode: 'CNG', emoji: '🛺', label: 'CNG / Auto', placeholder: 'e.g. Shared CNG from Board Bazar' },
  { mode: 'Bus', emoji: '🚌', label: 'Bus', placeholder: 'e.g. BRTC Bus - Route 17' },
  { mode: 'Bike', emoji: '🏍', label: 'Bike', placeholder: 'e.g. Yamaha FZS' },
  { mode: 'Microbus', emoji: '🚐', label: 'Microbus', placeholder: 'e.g. Shared Microbus - Uttara to Gulistan' },
  { mode: 'Rickshaw', emoji: '🚲', label: 'Rickshaw', placeholder: 'e.g. Cycle rickshaw - short route only' },
  { mode: 'Other', emoji: '🚕', label: 'Other', placeholder: 'Describe the transport...' },
];

const seatLimits: Record<TransportMode, number> = {
  Car: 4,
  CNG: 2,
  Bus: 99,
  Bike: 1,
  Microbus: 7,
  Rickshaw: 1,
  Other: 12,
};

const genderOptions: GenderPreference[] = ['Any', 'Male', 'Female'];
const CREATE_RIDE_DRAFT_KEY = 'createRideDraft';

type CreateRideDraft = {
  step: Step;
  fromInput: string;
  toInput: string;
  fromLocation: RideLocation | null;
  toLocation: RideLocation | null;
  routeMetrics: RouteMetrics | null;
  departureType: 'now' | 'schedule';
  scheduledDate: string;
  scheduledTime: string;
  transport: TransportMode;
  transportDetail: string;
  seats: number;
  paymentSplit: 'equal' | 'distance';
  fareSkip: boolean;
  fare: number;
  genderPref: GenderPreference;
  notes: string;
};

function NavButtons({
  onBack,
  onNext,
  nextLabel = 'Next',
  backLabel = 'Back',
  nextDisabled = false,
  darkMode,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  darkMode: boolean;
}) {
  return (
    <View style={styles.navButtonsRow}>
      <Pressable onPress={onBack} style={[styles.navBackButton, { backgroundColor: darkMode ? '#2A2A2A' : '#F3F4F6' }]}>
        <View style={styles.navButtonInner}>
          <Ionicons name="chevron-back" size={16} color={darkMode ? '#D1D5DB' : '#555555'} />
          <Text style={[styles.navBackText, { color: darkMode ? '#D1D5DB' : '#555555' }]}>{backLabel}</Text>
        </View>
      </Pressable>

      <Pressable disabled={nextDisabled} onPress={onNext} style={[styles.navNextButton, { backgroundColor: colors.brand }, nextDisabled ? styles.disabled : null]}>
        <View style={styles.navButtonInner}>
          <Text style={styles.navNextText}>{nextLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

export function CreateRideScreen() {
  const { isDemoMode, darkMode } = useAppContext();
  const { createRide, loading: submitting, myRides } = useRide();
  const { user: currentUser } = useUser();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(1);
  const [showRoutePicker, setShowRoutePicker] = useState(false);

  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [fromLocation, setFromLocation] = useState<RideLocation | null>(null);
  const [toLocation, setToLocation] = useState<RideLocation | null>(null);
  const [draftFrom, setDraftFrom] = useState<RideLocation | null>(null);
  const [draftTo, setDraftTo] = useState<RideLocation | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<any | null>(null);


  const [departureType, setDepartureType] = useState<'now' | 'schedule'>('schedule');
  const [scheduledDate, setScheduledDate] = useState(() => toDateInputValue(new Date()));
  const [scheduledTime, setScheduledTime] = useState('08:30');

  const [transport, setTransport] = useState<TransportMode>('Car');
  const [transportDetail, setTransportDetail] = useState('');

  const [seats, setSeats] = useState(2);
  const [paymentSplit, setPaymentSplit] = useState<'equal' | 'distance'>('equal');
  const [fareSkip, setFareSkip] = useState(false);
  const [fare, setFare] = useState(500);
  const [genderPref, setGenderPref] = useState<GenderPreference>('Any');
  const [notes, setNotes] = useState('');
  const [savedDraft, setSavedDraft] = useState<CreateRideDraft | null>(null);

  const pastRides = useMemo(() => myRides.slice(0, 3), [myRides]);

  const today = new Date();
  const resetForm = useCallback(() => {
    setStep(1);
    setShowRoutePicker(false);
    setFromInput('');
    setToInput('');
    setFromLocation(null);
    setToLocation(null);
    setDraftFrom(null);
    setDraftTo(null);
    setRouteMetrics(null);
    setDepartureType('schedule');
    setScheduledDate(toDateInputValue(today));
    setScheduledTime('08:30');
    setTransport('Car');
    setTransportDetail('');
    setSeats(2);
    setPaymentSplit('equal');
    setFareSkip(false);
    setFare(500);
    setGenderPref('Any');
    setNotes('');
    setSavedDraft(null);
  }, []);

  // When the screen is re-focused after a successful ride creation (step 5),
  // reset everything so the next session starts clean from step 1.
  useFocusEffect(
    useCallback(() => {
      setStep((current) => {
        if (current === 5) {
          resetForm();
          return 1;
        }
        return current;
      });
    }, [resetForm])
  );


  const displayFrom = fromLocation?.shortName || fromInput || 'Starting location';
  const displayTo = toLocation?.shortName || toInput || 'Destination';
  const scheduledISO = `${scheduledDate}T${scheduledTime}`;
  const displayTime = departureType === 'now' ? 'Leave now' : formatScheduledDateTime(parseScheduledDateTime(scheduledDate, scheduledTime));
  const scheduledDateValue = parseScheduledDateTime(scheduledDate, '12:00');
  const scheduledTimeValue = parseScheduledDateTime(scheduledDate, scheduledTime);
  const step1Valid = Boolean(fromLocation && toLocation);
  const scheduledAt = departureType === 'schedule' ? parseScheduledDateTime(scheduledDate, scheduledTime) : null;
  const scheduleValid = departureType === 'now' || (scheduledAt !== null && scheduledAt.getTime() > Date.now());
  const step2Valid = scheduleValid;
  const perSeatFare = Math.max(0, Math.round(fare / Math.max(1, seats)));

  const currentTransportPlaceholder = useMemo(
    () => transportOptions.find((t) => t.mode === transport)?.placeholder || 'Transport details',
    [transport]
  );
  const surface = darkMode ? colors.cardDark : '#FFFFFF';
  const surfaceMuted = darkMode ? colors.bgDark : '#F9FAFB';
  const line = darkMode ? colors.borderDark : '#E5E7EB';
  const textPrimary = darkMode ? colors.textPrimaryDark : '#111111';
  const textSecondary = darkMode ? colors.textSecondaryDark : '#6B7280';

  const goNext = async () => {
    if (step === 4 && isDemoMode) {
      Alert.alert('Sign in required', 'Please sign in to create rides.');
      router.push('/Login');
      return;
    }

    if (step === 4) {
      if (!fromLocation || !toLocation) {
        Alert.alert('Error', 'Missing location data');
        return;
      }

      if (departureType === 'schedule') {
        const scheduledAt = parseScheduledDateTime(scheduledDate, scheduledTime);
        if (scheduledAt.getTime() <= Date.now()) {
          // Should never reach here since step 2 blocks it, but guard anyway
          Alert.alert('Invalid schedule', 'Please go back and choose a future date and time.');
          return;
        }
      }

      try {
        const rideData = {
          startLocation: {
            name: fromLocation.name || fromLocation.shortName || fromInput || 'Start',
            lat: fromLocation.coords?.lat ?? fromLocation.lat,
            lng: fromLocation.coords?.lng ?? fromLocation.lng,
          },
          endLocation: {
            name: toLocation.name || toLocation.shortName || toInput || 'Destination',
            lat: toLocation.coords?.lat ?? toLocation.lat,
            lng: toLocation.coords?.lng ?? toLocation.lng,
          },
          startTime: departureType === 'now' ? new Date().toISOString() : new Date(scheduledISO).toISOString(),
          transportMode: transport,
          transportDetail: transportDetail.trim() || undefined,
          availableSeats: seats,
          fare: fareSkip ? 0 : fare,
          genderPreference: genderPref,
          notes: notes,
          routePolyline: routeMetrics?.polyline || '',
        };


        await createRide(rideData);
        await SecureStore.deleteItemAsync(CREATE_RIDE_DRAFT_KEY);
        setSavedDraft(null);
        setStep(5);
      } catch (err: any) {
        Alert.alert('Failed to create ride', err?.message || 'Something went wrong.');
      }
      return;
    }

    if (step < 5) {
      setStep((prev) => (prev + 1) as Step);
      return;
    }

    router.push('/(app)/ride-status');
  };


  const goBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
      return;
    }

    router.back();
  };

  const renewFromRide = (ride: Ride) => {
    setFromInput(ride.from.shortName);
    setToInput(ride.to.shortName);
    setFromLocation(ride.from);
    setToLocation(ride.to);
    setRouteMetrics(null);
    setTransport(ride.transport);
    setTransportDetail(ride.transportDetail || '');
    setSeats(ride.seats);
    setFare(ride.fare || 500);
    setGenderPref(ride.genderPreference);
    setNotes(ride.notes || '');
  };

  const applyDraft = (draft: CreateRideDraft) => {
    setStep(Math.min(4, Math.max(1, draft.step || 1)) as Step);
    setFromInput(draft.fromInput || '');
    setToInput(draft.toInput || '');
    setFromLocation(draft.fromLocation || null);
    setToLocation(draft.toLocation || null);
    setDraftFrom(draft.fromLocation || null);
    setDraftTo(draft.toLocation || null);
    setRouteMetrics(draft.routeMetrics || null);
    setDepartureType(draft.departureType || 'schedule');
    setScheduledDate(draft.scheduledDate || '2026-04-16');
    setScheduledTime(draft.scheduledTime || '08:30');
    setTransport(draft.transport || 'Car');
    setTransportDetail(draft.transportDetail || '');
    const draftTransport = draft.transport || 'Car';
    setSeats(Math.min(seatLimits[draftTransport] ?? 12, Math.max(1, draft.seats || 2)));
    setPaymentSplit(draft.paymentSplit || 'equal');
    setFareSkip(Boolean(draft.fareSkip));
    setFare(Number.isFinite(draft.fare) ? draft.fare : 500);
    setGenderPref(draft.genderPref || 'Any');
    setNotes(draft.notes || '');
  };

  const buildDraft = (): CreateRideDraft => ({
    step,
    fromInput,
    toInput,
    fromLocation,
    toLocation,
    routeMetrics,
    departureType,
    scheduledDate,
    scheduledTime,
    transport,
    transportDetail,
    seats,
    paymentSplit,
    fareSkip,
    fare,
    genderPref,
    notes,
  });

  const saveDraft = async () => {
    try {
      const draft = buildDraft();
      await SecureStore.setItemAsync(CREATE_RIDE_DRAFT_KEY, JSON.stringify(draft));
      setSavedDraft(draft);
      Alert.alert('Draft saved', 'Your ride draft has been saved locally.');
    } catch {
      Alert.alert('Could not save draft', 'Please try again.');
    }
  };

  const handleScheduledDateChange = (selectedDate: Date) => {
    setScheduledDate(toDateInputValue(selectedDate));
  };

  const handleScheduledTimeChange = (selectedTime: Date) => {
    setScheduledTime(toTimeInputValue(selectedTime));
  };

  const clearDraft = async () => {
    try {
      await SecureStore.deleteItemAsync(CREATE_RIDE_DRAFT_KEY);
      setSavedDraft(null);
      Alert.alert('Draft cleared', 'Saved draft removed.');
    } catch {
      Alert.alert('Could not clear draft', 'Please try again.');
    }
  };

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const raw = await SecureStore.getItemAsync(CREATE_RIDE_DRAFT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as CreateRideDraft;
        setSavedDraft(parsed);
      } catch {
        // Ignore malformed drafts.
      }
    };

    loadDraft();
  }, []);

  return (
    <ScreenShell scroll={false}>
      <View style={styles.root}>
        <View style={styles.headerRow}>
          <Pressable onPress={goBack} style={[styles.backIconButton, { backgroundColor: darkMode ? '#2A2A2A' : '#F3F4F6' }]}>
            <Ionicons name="chevron-back" size={18} color={textSecondary} />
          </Pressable>

          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{step === 5 ? 'Ride Created!' : 'Create a Ride'}</Text>
          </View>

          <View style={styles.renewPlaceholder} />
        </View>

        {step < 5 ? (
          <View style={styles.headerActionsRow}>
            <Pressable onPress={saveDraft} style={styles.saveDraftButton}>
              <Ionicons name="save-outline" size={12} color="#FFFFFF" />
              <Text style={styles.saveDraftButtonText}>Save Draft</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.progressRow}>
          {[1, 2, 3, 4, 5].map((value) => (
            <View key={value} style={[styles.progressSegment, { backgroundColor: value <= step ? colors.brand : (darkMode ? colors.borderDark : '#EEEEEE') }]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {savedDraft && step < 5 ? (
            <View style={[styles.draftBanner, { backgroundColor: surfaceMuted, borderColor: line }]}> 
              <View style={styles.draftBannerLeft}>
                <Ionicons name="document-text-outline" size={14} color="#6B7280" />
                <Text style={[styles.draftBannerText, { color: textPrimary }]}>Saved draft found</Text>
              </View>
              <View style={styles.draftBannerActions}>
                <Pressable onPress={() => applyDraft(savedDraft)} style={styles.draftActionPill}>
                  <Text style={styles.draftActionText}>Resume</Text>
                </Pressable>
                <Pressable onPress={clearDraft} style={[styles.draftActionPill, styles.draftActionPillGhost]}>
                  <Text style={styles.draftActionGhostText}>Clear</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.stepBlock}>
              <Pressable
                style={[styles.whereSearch, { backgroundColor: surface, borderColor: line }]}
                onPress={() => {
                  setDraftFrom(fromLocation);
                  setDraftTo(toLocation);
                  setShowRoutePicker(true);
                }}
              >
                <Ionicons name="search" size={14} color={textSecondary} />
                <Text style={[styles.whereSearchText, { color: textSecondary }]}>Where to today?</Text>
              </Pressable>

              {(fromLocation || toLocation) ? (
                <Pressable
                  onPress={() => {
                    setDraftFrom(fromLocation);
                    setDraftTo(toLocation);
                    setShowRoutePicker(true);
                  }}
                  style={[styles.summaryMiniCard, { backgroundColor: surfaceMuted, borderColor: line }]}
                >
                  <LocationDisplay from={displayFrom} to={displayTo} compact />
                </Pressable>
              ) : null}

              {routeMetrics ? (
                <View style={styles.routeMetricsTag}>
                  <Text style={styles.routeMetricsText}>
                    Approx. {routeMetrics.distanceKm.toFixed(1)} km in {Math.round(routeMetrics.durationMin)} min
                  </Text>
                </View>
              ) : null}

              <Text style={[styles.inlineLabel, { marginBottom: 0 }]}>Renew a previous ride</Text>
              {pastRides.map((ride) => (
                <Pressable key={ride.id} onPress={() => renewFromRide(ride)} style={[styles.renewItem, { backgroundColor: surfaceMuted, borderColor: line }]}> 
                  <View style={styles.renewEmojiWrap}>
                    <Text style={styles.renewEmoji}>{transportEmoji[ride.transport as TransportMode]}</Text>

                  </View>
                  <View style={styles.renewCopyWrap}>
                    <Text style={styles.renewRouteText}>{ride.from.shortName}{' -> '}{ride.to.shortName}</Text>
                    <Text style={styles.renewMetaText}>{ride.transport} · BDT {ride.fare ?? 'TBD'} · {ride.seats} seats</Text>
                  </View>
                  <View style={styles.copyPill}>
                    <Ionicons name="refresh" size={10} color="#666666" />
                    <Text style={styles.copyPillText}>Copy</Text>
                  </View>
                </Pressable>
              ))}

              {!step1Valid ? <Text style={styles.helperText}>Choose both start and destination to continue</Text> : null}
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.stepBlock}>
              <View style={[styles.summaryMiniCard, { backgroundColor: surfaceMuted, borderColor: line }]}> 
                <View style={styles.summaryUserRow}>
                  <UserAvatar name={currentUser?.name || 'Guest'} size={32} />
                  <Text style={styles.summaryUserName}>{currentUser?.name || 'Guest'}</Text>
                </View>

                <LocationDisplay from={displayFrom} to={displayTo} compact />
              </View>

              <Text style={styles.sectionTitle}>When are you leaving?</Text>

              <Pressable
                onPress={() => setDepartureType('now')}
                style={[styles.optionCard, departureType === 'now' ? styles.optionCardSelected : null]}
              >
                <Text style={styles.optionTitle}>Leave now</Text>
                <Text style={styles.optionText}>Depart immediately</Text>
              </Pressable>

              <Pressable
                onPress={() => setDepartureType('schedule')}
                style={[styles.optionCard, departureType === 'schedule' ? styles.optionCardSelected : null]}
              >
                <Text style={styles.optionTitle}>Schedule for later</Text>
                <Text style={styles.optionText}>Pick date and time</Text>
              </Pressable>

              {departureType === 'schedule' ? (
                <View style={styles.schedulePickerRow}>
                  <StyledDateTimePicker
                    text="Pick date"
                    value={scheduledDateValue}
                    mode="date"
                    onChange={handleScheduledDateChange}
                    minimumDate={new Date()}
                    style={styles.schedulePickerWrap}
                  />

                  <StyledDateTimePicker
                    text="Pick time"
                    value={scheduledTimeValue}
                    mode="time"
                    onChange={handleScheduledTimeChange}
                    minimumDate={scheduledDate === toDateInputValue(new Date()) ? new Date() : undefined}
                    style={styles.schedulePickerWrap}
                  />
                </View>
              ) : null}

              {departureType === 'schedule' && scheduledDate && scheduledTime ? (
                <View
                  style={[
                    styles.departingTag,
                    {
                      backgroundColor: scheduleValid ? surfaceMuted : 'rgba(220,38,38,0.07)',
                      borderColor: scheduleValid ? line : '#FCA5A5',
                    },
                  ]}
                >
                  <Text style={[styles.departingTagText, { color: scheduleValid ? textPrimary : '#DC2626' }]}>
                    {scheduleValid
                      ? `Departing: ${displayTime}`
                      : `⚠ Pick valid date/time`}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.stepBlock}>
                <View style={[styles.summaryMiniCard, { backgroundColor: surfaceMuted, borderColor: line }]}> 
                <LocationDisplay from={displayFrom} to={displayTo} compact />
                <View style={styles.timeHintRow}>
                  <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                  <Text style={styles.timeHintText}>{displayTime}</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Select transport</Text>

              <View style={styles.transportList}>
                {transportOptions.map((option) => (
                      <Pressable
                    key={option.mode}
                    onPress={() => {
                      setTransport(option.mode);
                      setTransportDetail('');
                      setSeats((prev) => Math.min(prev, seatLimits[option.mode]));
                    }}
                        style={[styles.transportOption, { backgroundColor: surface, borderColor: line }, transport === option.mode ? styles.transportOptionSelected : null]}
                  >
                    <Text style={styles.transportEmoji}>{option.emoji}</Text>
                    <Text style={styles.transportLabel}>{option.label}</Text>
                    {transport === option.mode ? (
                      <View style={styles.transportCheck}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>

              <View>
                <Text style={styles.inlineLabel}>Transport details (optional)</Text>
                  <TextInput
                  value={transportDetail}
                  onChangeText={setTransportDetail}
                  placeholder={currentTransportPlaceholder}
                  placeholderTextColor="#9CA3AF"
                    style={[styles.defaultInput, { backgroundColor: surface, borderColor: line, color: textPrimary }]}
                />
              </View>
            </View>
          ) : null}

          {step === 4 ? (
            <View style={styles.stepBlock}>
              <View style={styles.summaryMiniCard}>
                <LocationDisplay from={displayFrom} to={displayTo} compact />
                <View style={styles.timeHintRow}>
                  <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                  <Text style={styles.timeHintText}>{displayTime}</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Ride details</Text>

              <View style={[styles.seatCard, { backgroundColor: surface, borderColor: line }]}> 
                <View style={styles.seatLabelRow}>
                  <Ionicons name="people-outline" size={18} color="#6B7280" />
                  <Text style={styles.seatLabel}>Available seats</Text>
                  {transport !== 'Bus' ? (
                    <Text style={styles.seatLimitBadge}>max {seatLimits[transport]}</Text>
                  ) : (
                    <Text style={styles.seatLimitBadge}>no limit</Text>
                  )}
                </View>

                <View style={styles.seatAdjustRow}>
                  <Pressable
                    onPress={() => setSeats((prev) => Math.max(1, prev - 1))}
                    style={[styles.adjustButton, seats <= 1 ? styles.adjustButtonDisabled : null]}
                  >
                    <Text style={styles.adjustButtonText}>-</Text>
                  </Pressable>
                  <Text style={styles.seatValue}>{seats}</Text>
                  <Pressable
                    onPress={() => setSeats((prev) => Math.min(seatLimits[transport], prev + 1))}
                    style={[styles.adjustButton, seats >= seatLimits[transport] ? styles.adjustButtonDisabled : null]}
                  >
                    <Text style={styles.adjustButtonText}>+</Text>
                  </Pressable>
                </View>
                {seats >= seatLimits[transport] && transport !== 'Bus' ? (
                  <Text style={styles.seatLimitHint}>Maximum capacity for {transport} reached</Text>
                ) : null}
              </View>

              <View style={[styles.fareCard, { backgroundColor: surface, borderColor: line }]}> 
                <View style={styles.fareHead}>
                  <Text style={styles.fareHeadLabel}>Total fare (BDT)</Text>
                  <Pressable onPress={() => setFareSkip((prev) => !prev)} style={styles.addLaterRow}>
                      <View style={[styles.addLaterBox, fareSkip ? styles.addLaterBoxActive : null, { backgroundColor: darkMode ? '#111111' : '#FFFFFF', borderColor: line }]}>
                      {fareSkip ? <Ionicons name="checkmark" size={10} color="#FFFFFF" /> : null}
                    </View>
                    <Text style={styles.addLaterText}>Add later</Text>
                  </Pressable>
                </View>

                {!fareSkip ? (
                  <>
                    <TextInput
                      value={String(fare)}
                      onChangeText={(value) => {
                        const parsed = Number(value.replace(/[^0-9]/g, ''));
                        setFare(Number.isNaN(parsed) ? 0 : parsed);
                      }}
                      keyboardType="number-pad"
                      style={[styles.defaultInput, { backgroundColor: surface, borderColor: line, color: textPrimary }]}
                      placeholder="Total fare"
                      placeholderTextColor="#9CA3AF"
                    />

                    <View style={styles.splitToggle}>
                      <Pressable
                        onPress={() => setPaymentSplit('equal')}
                        style={[styles.splitButton, { backgroundColor: surface }, paymentSplit === 'equal' ? styles.splitButtonActive : null]}
                      >
                        <Text style={[styles.splitText, paymentSplit === 'equal' ? styles.splitTextActive : null]}>
                          Equal split{fare > 0 ? ` · BDT ${perSeatFare}/seat` : ''}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setPaymentSplit('distance')}
                        style={[styles.splitButton, { backgroundColor: surface }, paymentSplit === 'distance' ? styles.splitButtonActive : null]}
                      >
                        <Text style={[styles.splitText, paymentSplit === 'distance' ? styles.splitTextActive : null]}>Distance-based</Text>
                      </Pressable>
                    </View>

                    {paymentSplit === 'distance' ? (
                      <Text style={styles.distanceHint}>Each rider pays proportionally to their route distance</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.addLaterHint}>Fare will be communicated to riders later</Text>
                )}
              </View>

              <View>
                <Text style={styles.inlineLabel}>Gender preference</Text>
                <View style={styles.genderRow}>
                  {genderOptions.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => setGenderPref(option)}
                      style={[styles.genderButton, { backgroundColor: surface, borderColor: line }, genderPref === option ? styles.genderButtonActive : null]}
                    >
                      <Text style={[styles.genderText, genderPref === option ? styles.genderTextActive : null]}>{option}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.inlineLabel}>Notes (optional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. Pick up at main gate. Be on time!"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  style={[styles.notesInput, { backgroundColor: surface, borderColor: line, color: textPrimary }]}
                />
              </View>
            </View>
          ) : null}

          {step === 5 ? (
            <View style={styles.stepBlock}>
              <View style={[styles.publishedBanner, { backgroundColor: 'rgba(232, 57, 80, 0.08)', borderColor: colors.brand }]}> 
                <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
                <Text style={[styles.publishedBannerText, { color: textPrimary }]}>Your ride is created!</Text>
              </View>

              {fromLocation && toLocation ? (
                <MapRouteCard from={fromLocation} to={toLocation} title="Route" height={220} />
              ) : null}

              <View style={[styles.confirmationCard, { backgroundColor: surfaceMuted, borderColor: line }]}> 
                <View style={styles.summaryUserRow}>
                  <UserAvatar name={currentUser?.name || 'Guest'} size={32} />
                  <View>
                    <Text style={styles.summaryUserName}>{currentUser?.name || 'Guest'}</Text>
                    <Text style={styles.summaryUsername}>@{currentUser?.username || 'guest'}</Text>
                  </View>
                </View>


                <LocationDisplay from={displayFrom} to={displayTo} />

                <View style={styles.confirmTimeRow}>
                  <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                  <Text style={styles.confirmTimeText}>{displayTime}</Text>
                </View>

                <View style={styles.metricsGrid}>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel}>Transport</Text>
                    <Text style={styles.metricValue}>{transportEmoji[transport]} {transport}</Text>
                  </View>
                  <View style={[styles.metricCell, styles.metricCellBorder]}>
                    <Text style={styles.metricLabel}>Seats</Text>
                    <Text style={styles.metricValue}>{seats}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel}>{paymentSplit === 'equal' ? 'Per seat' : 'Total fare'}</Text>
                    <Text style={styles.metricValue}>{fareSkip ? 'TBD' : paymentSplit === 'equal' ? `BDT ${perSeatFare}` : `BDT ${fare}`}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.createdInfoWrap}>
                <Text style={styles.createdInfoText}>Other users can now see your ride!</Text>
                <Text style={styles.createdInfoText}>Check your notifications for join requests.</Text>
              </View>

              <Pressable onPress={() => router.push('/(app)/ride-status')} style={[styles.primaryBottomButton, { backgroundColor: darkMode ? '#111111' : '#1C1C1E' }]}> 
                <Text style={styles.primaryBottomButtonText}>View My Rides</Text>
              </Pressable>

              <Pressable onPress={() => router.push('/(app)')} style={[styles.secondaryBottomButton, { backgroundColor: surface, borderColor: line }]}> 
                <Text style={styles.secondaryBottomButtonText}>Back to Home</Text>
              </Pressable>
            </View>
          ) : null}
          {step < 5 ? (
            <View style={styles.inlineNavWrap}> 
              <NavButtons 
                onBack={goBack} 
                onNext={goNext} 
                nextDisabled={step === 1 && !step1Valid || step === 2 && !step2Valid}
                nextLabel={step === 4 ? "Publish Ride" : "Next"}
                darkMode={darkMode}
              />
            </View>
          ) : null}
        </ScrollView>
      </View>

      <RouteLocationPickerModal
        visible={showRoutePicker}
        backgroundColor={darkMode ? '#0A0A0A' : '#F5F5F7'}
        from={draftFrom}
        to={draftTo}
        onChange={({ from, to }) => {
          setDraftFrom(from);
          setDraftTo(to);
        }}
        onClose={() => setShowRoutePicker(false)}
        onConfirm={({ from, to, metrics }) => {
          setFromLocation(from);
          setToLocation(to);
          setFromInput(from?.shortName ?? '');
          setToInput(to?.shortName ?? '');
          setRouteMetrics(metrics);
          setShowRoutePicker(false);
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backIconButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  renewPlaceholder: {
    width: 70,
  },
  headerActionsRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  saveDraftButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#1C1C1E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  saveDraftButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EEEEEE',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 14,
  },
  draftBanner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  draftBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftBannerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  draftBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftActionPill: {
    borderRadius: 999,
    backgroundColor: '#E83950',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  draftActionPillGhost: {
    backgroundColor: '#F3F4F6',
  },
  draftActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  draftActionGhostText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
  },
  inlineNavWrap: {
    paddingTop: 10,
  },
  stepBlock: {
    gap: 14,
  },
  whereSearch: {
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  whereSearchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  routePreviewWrap: {
    minHeight: 170,
  },
  routePlaceholder: {
    minHeight: 170,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  routePlaceholderText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
  },
  routeInputsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  routeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dotFrom: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  routeInputDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 14,
  },
  routeInput: {
    flex: 1,
    color: '#111111',
    fontSize: 14,
    fontWeight: '500',
  },
  mapPickerButton: {
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  mapPickerButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  routeMetricsTag: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FBCFE8',
    backgroundColor: '#FFF1F2',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  routeMetricsText: {
    color: '#9F1239',
    fontSize: 12,
    fontWeight: '600',
  },
  helperText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  navButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navBackButton: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navNextButton: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBackText: {
    color: '#555555',
    fontSize: 14,
    fontWeight: '500',
  },
  navNextText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  summaryMiniCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  summaryUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryUserName: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryUsername: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  sectionTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
  },
  optionCard: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 3,
  },
  optionCardSelected: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(232, 57, 80, 0.08)',
  },
  optionTitle: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
  },
  optionText: {
    color: '#6B7280',
    fontSize: 12,
  },
  schedulePickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  schedulePickerWrap: {
    flex: 1,
  },
  departingTag: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  departingTagText: {
    color: '#374151',
    fontSize: 12,
  },
  timeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeHintText: {
    color: '#6B7280',
    fontSize: 12,
  },
  transportList: {
    gap: 10,
  },
  transportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  transportOptionSelected: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(232, 57, 80, 0.08)',
  },
  transportEmoji: {
    fontSize: 24,
  },
  transportLabel: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  transportCheck: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineLabel: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  defaultInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  seatCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  seatLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  seatLimitBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand,
    backgroundColor: 'rgba(232, 57, 80, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    marginLeft: 'auto',
  },
  seatLimitHint: {
    fontSize: 11,
    color: colors.brand,
    fontWeight: '500',
  },
  seatLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  seatAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonDisabled: {
    opacity: 0.3,
  },
  adjustButtonText: {
    color: '#4B5563',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  seatValue: {
    width: 30,
    textAlign: 'center',
    color: '#111111',
    fontSize: 20,
    fontWeight: '700',
  },
  fareCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  fareHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareHeadLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  addLaterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addLaterBox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  addLaterBoxActive: {
    borderColor: '#1C1C1E',
    backgroundColor: '#1C1C1E',
  },
  addLaterText: {
    color: '#666666',
    fontSize: 12,
  },
  splitToggle: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  splitButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  splitButtonActive: {
    backgroundColor: '#1C1C1E',
  },
  splitText: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
  },
  splitTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  distanceHint: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  addLaterHint: {
    color: '#9CA3AF',
    fontSize: 12,
    fontStyle: 'italic',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  genderButtonActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  genderText: {
    color: '#666666',
    fontSize: 14,
  },
  genderTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 90,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
    color: '#111111',
    fontSize: 14,
  },
  publishedBanner: {
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  publishedBannerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmationCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  confirmTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmTimeText: {
    color: '#6B7280',
    fontSize: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricCellBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  metricValue: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryBottomButton: {
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBottomButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBottomButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBottomButtonText: {
    color: '#666666',
    fontSize: 14,
  },
  createdInfoWrap: {
    flexDirection: 'column',
    alignSelf: 'center',
    alignItems: 'center',
    marginVertical: 8,
    gap: 2,
  },
  createdInfoText: {
    color: '#6B7280',
    fontSize: 13,
  },
  renewList: {
    gap: 8,
    paddingBottom: 6,
  },
  renewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  renewEmojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  renewEmoji: {
    fontSize: 20,
  },
  renewCopyWrap: {
    flex: 1,
    gap: 2,
  },
  renewRouteText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '600',
  },
  renewMetaText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  copyPill: {
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyPillText: {
    color: '#666666',
    fontSize: 11,
  },
});
