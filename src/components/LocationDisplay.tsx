import { StyleSheet, Text, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { colors } from '../theme';

type LocationDisplayProps = {
  from: string;
  to: string;
  compact?: boolean;
};

export function LocationDisplay({ from, to, compact = false }: LocationDisplayProps) {
  const { darkMode } = useAppContext();
  const textColor = darkMode ? colors.textPrimaryDark : '#1F2937';
  const cardBg = darkMode ? '#1A1A1A' : '#F9FAFB';
  const border = darkMode ? '#2A2A2A' : '#E5E7EB';
  const textSize = compact ? 12 : 14;

  return (
    <View style={styles.root}>
      <View style={styles.rowTopAligned}>
        <View style={styles.fromDotWrap}>
          <View style={styles.fromDot} />
        </View>
        <View style={[styles.locationCard, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.locationText, { color: textColor, fontSize: textSize }]} numberOfLines={1}>
            {from}
          </Text>
        </View>
      </View>

      <View style={styles.rowTopAligned}>
        <View style={styles.pinWrap}>
          <View style={styles.pinOuter}>
            <View style={styles.pinInner} />
          </View>
        </View>
        <View style={[styles.locationCard, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.locationText, { color: textColor, fontSize: textSize }]} numberOfLines={1}>
            {to}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
  rowTopAligned: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  fromDotWrap: {
    width: 12,
    alignItems: 'center',
    marginTop: 9,
  },
  fromDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  pinWrap: {
    width: 12,
    alignItems: 'center',
    marginTop: 3,
  },
  pinOuter: {
    width: 12,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInner: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  locationCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationText: {
    fontWeight: '500',
    lineHeight: 18,
  },
});
