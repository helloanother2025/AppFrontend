import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { RideLocation } from '../utils/rideMapper';
import { colors } from '../theme';
import { useAppContext } from '../context/AppContext';

type RoutePreviewCardProps = {
  from: RideLocation;
  to: RideLocation;
  title?: string;
};

export function RoutePreviewCard({ from, to, title = 'Route preview' }: RoutePreviewCardProps) {
  const { darkMode } = useAppContext();

  const textPrimary = darkMode ? colors.textPrimaryDark : colors.textPrimaryLight;
  const textSecondary = darkMode ? colors.textSecondaryDark : colors.textSecondaryLight;
  const cardBg = darkMode ? colors.cardDark : '#FFFFFF';
  const border = darkMode ? colors.borderDark : '#E5E7EB';
  const overlayBg = darkMode ? '#111111' : '#FFFFFF';

  const minLat = Math.min(from.lat, to.lat);
  const maxLat = Math.max(from.lat, to.lat);
  const minLng = Math.min(from.lng, to.lng);
  const maxLng = Math.max(from.lng, to.lng);
  const latPad = Math.max((maxLat - minLat) * 0.5, 0.02);
  const lngPad = Math.max((maxLng - minLng) * 0.5, 0.03);
  const bbox = `${minLng - lngPad}%2C${minLat - latPad}%2C${maxLng + lngPad}%2C${maxLat + latPad}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;

  const openInMap = async () => {
    const mapsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat}%2C${from.lng}%3B${to.lat}%2C${to.lng}`;
    const canOpen = await Linking.canOpenURL(mapsUrl);
    if (!canOpen) {
      Alert.alert('Map unavailable', 'Unable to open map directions on this device.');
      return;
    }
    await Linking.openURL(mapsUrl);
  };

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
      <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>

      <View style={[styles.mapContainer, { borderColor: border }]}> 
        <WebView source={{ uri: mapUrl }} style={styles.mapWebview} scrollEnabled={false} />

        <View style={styles.mapOverlay}>
          <View style={[styles.overlayInput, { backgroundColor: overlayBg, borderColor: border }]}> 
            <Ionicons name="radio-button-on" size={12} color={colors.brand} />
            <Text style={[styles.overlayText, { color: textPrimary }]} numberOfLines={1}>
              {from.shortName}
            </Text>
          </View>
          <View style={[styles.overlayInput, { backgroundColor: overlayBg, borderColor: border }]}> 
            <Ionicons name="location" size={12} color={colors.brand} />
            <Text style={[styles.overlayText, { color: textPrimary }]} numberOfLines={1}>
              {to.shortName}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="locate-outline" size={14} color={textSecondary} />
          <Text style={[styles.metaText, { color: textSecondary }]}>Lat {from.lat.toFixed(3)} {'->'} {to.lat.toFixed(3)}</Text>
        </View>
        <Pressable onPress={openInMap} style={styles.mapButton}>
          <Text style={styles.mapButtonText}>Open map</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  mapWebview: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    gap: 8,
  },
  overlayInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  overlayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  metaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaText: {
    fontSize: 11,
  },
  mapButton: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
