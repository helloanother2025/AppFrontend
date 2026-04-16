import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DualLocationPickerFullView } from './DualLocationPickerFullView';
import { useAppContext } from '../context/AppContext';
import { colors } from '../theme';
import type { RideLocation } from '../utils/rideMapper';
import type { RouteMetrics } from '../types/map';

type RouteLocationPickerModalProps = {
  visible: boolean;
  backgroundColor: string;
  from: RideLocation | null;
  to: RideLocation | null;
  onChange: (payload: { from: RideLocation | null; to: RideLocation | null }) => void;
  onConfirm: (payload: { from: RideLocation | null; to: RideLocation | null; metrics: RouteMetrics | null }) => void;
  onClose: () => void;
  confirmLabel?: string;
  backLabel?: string;
};

export function RouteLocationPickerModal({
  visible,
  backgroundColor,
  from,
  to,
  onChange,
  onConfirm,
  onClose,
  confirmLabel = 'Confirm',
  backLabel = 'Back',
}: RouteLocationPickerModalProps) {
  const canConfirm = Boolean(from && to);
  const [latestMetrics, setLatestMetrics] = useState<RouteMetrics | null>(null);
  const { darkMode } = useAppContext();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      setLatestMetrics(null);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor }]}> 
        <View style={styles.body}>
          <DualLocationPickerFullView
            startLocation={from}
            destinationLocation={to}
            onChange={onChange}
            onRouteMetaChange={setLatestMetrics}
          />
        </View>

        <View style={[
            styles.actionBar, 
            { 
              backgroundColor: darkMode ? colors.cardDark : '#FFFFFF',
              borderTopColor: darkMode ? colors.borderDark : '#F3F4F6',
              paddingBottom: Math.max(insets.bottom, 16) 
            }
          ]}>
          <Pressable onPress={onClose} style={[styles.backButton, { backgroundColor: darkMode ? '#2A2A2A' : '#F3F4F6' }]}>
            <Ionicons name="close" size={20} color={darkMode ? '#D1D5DB' : '#4B5563'} />
          </Pressable>

          <Pressable
            onPress={() => {
              if (!canConfirm) {
                return;
              }
              onConfirm({ from, to, metrics: latestMetrics });
            }}
            disabled={!canConfirm}
            style={[styles.confirmButton, !canConfirm ? styles.disabled : null]}
          >
            <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
            {canConfirm ? <Ionicons name="arrow-forward" size={16} color="#FFFFFF" /> : null}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.4,
  },
});
