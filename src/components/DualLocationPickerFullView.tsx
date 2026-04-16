import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, type MapPressEvent } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RideLocation } from '../utils/rideMapper';
import type { RouteMetrics } from '../types/map';
import { colors } from '../theme';
import { useAppContext } from '../context/AppContext';
import {
  getDirections,
  placeSuggestionToRideLocation,
  reverseGeocode,
  searchPlaces,
} from '../utils/mapServices';

type DualLocationPickerFullViewProps = {
  startLocation: RideLocation | null;
  destinationLocation: RideLocation | null;
  onChange: (payload: { from: RideLocation | null; to: RideLocation | null }) => void;
  onRouteMetaChange?: (metrics: RouteMetrics | null) => void;
};

const INITIAL_REGION = {
  latitude: 23.809741182039073,
  longitude: 90.41419583604615,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function DualLocationPickerFullView({
  startLocation,
  destinationLocation,
  onChange,
  onRouteMetaChange,
}: DualLocationPickerFullViewProps) {
  const { darkMode } = useAppContext();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [activeField, setActiveField] = useState<'start' | 'destination'>('start');
  const [startQuery, setStartQuery] = useState(startLocation?.shortName ?? '');
  const [destinationQuery, setDestinationQuery] = useState(destinationLocation?.shortName ?? '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; description: string; lat: number; lng: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [tapLoading, setTapLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);

  useEffect(() => {
    setStartQuery(startLocation?.shortName ?? '');
  }, [startLocation?.shortName]);

  useEffect(() => {
    setDestinationQuery(destinationLocation?.shortName ?? '');
  }, [destinationLocation?.shortName]);

  const currentQuery = activeField === 'start' ? startQuery : destinationQuery;

  useEffect(() => {
    if (currentQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      const controller = new AbortController();
      setLoading(true);
      searchPlaces(currentQuery, controller.signal)
        .then((results) => setSuggestions(results))
        .finally(() => setLoading(false));

      return () => controller.abort();
    }, 300);

    return () => clearTimeout(timer);
  }, [currentQuery]);

  useEffect(() => {
    if (!startLocation || !destinationLocation) {
      setRouteCoords([]);
      onRouteMetaChange?.(null);
      return;
    }

    const controller = new AbortController();
    getDirections(
      { lat: startLocation.lat, lng: startLocation.lng },
      { lat: destinationLocation.lat, lng: destinationLocation.lng },
      controller.signal
    ).then((result) => {
      if (!result) {
        setRouteCoords([]);
        onRouteMetaChange?.(null);
        return;
      }

      setRouteCoords(result.coordinates);
      onRouteMetaChange?.({ distanceKm: result.distanceKm, durationMin: result.durationMin });

      const fitPoints = [
        { latitude: startLocation.lat, longitude: startLocation.lng },
        { latitude: destinationLocation.lat, longitude: destinationLocation.lng },
        ...result.coordinates,
      ];
      mapRef.current?.fitToCoordinates(fitPoints, {
        edgePadding: { top: 80, right: 50, bottom: 90, left: 50 },
        animated: true,
      });
    });

    return () => controller.abort();
  }, [destinationLocation, onRouteMetaChange, startLocation]);

  const markers = useMemo(
    () => [
      startLocation
        ? {
            id: 'start',
            coordinate: { latitude: startLocation.lat, longitude: startLocation.lng },
            title: startLocation.shortName,
            color: 'orange',
          }
        : null,
      destinationLocation
        ? {
            id: 'destination',
            coordinate: { latitude: destinationLocation.lat, longitude: destinationLocation.lng },
            title: destinationLocation.shortName,
            color: '#e63e4c',
          }
        : null,
    ].filter(Boolean) as Array<{ id: string; coordinate: { latitude: number; longitude: number }; title: string; color: string }>,
    [destinationLocation, startLocation]
  );

  const applyLocation = (location: RideLocation) => {
    if (activeField === 'start') {
      onChange({ from: location, to: destinationLocation });
      setStartQuery(location.shortName);
    } else {
      onChange({ from: startLocation, to: location });
      setDestinationQuery(location.shortName);
    }

    setSuggestions([]);
    setShowSuggestions(false);
    mapRef.current?.animateToRegion(
      {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      350
    );
  };

  const onSelectSuggestion = (item: { id: string; name: string; description: string; lat: number; lng: number }) => {
    const location = placeSuggestionToRideLocation(item);
    applyLocation(location);
  };

  const onMapPress = async (event: MapPressEvent) => {
    setTapLoading(true);
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const location = await reverseGeocode(latitude, longitude);
    if (location) {
      applyLocation(location);
    }
    setTapLoading(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: darkMode ? colors.bgDark : '#f7f7f7' }]}>
      <View style={styles.mapWrapper}>
        <MapView
          ref={(ref) => {
            mapRef.current = ref;
          }}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          onPress={onMapPress}
          userInterfaceStyle={darkMode ? 'dark' : 'light'}
        >
          {markers.map((marker) => (
            <Marker key={marker.id} coordinate={marker.coordinate} title={marker.title} pinColor={marker.color} />
          ))}
          {routeCoords.length > 0 ? <Polyline coordinates={routeCoords} strokeColor={colors.brand} strokeWidth={4} /> : null}
        </MapView>

        {(loading || tapLoading) ? (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : null}

        <View style={[
            styles.unifiedCard, 
            { 
              top: Math.max(insets.top, 16) + 10, 
              backgroundColor: darkMode ? colors.cardDark : '#FFFFFF',
              borderColor: darkMode ? colors.borderDark : 'transparent',
              shadowColor: darkMode ? '#000' : 'rgba(0,0,0,0.15)',
            }
          ]}> 
          <View style={styles.cardInternal}>
            <View style={styles.connectingLineWrap}>
                <View style={[styles.dotFrom, { backgroundColor: darkMode ? '#AAAAAA' : '#333333' }]} />
                <View style={styles.dashedLine} />
                <Ionicons name="location" size={14} color={colors.brand} />
            </View>

            <View style={styles.inputsWrap}>
               <View style={[styles.inputRow, { borderBottomColor: darkMode ? colors.borderDark : '#F3F4F6', borderBottomWidth: 1 }]}>
                 <TextInput
                   placeholder="Starting point"
                   placeholderTextColor={darkMode ? colors.textSecondaryDark : "#9CA3AF"}
                   value={startQuery}
                   onFocus={() => {
                     setActiveField('start');
                     setShowSuggestions(true);
                   }}
                   onChangeText={(value) => {
                     setStartQuery(value);
                     onChange({ from: null, to: destinationLocation });
                     setActiveField('start');
                     setShowSuggestions(true);
                   }}
                   style={[styles.searchInput, { color: darkMode ? colors.textPrimaryDark : '#111111' }]}
                 />
                 {startQuery.length > 0 && activeField === 'start' && (
                    <Pressable hitSlop={10} onPress={() => { setStartQuery(''); onChange({ from: null, to: destinationLocation }); setSuggestions([]); }} style={styles.clearIcon}>
                       <Ionicons name="close-circle" size={16} color="#D1D5DB" />
                    </Pressable>
                 )}
               </View>

               <View style={styles.inputRow}>
                 <TextInput
                   placeholder="Destination"
                   placeholderTextColor={darkMode ? colors.textSecondaryDark : "#9CA3AF"}
                   value={destinationQuery}
                   onFocus={() => {
                     setActiveField('destination');
                     setShowSuggestions(true);
                   }}
                   onChangeText={(value) => {
                     setDestinationQuery(value);
                     onChange({ from: startLocation, to: null });
                     setActiveField('destination');
                     setShowSuggestions(true);
                   }}
                   style={[styles.searchInput, { color: darkMode ? colors.textPrimaryDark : '#111111' }]}
                 />
                 {destinationQuery.length > 0 && activeField === 'destination' && (
                    <Pressable hitSlop={10} onPress={() => { setDestinationQuery(''); onChange({ from: startLocation, to: null }); setSuggestions([]); }} style={styles.clearIcon}>
                       <Ionicons name="close-circle" size={16} color="#D1D5DB" />
                    </Pressable>
                 )}
               </View>
            </View>
          </View>

          {showSuggestions && suggestions.length > 0 ? (
             <View style={[styles.suggestionDivider, { backgroundColor: darkMode ? colors.borderDark : '#F3F4F6' }]} />
          ) : null}

          {showSuggestions && suggestions.length > 0 ? (
            <ScrollView style={styles.suggestionList} keyboardShouldPersistTaps="handled">
              {suggestions.map((item, index) => (
                <Pressable 
                  key={item.id} 
                  style={[
                    styles.suggestionItem, 
                    index !== suggestions.length - 1 ? { borderBottomColor: darkMode ? colors.borderDark : '#F3F4F6', borderBottomWidth: 1 } : null
                  ]} 
                  onPress={() => onSelectSuggestion(item)}
                >
                  <Ionicons name="location-outline" size={16} color={darkMode ? "#666" : "#9CA3AF"} style={styles.suggestionIcon} />
                  <View style={styles.suggestionTextWrap}>
                    <Text style={[styles.suggestionTitle, { color: darkMode ? colors.textPrimaryDark : '#111827' }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.suggestionSubtitle, { color: darkMode ? colors.textSecondaryDark : '#6B7280' }]} numberOfLines={1}>{item.description}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
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
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 20,
  },
  unifiedCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardInternal: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  connectingLineWrap: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    marginRight: 14,
    marginLeft: 6,
    paddingVertical: 6,
  },
  dotFrom: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  dashedLine: {
    flex: 1,
    width: 1,
    backgroundColor: '#D1D5DB',
  },
  inputsWrap: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 8,
  },
  clearIcon: {
    padding: 4,
  },
  suggestionDivider: {
    height: 1,
    width: '100%',
  },
  suggestionList: {
    maxHeight: 280,
    paddingHorizontal: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 12,
  },
});

