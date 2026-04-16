import { useEffect, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { RideLocation } from '../utils/rideMapper';
import { colors } from '../theme';

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type LocationPickerModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelect: (location: RideLocation) => void;
};

const POPULAR_LOCATIONS: RideLocation[] = [
  { name: 'IUT Cafeteria, Board Bazar, Gazipur', shortName: 'IUT, Gazipur', lat: 23.953, lng: 90.414, coords: { lat: 23.953, lng: 90.414 } },
  { name: 'Uttara, Dhaka Metropolitan', shortName: 'Uttara, Dhaka', lat: 23.875, lng: 90.389, coords: { lat: 23.875, lng: 90.389 } },
  { name: 'Dhanmondi, Dhaka Metropolitan', shortName: 'Dhanmondi, Dhaka', lat: 23.746, lng: 90.374, coords: { lat: 23.746, lng: 90.374 } },
  { name: 'Mirpur, Dhaka Metropolitan', shortName: 'Mirpur, Dhaka', lat: 23.806, lng: 90.366, coords: { lat: 23.806, lng: 90.366 } },
  { name: 'Motijheel, Dhaka Metropolitan', shortName: 'Motijheel, Dhaka', lat: 23.729, lng: 90.419, coords: { lat: 23.729, lng: 90.419 } },
  { name: 'Farmgate, Tejgaon, Dhaka', shortName: 'Farmgate, Dhaka', lat: 23.76, lng: 90.391, coords: { lat: 23.76, lng: 90.391 } },
  { name: 'Board Bazar, Gazipur', shortName: 'Board Bazar, Gazipur', lat: 23.945, lng: 90.417, coords: { lat: 23.945, lng: 90.417 } },
  { name: 'Sector 12, Uttara, Dhaka', shortName: 'Sector 12, Uttara', lat: 23.868, lng: 90.394, coords: { lat: 23.868, lng: 90.394 } },
];


function toLocation(result: NominatimResult): RideLocation {
  const parts = result.display_name.split(', ').filter(Boolean);
  return {
    name: result.display_name,
    shortName: parts.slice(0, 2).join(', ').trim(),
    lat: Number.parseFloat(result.lat),
    lng: Number.parseFloat(result.lon),
    coords: {
      lat: Number.parseFloat(result.lat),
      lng: Number.parseFloat(result.lon),
    },
  };

}

export function LocationPickerModal({ visible, title, onClose, onSelect }: LocationPickerModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<RideLocation | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setLoading(false);
      setSelected(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&countrycodes=bd`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimResult[] = await response.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const mapUrl = selected
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${selected.lng - 0.03}%2C${selected.lat - 0.03}%2C${selected.lng + 0.03}%2C${selected.lat + 0.03}&layer=mapnik`
    : 'https://www.openstreetmap.org/export/embed.html?bbox=90.34%2C23.73%2C90.46%2C23.96&layer=mapnik';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color="#4B5563" />
            </Pressable>
            <Text style={styles.title}>{title}</Text>
          </View>

          <View style={styles.searchWrap}>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color="#9CA3AF" />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={(value) => {
                  setQuery(value);
                  setSelected(null);
                }}
                placeholder="Search location..."
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
              />
              {loading ? <ActivityIndicator size="small" color="#9CA3AF" /> : null}
              {query.length > 0 && !loading ? (
                <Pressable
                  onPress={() => {
                    setQuery('');
                    setResults([]);
                    setSelected(null);
                  }}
                >
                  <Ionicons name="close" size={14} color="#9CA3AF" />
                </Pressable>
              ) : null}
            </View>
          </View>

          {selected ? (
            <View style={styles.mapPreview}>
              <WebView source={{ uri: mapUrl }} style={styles.mapWebview} scrollEnabled={false} />
            </View>
          ) : null}

          <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent}>
            {query.trim().length >= 3 ? (
              <View style={styles.section}>
                <Text style={styles.listHeaderText}>Search results</Text>
                {results.map((result) => {
                  const location = toLocation(result);
                  const isSelected = selected?.shortName === location.shortName;

                  return (
                    <Pressable
                      key={`${location.shortName}-${location.lat}-${location.lng}`}
                      onPress={() => setSelected(location)}
                      style={[styles.item, isSelected && styles.itemSelected]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={isSelected ? colors.brand : '#9CA3AF'}
                      />
                      <View style={styles.itemCopy}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{location.shortName}</Text>
                        <Text style={styles.itemText} numberOfLines={1}>{location.name}</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.listHeaderText}>Popular locations</Text>
                {POPULAR_LOCATIONS.map((location) => {
                  const isSelected = selected?.shortName === location.shortName;

                  return (
                    <Pressable
                      key={location.shortName}
                      onPress={() => setSelected(location)}
                      style={[styles.item, isSelected && styles.itemSelected]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={isSelected ? colors.brand : '#9CA3AF'}
                      />
                      <View style={styles.itemCopy}>
                        <Text style={styles.itemTitle}>{location.shortName}</Text>
                        <Text style={styles.itemText} numberOfLines={1}>{location.name}</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={() => {
                if (selected) {
                  onSelect(selected);
                  onClose();
                }
              }}
              disabled={!selected}
              style={[styles.primaryButton, !selected && styles.primaryButtonDisabled]}
            >
              <View style={styles.confirmContent}>
                <Text style={styles.primaryButtonText}>
                  {selected ? `Confirm: ${selected.shortName}` : 'Select a location'}
                </Text>
                {selected ? <Ionicons name="chevron-forward" size={16} color="#FFFFFF" /> : null}
              </View>
            </Pressable>
          </View>
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
    height: '92%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeButton: {
    padding: 6,
    borderRadius: 999,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    padding: 0,
  },
  mapPreview: {
    marginHorizontal: 16,
    marginTop: 12,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapWebview: {
    width: '100%',
    height: '100%',
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  section: {
    marginBottom: 8,
  },
  listHeaderText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  itemSelected: {
    backgroundColor: '#FFF0F2',
    borderColor: colors.brand,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 14,
    color: '#1F2937',
  },
  itemText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  selectedBadge: {
    width: 16,
    height: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  confirmContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
