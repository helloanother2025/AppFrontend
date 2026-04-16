import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from './UserAvatar';

type RideLite = {
  from?: { shortName?: string };
  to?: { shortName?: string };
};

type UserLite = {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
};

type JoinRequestLite = {
  id: string | number;
  requester: UserLite;
};

type ConfirmCancelModalProps = {
  visible: boolean;
  ride: RideLite | null;
  passengers: JoinRequestLite[];
  onTransferOwnership: (toUser: UserLite) => void;
  onJustCancel: () => void;
  onClose: () => void;
};

export function ConfirmCancelModal({
  visible,
  ride,
  passengers,
  onTransferOwnership,
  onJustCancel,
  onClose,
}: ConfirmCancelModalProps) {
  const [step, setStep] = useState<'confirm' | 'transfer'>('confirm');
  const [transferTo, setTransferTo] = useState<UserLite | null>(null);

  const translateY = useRef(new Animated.Value(120)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    setStep('confirm');
    setTransferTo(null);
    backdropOpacity.setValue(0);
    translateY.setValue(120);
  }, [backdropOpacity, translateY, visible]);

  const hasPassengers = passengers.length > 0;
  const canTransfer = useMemo(() => transferTo != null, [transferTo]);

  const closeToConfirm = () => {
    setStep('confirm');
    setTransferTo(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={closeToConfirm}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeToConfirm} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.grabber} />

          {step === 'transfer' && hasPassengers ? (
            <>
              <Text style={styles.title}>Transfer ownership</Text>
              <Text style={styles.subtitle}>Choose a ride buddy to become the new creator:</Text>

              <ScrollView style={styles.passengerList} contentContainerStyle={styles.passengerListContent}>
                {passengers.map((jr) => {
                  const selected = transferTo?.id === jr.requester.id;
                  return (
                    <Pressable
                      key={String(jr.id)}
                      onPress={() => setTransferTo(jr.requester)}
                      style={[styles.passengerOption, selected ? styles.passengerOptionSelected : null]}
                    >
                      <UserAvatar size="sm" name={jr.requester.name} source={jr.requester.avatar} />
                      <View>
                        <Text style={styles.passengerName}>{jr.requester.name}</Text>
                        <Text style={styles.passengerHandle}>@{jr.requester.username || 'user'}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.actionsRow}>
                <Pressable onPress={() => setStep('confirm')} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Back</Text>
                </Pressable>
                <Pressable
                  disabled={!canTransfer}
                  onPress={() => {
                    if (transferTo) onTransferOwnership(transferTo);
                  }}
                  style={[styles.primaryButton, !canTransfer ? styles.primaryButtonDisabled : null]}
                >
                  <Text style={styles.primaryText}>Transfer & Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Cancel ride?</Text>
              <Text style={styles.routeLine}>
                <Text style={styles.strong}>{ride?.from?.shortName || 'Start'}</Text>
                {' -> '}
                <Text style={styles.strong}>{ride?.to?.shortName || 'End'}</Text>
              </Text>
              <Text style={styles.helperText}>All confirmed riders will be notified about the cancellation.</Text>

              {hasPassengers ? (
                <Pressable onPress={() => setStep('transfer')} style={styles.transferButton}>
                  <Ionicons name="people-outline" size={16} color="#E83950" />
                  <Text style={styles.transferButtonText}>Transfer ownership to a buddy</Text>
                </Pressable>
              ) : null}

              <View style={styles.actionsRow}>
                <Pressable onPress={closeToConfirm} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Keep ride</Text>
                </Pressable>
                <Pressable onPress={onJustCancel} style={styles.destructiveButton}>
                  <Text style={styles.primaryText}>Cancel ride</Text>
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    maxHeight: '90%',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },
  routeLine: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 2,
  },
  strong: {
    fontWeight: '700',
    color: '#111827',
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  transferButton: {
    borderWidth: 2,
    borderColor: '#E83950',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  transferButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E83950',
  },
  passengerList: {
    maxHeight: 260,
    marginBottom: 10,
  },
  passengerListContent: {
    gap: 8,
  },
  passengerOption: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  passengerOptionSelected: {
    borderColor: '#E83950',
    backgroundColor: '#FFF0F2',
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  passengerHandle: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#E83950',
  },
  destructiveButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#DC2626',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
