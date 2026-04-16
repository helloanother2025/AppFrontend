import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '../components/ScreenShell';
import { LocationDisplay } from '../components/LocationDisplay';
import { UserAvatar } from '../components/UserAvatar';
import {
  availableRides,
  haversineDistance,
  incomingJoinRequests,
  myActiveRide,
  myCancelledRide,
  myCompletedRide,
  myJoinRequests,
  myScheduledRide,
  pastRideByUser2,
} from '../utils/rideMapper';
import { useAppContext } from '../context/AppContext';
import { colors } from '../theme';
import { paymentsAPI, type PaymentStatus } from '../api/payments';


type PaymentMethod = 'bkash' | 'nagad' | 'card' | 'cash';
type PaymentState = 'idle' | 'processing' | 'success';

const paymentMethods: Array<{ id: PaymentMethod; label: string; icon: string; color: string; desc: string }> = [
  { id: 'bkash', label: 'bKash', icon: '📱', color: '#E2136E', desc: 'Pay via bKash mobile banking' },
  { id: 'nagad', label: 'Nagad', icon: '💳', color: '#F05A28', desc: 'Pay via Nagad digital wallet' },
  { id: 'card', label: 'Debit/Credit Card', icon: '💳', color: '#3B82F6', desc: 'Visa, Mastercard, etc.' },
  { id: 'cash', label: 'Cash', icon: '💵', color: '#10B981', desc: 'Pay directly to the creator' },
];

export function PaymentScreen() {
  const { darkMode, currentUserAvatar } = useAppContext();
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();

  const allRides = useMemo(
    () => [...availableRides, myActiveRide, myScheduledRide, myCompletedRide, myCancelledRide, pastRideByUser2],
    []
  );
  const ride = allRides.find((item) => item.id === rideId) ?? pastRideByUser2;

  const myReq = myJoinRequests.find((request) => request.rideId === ride.id);
  const myJoinerFrom = myReq?.joinerFrom ?? ride.from;
  const myJoinerTo = myReq?.joinerTo ?? ride.to;

  const totalDist = haversineDistance(ride.from.lat, ride.from.lng, ride.to.lat, ride.to.lng);
  const myDist = haversineDistance(myJoinerFrom.lat, myJoinerFrom.lng, myJoinerTo.lat, myJoinerTo.lng);
  const acceptedPassengers = incomingJoinRequests.filter((request) => request.rideId === ride.id && request.status === 'accepted');
  const totalParticipants = 1 + acceptedPassengers.length;

  const myFare = ride.fare != null && totalDist > 0 ? Math.round(ride.fare * (myDist / totalDist)) : 0;
  const equalShareFare = ride.fare != null && totalParticipants > 0 ? Math.round(ride.fare / totalParticipants) : 0;

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('bkash');
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [usedFare, setUsedFare] = useState<number>(myFare || equalShareFare);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [persistedPaymentStatus, setPersistedPaymentStatus] = useState<PaymentStatus | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);

  const numericRideId = useMemo(() => {
    const candidate = rideId ?? ride.id;
    const parsed = Number(candidate);
    return Number.isInteger(parsed) ? parsed : null;
  }, [rideId, ride.id]);

  useEffect(() => {
    let active = true;

    const loadExistingPayment = async () => {
      if (!numericRideId) {
        setPaymentId(null);
        setPersistedPaymentStatus(null);
        return;
      }

      try {
        const payments = await paymentsAPI.getMyPayments();
        if (!active) return;

        const existing = (Array.isArray(payments) ? payments : []).find((item: any) => Number(item.ride_id) === numericRideId);
        if (existing) {
          setPaymentId(Number(existing.payment_id));
          const status = String(existing.current_status || '').toLowerCase();
          if (status === 'pending' || status === 'completed' || status === 'failed') {
            setPersistedPaymentStatus(status as PaymentStatus);
          }
        }
      } catch {
        // Keep screen usable even if payment lookup fails.
      }
    };

    loadExistingPayment();

    return () => {
      active = false;
    };
  }, [numericRideId]);

  const alreadyPaid = persistedPaymentStatus === 'completed' || myReq?.paymentStatus === 'paid';

  const ensurePaymentRecord = async () => {
    if (paymentId) return paymentId;
    if (!numericRideId) {
      throw new Error('Ride ID is missing. Open payment from a specific ride.');
    }
    const created = await paymentsAPI.createPayment(numericRideId, usedFare, myDist);
    const createdId = Number(created?.payment?.payment_id ?? created?.payment?.id);
    if (!Number.isInteger(createdId)) {
      throw new Error('Unable to create payment record.');
    }
    setPaymentId(createdId);
    return createdId;
  };

  const persistPaymentStatus = async (status: PaymentStatus) => {
    setSavingPayment(true);
    try {
      const id = await ensurePaymentRecord();
      await paymentsAPI.updatePaymentStatus(id, status);
      setPersistedPaymentStatus(status);
    } finally {
      setSavingPayment(false);
    }
  };

  const handlePayNow = async () => {
    setPaymentState('processing');
    try {
      await persistPaymentStatus('completed');
      setPaymentState('success');
    } catch (err: any) {
      Alert.alert('Payment failed', err?.message || 'Could not process payment right now.');
      setPaymentState('idle');
    }
  };

  const handlePayLater = async () => {
    try {
      await persistPaymentStatus('pending');
      Alert.alert('Marked as pending', 'This ride payment has been marked as pending.');
      router.back();
    } catch (err: any) {
      Alert.alert('Could not mark pending', err?.message || 'Please try again.');
    }
  };

  const cardBg = darkMode ? colors.cardDark : '#FFFFFF';
  const cardBorder = darkMode ? colors.borderDark : '#E5E7EB';
  const textPrimary = darkMode ? colors.textPrimaryDark : '#111827';
  const textSecondary = darkMode ? colors.textSecondaryDark : '#6B7280';

  if (alreadyPaid || paymentState === 'success') {
    return (
      <ScreenShell scroll={false}>
        <View style={styles.successWrap}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={42} color="#16A34A" />
          </View>
          <Text style={[styles.successTitle, { color: textPrimary }]}>
            {alreadyPaid && paymentState === 'idle' ? 'Already Paid!' : 'Payment Successful!'}
          </Text>
          <Text style={[styles.successText, { color: textSecondary }]}>
            {alreadyPaid && paymentState === 'idle'
              ? `You've already paid BDT ${ride.fare ?? 0} for this ride.`
              : `BDT ${usedFare} paid successfully via ${selectedMethod}.`}
          </Text>

          <View style={[styles.successCard, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
            <LocationDisplay from={ride.from.shortName} to={ride.to.shortName} compact />
            <Text style={[styles.successCardText, { color: '#9CA3AF' }]}>with {ride.creator.name}</Text>
          </View>

          <Pressable style={styles.homeButton} onPress={() => router.push('/(app)')}>
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </Pressable>
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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Payment</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
          <View style={styles.creatorRow}>
            <UserAvatar size="sm" name={ride.creator.name} source={ride.creator.avatar ?? currentUserAvatar} />
            <View>
              <Text style={[styles.creatorName, { color: textPrimary }]}>{ride.creator.name}</Text>
              <Text style={[styles.creatorRole, { color: textSecondary }]}>Ride creator</Text>
            </View>
          </View>
          <LocationDisplay from={ride.from.shortName} to={ride.to.shortName} compact />
          <View style={[styles.summaryStats, { borderTopColor: darkMode ? '#2A2A2A' : '#F3F4F6' }]}> 
            <View>
              <Text style={[styles.statLabel, { color: '#9CA3AF' }]}>Total fare</Text>
              <Text style={[styles.statValue, { color: textPrimary }]}>{ride.fare != null ? `BDT ${ride.fare}` : 'TBD'}</Text>
            </View>
            <View>
              <Text style={[styles.statLabel, { color: '#9CA3AF' }]}>Participants</Text>
              <Text style={[styles.statValue, { color: textPrimary }]}>{totalParticipants} people</Text>
            </View>
          </View>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountSubtext}>Your share (distance-based)</Text>
          <Text style={styles.amountValue}>BDT {usedFare}</Text>
          <Text style={styles.amountHint}>Equal split: BDT {equalShareFare} · Distance split: BDT {myFare}</Text>
          <View style={styles.fareModeRow}>
            <Pressable
              onPress={() => setUsedFare(myFare)}
              style={[styles.modeChip, usedFare === myFare ? styles.modeChipActive : styles.modeChipInactive]}
            >
              <Text style={usedFare === myFare ? styles.modeChipActiveText : styles.modeChipInactiveText}>Distance</Text>
            </Pressable>
            <Pressable
              onPress={() => setUsedFare(equalShareFare)}
              style={[styles.modeChip, usedFare === equalShareFare && usedFare !== myFare ? styles.modeChipActive : styles.modeChipInactive]}
            >
              <Text style={usedFare === equalShareFare && usedFare !== myFare ? styles.modeChipActiveText : styles.modeChipInactiveText}>Equal</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
          <Text style={[styles.methodTitle, { color: textPrimary }]}>Payment Method</Text>
          <View style={styles.methodsList}>
            {paymentMethods.map((method) => {
              const selected = selectedMethod === method.id;
              return (
                <Pressable
                  key={method.id}
                  onPress={() => setSelectedMethod(method.id)}
                  style={[
                    styles.methodItem,
                    selected
                      ? { borderColor: method.color, backgroundColor: `${method.color}15` }
                      : { borderColor: darkMode ? '#2A2A2A' : '#F3F4F6', backgroundColor: 'transparent' },
                  ]}
                >
                  <Text style={styles.methodEmoji}>{method.icon}</Text>
                  <View style={styles.methodTextWrap}>
                    <Text style={[styles.methodLabel, { color: textPrimary }]}>{method.label}</Text>
                    <Text style={[styles.methodDesc, { color: textSecondary }]}>{method.desc}</Text>
                  </View>
                  <View
                    style={[
                      styles.methodRadio,
                      {
                        borderColor: selected ? method.color : '#D1D5DB',
                        backgroundColor: selected ? method.color : 'transparent',
                      },
                    ]}
                  >
                    {selected ? <Text style={styles.methodRadioTick}>✓</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.securityNoteRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#9CA3AF" />
          <Text style={styles.securityNoteText}>Payments are secured and encrypted end-to-end.</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handlePayNow}
            disabled={paymentState === 'processing' || savingPayment}
            style={[styles.payNowButton, paymentState === 'processing' || savingPayment ? styles.payNowButtonDisabled : null]}
          >
            <View style={styles.payNowContent}>
              {paymentState === 'processing' || savingPayment ? (
                <>
                  <Ionicons name="reload" size={18} color="#FFFFFF" />
                  <Text style={styles.payNowText}>Processing...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.payNowText}>
                    Pay BDT {usedFare} via {paymentMethods.find((method) => method.id === selectedMethod)?.label}
                  </Text>
                </>
              )}
            </View>
          </Pressable>

          <Pressable style={styles.payLaterButton} onPress={handlePayLater} disabled={savingPayment || paymentState === 'processing'}>
            <Text style={styles.payLaterText}>Pay Later (mark as pending)</Text>
          </Pressable>
        </View>
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
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  creatorRole: {
    fontSize: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  amountCard: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  amountSubtext: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginBottom: 3,
  },
  amountValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 2,
  },
  amountHint: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 11,
    textAlign: 'center',
  },
  fareModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  modeChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  modeChipInactive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  modeChipActiveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  modeChipInactiveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  methodsList: {
    gap: 8,
  },
  methodItem: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  methodEmoji: {
    fontSize: 20,
  },
  methodTextWrap: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  methodDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  methodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodRadioTick: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 10,
  },
  securityNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  securityNoteText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  actions: {
    gap: 8,
  },
  payNowButton: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.brand,
  },
  payNowButtonDisabled: {
    opacity: 0.75,
  },
  payNowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payNowText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  payLaterButton: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  payLaterText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  successText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },
  successCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  successCardText: {
    marginTop: 8,
    fontSize: 11,
  },
  homeButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
