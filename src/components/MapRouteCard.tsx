import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import type { RideLocation } from '../utils/rideMapper';
import type { RouteMetrics } from '../types/map';
import { getDirections } from '../utils/mapServices';
import { colors } from '../theme';
import { useAppContext } from '../context/AppContext';

type MapRouteCardProps = {
  from: RideLocation;
  to: RideLocation;
  title?: string;
  height?: number;
  onMetricsChange?: (metrics: RouteMetrics | null) => void;
  onMapPress?: (coordinate: { lat: number; lng: number }) => void;
};

export function MapRouteCard({ from, to, title = 'Route', height = 200, onMetricsChange, onMapPress }: MapRouteCardProps) {
  const { darkMode } = useAppContext();
  const mapRef = useRef<MapView | null>(null);
  const [coords, setCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);

  const textPrimary = darkMode ? colors.textPrimaryDark : colors.textPrimaryLight;
  const textSecondary = darkMode ? colors.textSecondaryDark : colors.textSecondaryLight;
  const border = darkMode ? colors.borderDark : colors.borderLight;
  const cardBg = darkMode ? colors.cardDark : colors.cardLight;

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    setLoading(true);
    setFailed(false);

    getDirections({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng }, controller.signal)
      .then((result) => {
        if (!mounted) {
          return;
        }

        if (!result) {
          setFailed(true);
          setCoords([]);
          setMetrics(null);
          onMetricsChange?.(null);
          return;
        }

        setCoords(result.coordinates);
        const nextMetrics = { distanceKm: result.distanceKm, durationMin: result.durationMin };
        setMetrics(nextMetrics);
        onMetricsChange?.(nextMetrics);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [from.lat, from.lng, to.lat, to.lng, onMetricsChange]);

  useEffect(() => {
    const points = [
      { latitude: from.lat, longitude: from.lng },
      { latitude: to.lat, longitude: to.lng },
      ...coords,
    ];

    if (mapRef.current) {
      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  }, [coords, from.lat, from.lng, to.lat, to.lng]);

  const externalMapUrl = useMemo(
    () => `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat}%2C${from.lng}%3B${to.lat}%2C${to.lng}`,
    [from.lat, from.lng, to.lat, to.lng]
  );

  return (
    <View style={[styles.card, { borderColor: border, backgroundColor: cardBg }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
        {metrics ? (
          <Text style={[styles.metricsText, { color: textSecondary }]}>
            {metrics.distanceKm.toFixed(1)} km • {Math.round(metrics.durationMin)} min
          </Text>
        ) : null}
      </View>

      <View style={[styles.mapWrap, { borderColor: border, height }]}> 
        <MapView
          ref={(ref) => {
            mapRef.current = ref;
          }}
          style={styles.map}
          onPress={(event) => {
            if (!onMapPress) return;
            const { latitude, longitude } = event.nativeEvent.coordinate;
            onMapPress({ lat: latitude, lng: longitude });
          }}
          initialRegion={{
            latitude: (from.lat + to.lat) / 2,
            longitude: (from.lng + to.lng) / 2,
            latitudeDelta: Math.max(Math.abs(from.lat - to.lat) * 1.5, 0.08),
            longitudeDelta: Math.max(Math.abs(from.lng - to.lng) * 1.5, 0.08),
          }}
        >
          <Marker coordinate={{ latitude: from.lat, longitude: from.lng }} title="Start" pinColor={colors.brand} />
          <Marker coordinate={{ latitude: to.lat, longitude: to.lng }} title="Destination" pinColor="#2563EB" />
          {coords.length > 0 ? <Polyline coordinates={coords} strokeWidth={5} strokeColor={darkMode ? '#F87171' : colors.brand} /> : null}
        </MapView>

        {loading ? (
          <View style={styles.overlayState}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : null}

        {failed ? (
          <View style={styles.overlayState}>
            <Text style={styles.errorText}>Could not load route.</Text>
          </View>
        ) : null}
      </View>

      <Pressable onPress={() => Linking.openURL(externalMapUrl)} style={styles.openMapButton}>
        <Ionicons name="open-outline" size={13} color="#FFFFFF" />
        <Text style={styles.openMapText}>Open in map</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  metricsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mapWrap: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  overlayState: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  openMapButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#1C1C1E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  openMapText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
