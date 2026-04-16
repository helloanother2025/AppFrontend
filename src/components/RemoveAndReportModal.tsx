import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const reportReasons = [
  'Inappropriate behavior',
  'No-show / Ghosted',
  'Fraudulent activity',
  'Harassment',
  'Other',
] as const;

type PassengerLite = {
  name: string;
};

type RemoveAndReportModalProps = {
  visible: boolean;
  passenger: PassengerLite | null;
  onConfirm: (reason: string, reportReason?: string) => void;
  onClose: () => void;
};

export function RemoveAndReportModal({ visible, passenger, onConfirm, onClose }: RemoveAndReportModalProps) {
  const [reason, setReason] = useState('');
  const [doReport, setDoReport] = useState(false);
  const [reportReason, setReportReason] = useState<(typeof reportReasons)[number]>(reportReasons[0]);

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

    setReason('');
    setDoReport(false);
    setReportReason(reportReasons[0]);
    backdropOpacity.setValue(0);
    translateY.setValue(120);
  }, [backdropOpacity, translateY, visible]);

  const canSubmit = useMemo(() => reason.trim().length > 0, [reason]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Remove passenger</Text>
          <Text style={styles.subtitle}>
            You are removing <Text style={styles.strong}>{passenger?.name || 'this passenger'}</Text>. They will be notified with your reason.
          </Text>

          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason for removal (required)..."
            multiline
            numberOfLines={3}
            style={styles.reasonInput}
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />

          <Pressable
            onPress={() => setDoReport((prev) => !prev)}
            style={[styles.reportToggle, doReport ? styles.reportToggleActive : null]}
          >
            <View style={[styles.checkbox, doReport ? styles.checkboxActive : null]}>
              {doReport ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <View style={styles.reportToggleCopy}>
              <View style={styles.reportToggleTitleRow}>
                <Ionicons name="flag-outline" size={14} color={doReport ? '#E83950' : '#9CA3AF'} />
                <Text style={styles.reportToggleTitle}>Also report this user</Text>
              </View>
              <Text style={styles.reportToggleSub}>Report will be reviewed by our team</Text>
            </View>
          </Pressable>

          {doReport ? (
            <View style={styles.reasonsWrap}>
              <Text style={styles.reasonsLabel}>Report reason:</Text>
              <ScrollView style={styles.reasonsList} contentContainerStyle={styles.reasonsListContent}>
                {reportReasons.map((item) => {
                  const selected = reportReason === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setReportReason(item)}
                      style={[styles.reasonOption, selected ? styles.reasonOptionSelected : null]}
                    >
                      <View style={[styles.reasonRadio, selected ? styles.reasonRadioSelected : null]} />
                      <Text style={[styles.reasonOptionText, selected ? styles.reasonOptionTextSelected : null]}>{item}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={!canSubmit}
              onPress={() => onConfirm(reason.trim(), doReport ? reportReason : undefined)}
              style={[styles.removeButton, !canSubmit ? styles.removeButtonDisabled : null]}
            >
              <Text style={styles.removeButtonText}>{doReport ? 'Remove & Report' : 'Remove'}</Text>
            </Pressable>
          </View>
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
    marginBottom: 12,
    lineHeight: 18,
  },
  strong: {
    fontWeight: '700',
    color: '#111827',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    minHeight: 88,
    marginBottom: 12,
  },
  reportToggle: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  reportToggleActive: {
    borderColor: '#E83950',
    backgroundColor: '#FFF0F2',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    borderColor: '#E83950',
    backgroundColor: '#E83950',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  reportToggleCopy: {
    flex: 1,
  },
  reportToggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportToggleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  reportToggleSub: {
    marginTop: 2,
    fontSize: 11,
    color: '#9CA3AF',
  },
  reasonsWrap: {
    marginBottom: 10,
  },
  reasonsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  reasonsList: {
    maxHeight: 180,
  },
  reasonsListContent: {
    gap: 6,
  },
  reasonOption: {
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reasonOptionSelected: {
    backgroundColor: '#FFF0F2',
  },
  reasonRadio: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  reasonRadioSelected: {
    borderColor: '#E83950',
    backgroundColor: '#E83950',
  },
  reasonOptionText: {
    fontSize: 13,
    color: '#374151',
  },
  reasonOptionTextSelected: {
    color: '#E83950',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  removeButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#DC2626',
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
