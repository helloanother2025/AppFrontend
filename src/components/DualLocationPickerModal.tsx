import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import type { RideLocation } from '../utils/rideMapper';
import { colors } from '../theme';
import {
  getDirections,
  placeSuggestionToRideLocation,
  reverseGeocode,
  searchPlaces,
} from '../utils/mapServices';

type DualLocationPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (payload: { from: RideLocation; to: RideLocation }) => void;
  initialFrom?: RideLocation | null;
  initialTo?: RideLocation | null;
};

const INITIAL_REGION = {
  latitude: 23.84,
  longitude: 90.41,
  latitudeDelta: 0.26,
  longitudeDelta: 0.26,
};

export function DualLocationPickerModal({
  visible,
  onClose,
  onConfirm,
  initialFrom = null,
  initialTo = null,
}: DualLocationPickerModalProps) {
  const mapRef = useRef<MapView | null>(null);

  const [activeField, setActiveField] = useState<'from' | 'to'>('from');
  const [from, setFrom] = useState<RideLocation | null>(initialFrom);
  const [to, setTo] = useState<RideLocation | null>(initialTo);
  const [fromQuery, setFromQuery] = useState(initialFrom?.shortName ?? '');
  const [toQuery, setToQuery] = useState(initialTo?.shortName ?? '');
  const [loading, setLoading] = useState(false);
  const [tapLoading, setTapLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; description: string; lat: number; lng: number }>>([]);
  const [distanceMeta, setDistanceMeta] = useState<string>('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    setFrom(initialFrom ?? null);
    setTo(initialTo ?? null);
    setFromQuery(initialFrom?.shortName ?? '');
    setToQuery(initialTo?.shortName ?? '');
    setSuggestions([]);
    setActiveField('from');
  }, [initialFrom, initialTo, visible]);

  const currentQuery = activeField === 'from' ? fromQuery : toQuery;

  useEffect(() => {
    if (!visible || currentQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      searchPlaces(currentQuery, controller.signal)
        .then((result) => setSuggestions(result))
        .finally(() => setLoading(false));
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [currentQuery, visible]);

  useEffect(() => {
    if (!from || !to) {
      setDistanceMeta('');
      return;
    }

    const controller = new AbortController();
    getDirections({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng }, controller.signal).then((result) => {
      if (!result) {
        setDistanceMeta('');
        return;
      }

      setDistanceMeta(`${result.distanceKm.toFixed(1)} km, ${Math.round(result.durationMin)} min`);
    });

    return () => controller.abort();
  }, [from, to]);

  const setField = (location: RideLocation) => {
    if (activeField === 'from') {
      setFrom(location);
      setFromQuery(location.shortName);
    } else {
      setTo(location);
      setToQuery(location.shortName);
    }

    mapRef.current?.animateToRegion(
      {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      300
    );
    setSuggestions([]);
  };

  const onMapPress = async (event: MapPressEvent) => {
    setTapLoading(true);
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const location = await reverseGeocode(latitude, longitude);
    if (location) {
      setField(location);
    }
    setTapLoading(false);
  };

  const markerItems = useMemo(
    () => [
      from
        ? {
            id: 'from',
            location: from,
            title: 'From',
            color: colors.brand,
          }
        : null,
      to
        ? {
            id: 'to',
            location: to,
            title: 'To',
            color: '#2563EB',
          }
        : null,
    ].filter(Boolean) as Array<{ id: string; location: RideLocation; title: string; color: string }>,
    [from, to]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color="#4B5563" />
            </Pressable>
            <Text style={styles.title}>Pick route on map</Text>
          </View>

          <View style={styles.mapWrap}>
            <MapView
              ref={(ref) => {
                mapRef.current = ref;
              }}
              style={styles.map}
              initialRegion={INITIAL_REGION}
              onPress={onMapPress}
            >
              {markerItems.map((item) => (
                <Marker
                  key={item.id}
                  coordinate={{ latitude: item.location.lat, longitude: item.location.lng }}
                  title={item.title}
                  description={item.location.shortName}
                  pinColor={item.color}
                />
              ))}
            </MapView>
            {(tapLoading || loading) ? (
              <View style={styles.loaderOverlay}>
                <ActivityIndicator color={colors.brand} />
              </View>
            ) : null}
          </View>

          <View style={styles.inputCard}>
            <Pressable onPress={() => setActiveField('from')} style={[styles.inputRow, activeField === 'from' ? styles.activeInput : null]}>
              <Ionicons name="radio-button-on" size={13} color={colors.brand} />
              <TextInput
                value={fromQuery}
                onFocus={() => setActiveField('from')}
                onChangeText={(value) => {
                  setFromQuery(value);
                  setSuggestions([]);
                }}
                placeholder="From location"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </Pressable>

            <Pressable onPress={() => setActiveField('to')} style={[styles.inputRow, activeField === 'to' ? styles.activeInput : null]}>
              <Ionicons name="location" size={13} color="#2563EB" />
              <TextInput
                value={toQuery}
                onFocus={() => setActiveField('to')}
                onChangeText={(value) => {
                  setToQuery(value);
                  setSuggestions([]);
                }}
                placeholder="To location"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </Pressable>
          </View>

          {suggestions.length > 0 ? (
            <ScrollView style={styles.suggestions} contentContainerStyle={styles.suggestionsContent}>
              {suggestions.map((item) => {
                const location = placeSuggestionToRideLocation(item);
                return (
                  <Pressable key={item.id} onPress={() => setField(location)} style={styles.suggestionItem}>
                    <Ionicons name="location-outline" size={15} color="#9CA3AF" />
                    <View style={styles.suggestionTextWrap}>
                      <Text style={styles.suggestionTitle}>{location.shortName}</Text>
                      <Text style={styles.suggestionSubtitle} numberOfLines={1}>{location.name}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {distanceMeta ? <Text style={styles.metaText}>Estimated route: {distanceMeta}</Text> : null}

          <Pressable
            disabled={!from || !to}
            onPress={() => {
              if (from && to) {
                onConfirm({ from, to });
                onClose();
              }
            }}
            style={[styles.confirmButton, (!from || !to) ? styles.confirmButtonDisabled : null]}
          >
            <Text style={styles.confirmButtonText}>Use this route</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '94%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 6,
    borderRadius: 999,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  mapWrap: {
    height: 290,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  inputCard: {
    marginTop: 12,
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
  },
  activeInput: {
    borderColor: colors.brand,
    backgroundColor: '#FFF0F2',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 10,
  },
  suggestions: {
    maxHeight: 160,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
  },
  suggestionsContent: {
    paddingVertical: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  suggestionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  suggestionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  metaText: {
    marginTop: 10,
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  confirmButton: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
