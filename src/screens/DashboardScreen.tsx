import { useMemo, useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteLocationPickerModal } from '../components/RouteLocationPickerModal';
import { StyledDateTimePicker } from '../components/StyledDateTimePicker';
import { RideCard } from '../components/RideCard';
import { ScreenShell } from '../components/ScreenShell';
import { colors } from '../theme';

import {
  transportEmoji,
  type TransportMode,
  type RideLocation,
} from '../utils/rideMapper';
import { useAppContext } from '../context/AppContext';
import { useRide } from '../context/RideContext';
import { useUser } from '../context/UserContext';
import { useSearch, type TimeFilter } from '../context/SearchContext';
import { calculateMatchScore, getParsedRouteCoords, getRouteMatchMetrics } from '../utils/routeMatcher';

type TransportFilter = 'All' | TransportMode;
type GenderFilter = 'Any' | 'Male' | 'Female';

export function DashboardScreen() {
  const { searchData, setSearchData, resetSearchData } = useSearch();
  const { darkMode, isDemoMode } = useAppContext();
  const { rides, fetchAvailableRides, selectRide, getRideDetails, loading } = useRide();
  const { user: currentUser } = useUser();

  const fromLocation = searchData.start;
  const toLocation = searchData.destination;
  const departure = searchData.timeFilter;
  const scheduledTime = searchData.date;
  const transportFilter = searchData.transport;
  const genderFilter = searchData.gender;

  const [showFilters, setShowFilters] = useState(false);
  const [showRoutePicker, setShowRoutePicker] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDateValue, setScheduleDateValue] = useState<Date>(() => new Date(searchData.date));
  const [scheduleTimeValue, setScheduleTimeValue] = useState<Date>(() => new Date(searchData.date));
  const [scheduleHasExplicitTime, setScheduleHasExplicitTime] = useState(false);
  const [draftFrom, setDraftFrom] = useState<RideLocation | null>(null);
  const [draftTo, setDraftTo] = useState<RideLocation | null>(null);

  const bg = darkMode ? '#0A0A0A' : '#F5F5F7';
  const card = darkMode ? '#1A1A1A' : '#FFFFFF';
  const border = darkMode ? '#2A2A2A' : '#EEEEEE';
  const textPrimary = darkMode ? '#F5F5F5' : '#111111';
  const textSecondary = darkMode ? '#888888' : '#666666';
  const inputBg = darkMode ? '#1A1A1A' : '#FFFFFF';
  const tabBg = darkMode ? '#1A1A1A' : '#EBEBEB';

  const scheduleDate = new Date(scheduledTime);
  const validScheduleDate = Number.isNaN(scheduleDate.getTime()) ? new Date() : scheduleDate;

  const scheduleLabel = useMemo(() => {
    if (departure !== 'Schedule') return '';
    const datePart = validScheduleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!scheduleHasExplicitTime) return `${datePart} (date only)`;
    const timePart = validScheduleDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${datePart}, ${timePart}`;
  }, [departure, scheduleHasExplicitTime, validScheduleDate]);

  useEffect(() => {
    const filters: Record<string, unknown> = {};

    if (departure === 'Leave now') {
      const now = new Date();
      filters.afterDate = new Date(now.getTime() - 45 * 60 * 1000).toISOString();
      filters.beforeDate = new Date(now.getTime() + 45 * 60 * 1000).toISOString();
    } else if (departure === 'Schedule' && scheduledTime) {
      const selected = new Date(scheduledTime);
      if (!Number.isNaN(selected.getTime())) {
        if (scheduleHasExplicitTime) {
          filters.afterDate = new Date(selected.getTime() - 2 * 60 * 60 * 1000).toISOString();
          filters.beforeDate = new Date(selected.getTime() + 2 * 60 * 60 * 1000).toISOString();
        } else {
          const startOfDay = new Date(selected);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(selected);
          endOfDay.setHours(23, 59, 59, 999);
          filters.afterDate = startOfDay.toISOString();
          filters.beforeDate = endOfDay.toISOString();
        }
      }
    }

    const hasStart = !!fromLocation?.coords;
    const hasDest = !!toLocation?.coords;
    let searchType = 'none';
    if (hasStart && hasDest) searchType = 'both';
    else if (hasStart) searchType = 'start';
    else if (hasDest) searchType = 'destination';

    if (hasStart) {
      filters.startLocationLat = fromLocation!.coords!.lat;
      filters.startLocationLng = fromLocation!.coords!.lng;
      filters.radiusKm = 5;
    }
    if (hasDest) {
      filters.endLocationLat = toLocation!.coords!.lat;
      filters.endLocationLng = toLocation!.coords!.lng;
      filters.radiusKm = 5;
    }
    filters.searchType = searchType;

    fetchAvailableRides(filters, isDemoMode);
  }, [
    isDemoMode,
    fetchAvailableRides,
    transportFilter,
    genderFilter,
    fromLocation,
    toLocation,
    departure,
    scheduledTime,
    scheduleHasExplicitTime,
  ]);

  const filteredRides = useMemo(() => {
    const fromQ = (fromLocation?.shortName || '').toLowerCase().trim();
    const toQ = (toLocation?.shortName || '').toLowerCase().trim();
    const schedTime = new Date(scheduledTime);

    const userStart = fromLocation?.coords ? { latitude: fromLocation.coords.lat, longitude: fromLocation.coords.lng } : null;
    const userEnd = toLocation?.coords ? { latitude: toLocation.coords.lat, longitude: toLocation.coords.lng } : null;

    return rides
      .map((ride: any) => {
      // If we have a user, don't show their own rides here
      if (currentUser && ride.creator.id === currentUser.id) return null;

      // Filter by seat availability and openness
      const currentPassengers = ride.currentPassengers ?? ride.partners?.length ?? 0;
      const offeredSpots = ride.seats ?? ride.totalPassengers ?? ride.availableSeats ?? 0;
      const availableSeats = offeredSpots - currentPassengers;
      if (availableSeats <= 0) return null;

      const status = (ride.status || '').toLowerCase();
      if (status !== 'open' && status !== 'scheduled' && status !== 'unactive') return null;

      // 1. Geography Matching
      let matchesGeography = true;
      let pickupDistanceKm = 0.5;
      let dropDistanceKm = 0.5;

      if (userStart && userEnd) {
        const driverStart = {
          latitude: ride.start?.coords?.lat ?? ride.start?.lat ?? 0,
          longitude: ride.start?.coords?.lng ?? ride.start?.lng ?? 0,
        };
        const driverEnd = {
          latitude: ride.destination?.coords?.lat ?? ride.destination?.lat ?? 0,
          longitude: ride.destination?.coords?.lng ?? ride.destination?.lng ?? 0,
        };
        const routeCoords = getParsedRouteCoords(ride.routePolyline, driverStart, driverEnd);
        const metrics = getRouteMatchMetrics(userStart, userEnd, routeCoords, 2.5);
        pickupDistanceKm = metrics.pickupDistanceKm;
        dropDistanceKm = metrics.dropDistanceKm;
        matchesGeography = metrics.isMatch;
      } else {
        // Basic name matching if coordinates are missing or search is incomplete
        const matchesFrom =
          !fromQ ||
          (ride.start?.name ?? '').toLowerCase().includes(fromQ) ||
          (ride.start?.shortName && ride.start.shortName.toLowerCase().includes(fromQ));
        const matchesTo =
          !toQ ||
          (ride.destination?.name ?? '').toLowerCase().includes(toQ) ||
          (ride.destination?.shortName && ride.destination.shortName.toLowerCase().includes(toQ));
        matchesGeography = matchesFrom && matchesTo;
      }

      // 2. Time Matching
      const startTime = ride.start_time || ride.startTime || ride.dateTime;
      const rideTime = new Date(startTime);
      let matchesTime = true;
      let timeDifferenceMin = 0;

      if (!isNaN(rideTime.getTime())) {
        const target = departure === 'Schedule' && !isNaN(schedTime.getTime()) ? schedTime : new Date();
        timeDifferenceMin = Math.abs(rideTime.getTime() - target.getTime()) / (60 * 1000);
      }

      if (departure === 'Schedule' && !isNaN(rideTime.getTime()) && !isNaN(schedTime.getTime())) {
        if (scheduleHasExplicitTime) {
          const diff = Math.abs(rideTime.getTime() - schedTime.getTime());
          matchesTime = diff <= 2 * 60 * 60 * 1000;
        } else {
          matchesTime =
            rideTime.getFullYear() === schedTime.getFullYear() &&
            rideTime.getMonth() === schedTime.getMonth() &&
            rideTime.getDate() === schedTime.getDate();
        }
      } else if (departure === 'Leave now' && !isNaN(rideTime.getTime())) {
        const diff = Math.abs(rideTime.getTime() - Date.now());
        matchesTime = diff <= 45 * 60 * 1000;
      }

      // 3. Other Filters
      const matchesTransport = transportFilter === 'All' || ride.transportMode === transportFilter || ride.transport === transportFilter;
      const matchesGender =
        genderFilter === 'Any' ||
        ride.gender === 'Any' ||
        ride.gender === genderFilter;

      if (!(matchesGeography && matchesTime && matchesTransport && matchesGender)) {
        return null;
      }

      const score = calculateMatchScore({
        pickupDistanceKm,
        dropDistanceKm,
        timeDifferenceMin,
        availableSeats,
        ownerRating: Number(ride.creator?.rating || 0),
      });

      return { ride, score };
    })
    .filter((item): item is { ride: any; score: number } => Boolean(item))
    .sort((a, b) => a.score - b.score)
    .map((item) => item.ride);
  }, [rides, currentUser, fromLocation, toLocation, departure, scheduledTime, scheduleHasExplicitTime, transportFilter, genderFilter]);

  const handleOpenSchedule = () => {
    const now = new Date();
    const existing = new Date(scheduledTime);
    const base = Number.isNaN(existing.getTime()) ? now : existing;
    setScheduleDateValue(base);
    setScheduleTimeValue(base);
    setSearchData((p) => ({ ...p, timeFilter: 'Schedule' }));
    setShowScheduleModal(true);
  };

  const handleScheduleDateChange = (date: Date) => {
    setScheduleDateValue(date);
    const merged = new Date(date);
    if (scheduleHasExplicitTime) {
      merged.setHours(scheduleTimeValue.getHours(), scheduleTimeValue.getMinutes(), 0, 0);
    } else {
      merged.setHours(12, 0, 0, 0);
    }
    setSearchData((p) => ({ ...p, date: merged.toISOString() }));
  };

  const handleScheduleTimeChange = (time: Date) => {
    setScheduleHasExplicitTime(true);
    setScheduleTimeValue(time);
    const merged = new Date(scheduleDateValue);
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
    setSearchData((p) => ({ ...p, date: merged.toISOString() }));
  };

  const handleScheduleDateOnly = () => {
    setScheduleHasExplicitTime(false);
    const merged = new Date(scheduleDateValue);
    merged.setHours(12, 0, 0, 0);
    setSearchData((p) => ({ ...p, date: merged.toISOString() }));
  };


  const activeFilterCount = [
    transportFilter !== 'All',
    genderFilter !== 'Any',
    !!fromLocation,
    !!toLocation,
    departure !== 'All',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    resetSearchData();
  };

  const transportModes: TransportFilter[] = ['All', 'Car', 'CNG', 'Bus', 'Bike', 'Microbus', 'Rickshaw'];

  return (
    <ScreenShell scroll={false}>
      <View style={[styles.root, { backgroundColor: bg }]}> 
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => fetchAvailableRides({}, isDemoMode)}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
        >
          <View style={[styles.header, { backgroundColor: card, borderBottomColor: border }]}> 
            <View style={styles.headerTop}>
              <Text style={[styles.title, { color: textPrimary }]}>Find a Ride</Text>
              {activeFilterCount > 0 ? (
                <Pressable onPress={clearAllFilters} style={styles.clearPill}>
                  <Ionicons name="close" size={11} color="#E83950" />
                  <Text style={styles.clearPillText}>Clear all</Text>
                </Pressable>
              ) : null}
            </View>

            {!fromLocation && !toLocation ? (
              <Pressable
                style={[styles.whereSearch, { backgroundColor: inputBg, borderColor: border }]}
                onPress={() => {
                  setDraftFrom(fromLocation);
                  setDraftTo(toLocation);
                  setShowRoutePicker(true);
                }}
              >
                <Ionicons name="search" size={14} color={textSecondary} />
                <Text style={[styles.whereSearchText, { color: textSecondary }]}>Where to today?</Text>
              </Pressable>
            ) : (
              <View style={[styles.routeBox, { borderColor: border, backgroundColor: inputBg }]}> 
                <Pressable
                  onPress={() => {
                    setDraftFrom(fromLocation);
                    setDraftTo(toLocation);
                    setShowRoutePicker(true);
                  }}
                  style={[styles.routeRow, { borderBottomColor: border }]}
                >
                  <View style={styles.fromDot} />
                  <Text style={[styles.routeValueText, { color: textPrimary }]}>{fromLocation?.shortName || 'Starting point'}</Text>
                  <Ionicons name="chevron-forward" size={14} color={textSecondary} />
                </Pressable>

                <Pressable
                  onPress={() => {
                    setDraftFrom(fromLocation);
                    setDraftTo(toLocation);
                    setShowRoutePicker(true);
                  }}
                  style={styles.routeRow}
                >
                  <Ionicons name="location-outline" size={13} color={textSecondary} />
                  <Text style={[styles.routeValueText, { color: textPrimary }]}>{toLocation?.shortName || 'Destination'}</Text>
                  <Ionicons name="chevron-forward" size={14} color={textSecondary} />
                </Pressable>
              </View>
            )}

            <View style={styles.toggleRow}>
              <View style={[styles.departureToggle, { backgroundColor: tabBg }]}> 
                <Pressable
                  onPress={() => setSearchData(p => ({ ...p, timeFilter: 'All' }))}
                  style={[styles.departureButton, departure === 'All' ? styles.departureButtonActive : null]}
                >
                  <Ionicons name="time-outline" size={11} color={departure === 'All' ? '#FFFFFF' : textSecondary} />
                  <Text style={[styles.departureText, { color: departure === 'All' ? '#FFFFFF' : textSecondary, fontWeight: departure === 'All' ? '600' : '400' }]}>Any time</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSearchData(p => ({ ...p, timeFilter: 'Leave now' }))}
                  style={[styles.departureButton, departure === 'Leave now' ? styles.departureButtonActive : null]}
                >
                  <Ionicons name="flash-outline" size={11} color={departure === 'Leave now' ? '#FFFFFF' : textSecondary} />
                  <Text style={[styles.departureText, { color: departure === 'Leave now' ? '#FFFFFF' : textSecondary, fontWeight: departure === 'Leave now' ? '600' : '400' }]}>Leave now</Text>
                </Pressable>
                <Pressable
                  onPress={handleOpenSchedule}
                  style={[styles.departureButton, departure === 'Schedule' ? styles.departureButtonActive : null]}
                >
                  <Ionicons name="calendar-outline" size={11} color={departure === 'Schedule' ? '#FFFFFF' : textSecondary} />
                  <Text style={[styles.departureText, { color: departure === 'Schedule' ? '#FFFFFF' : textSecondary, fontWeight: departure === 'Schedule' ? '600' : '400' }]}>Schedule</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => setShowFilters((prev) => !prev)}
                style={[
                  styles.filterButton,
                  showFilters || activeFilterCount > 0
                    ? { backgroundColor: '#E83950', borderColor: '#E83950' }
                    : { backgroundColor: inputBg, borderColor: border },
                ]}
              >
                <Ionicons name="options-outline" size={16} color={showFilters || activeFilterCount > 0 ? '#FFFFFF' : textSecondary} />
                {activeFilterCount > 0 ? (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          </View>

          <View style={styles.resultWrap}>
            {departure === 'Schedule' ? (
              <Pressable onPress={handleOpenSchedule} style={[styles.scheduleBox, { backgroundColor: inputBg }]}> 
                <Ionicons name="calendar-outline" size={16} color="#E83950" />
                <Text style={styles.scheduleInputText}>{scheduleLabel || 'Pick a schedule'}</Text>
              </Pressable>
            ) : null}

            {showFilters ? (
              <View style={[styles.filterPanel, { backgroundColor: card, borderColor: border }]}> 
                <View style={styles.filterPanelTop}>
                  <Text style={[styles.filterTitle, { color: textPrimary }]}>Filters</Text>
                  {transportFilter !== 'All' || genderFilter !== 'Any' ? (
                    <Pressable
                      onPress={() => {
                        setSearchData(p => ({ ...p, transport: 'All', gender: 'Any' }));
                      }}
                    >
                      <Text style={styles.filterClearText}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View>
                  <Text style={[styles.filterLabel, { color: textSecondary }]}>Transport</Text>
                  <View style={styles.transportWrap}>
                    {transportModes.map((t) => (
                      <Pressable
                        key={t}
                        onPress={() => setSearchData(p => ({ ...p, transport: t }))}
                        style={[
                          styles.transportChip,
                          transportFilter === t
                            ? styles.transportChipActive
                            : { borderColor: border },
                        ]}
                      >
                        <Text
                          style={{
                            color: transportFilter === t ? '#FFFFFF' : textSecondary,
                            fontSize: 12,
                            fontWeight: transportFilter === t ? '600' : '400',
                          }}
                        >
                          {t !== 'All' ? `${transportEmoji[t as TransportMode]} ` : ''}
                          {t}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View>
                  <Text style={[styles.filterLabel, { color: textSecondary }]}>Gender preference</Text>
                  <View style={styles.genderWrap}>
                    {(['Any', 'Male', 'Female'] as GenderFilter[]).map((g) => (
                      <Pressable
                        key={g}
                        onPress={() => setSearchData(p => ({ ...p, gender: g }))}
                        style={[
                          styles.genderChip,
                          genderFilter === g ? styles.genderChipActive : { borderColor: border },
                        ]}
                      >
                        <Text style={{ color: genderFilter === g ? '#FFFFFF' : textSecondary, fontSize: 12, fontWeight: genderFilter === g ? '600' : '400' }}>{g}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}
            <View style={styles.resultsTop}>
              <Text style={[styles.resultsTitle, { color: textPrimary }]}> 
                {fromLocation && toLocation ? 'Suggested rides' : 'Available rides'} <Text style={[styles.resultsCount, { color: textSecondary }]}>({filteredRides.length})</Text>
              </Text>
              {loading ? <ActivityIndicator size="small" color={colors.brand} /> : (filteredRides.length > 0 ? <Text style={[styles.resultsFound, { color: textSecondary }]}>{filteredRides.length} found</Text> : null)}
            </View>



            {filteredRides.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyCard, { backgroundColor: card, borderColor: border }]}> 
                  <Ionicons name="search" size={32} color={darkMode ? '#444444' : '#CCCCCC'} style={styles.emptyIcon} />
                  <Text style={[styles.emptyTitle, { color: textPrimary }]}>No rides found</Text>
                  <Text style={[styles.emptySubtitle, { color: textSecondary }]}> 
                    {departure === 'Schedule'
                      ? 'Try adjusting the time or clearing the schedule filter.'
                      : 'Try searching by location or adjusting filters.'}
                  </Text>
                  {activeFilterCount > 0 ? (
                    <Pressable onPress={clearAllFilters}>
                      <Text style={styles.emptyClear}>Clear all filters</Text>
                    </Pressable>
                  ) : null}
                </View>

                <Pressable
                  onPress={() => (isDemoMode ? router.push('/Login') : router.push('/(app)/create-ride'))}
                  style={styles.bottomCta}
                >
                  <Text style={styles.bottomCtaText}>{isDemoMode ? 'Sign in to create a ride' : 'Create a ride instead'}</Text>
                  <Text style={styles.bottomCtaArrow}>→</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.listWrap}>

                {filteredRides.map((ride) => (
                  <RideCard
                    key={ride.id}
                    ride={ride}
                    onPress={async () => {
                      await getRideDetails(ride.id);
                      router.push({ pathname: '/(app)/ride-details', params: { rideId: String(ride.id) } });
                    }}
                  />
                ))}

                <Pressable
                  onPress={() => (isDemoMode ? router.push('/Login') : router.push('/(app)/create-ride'))}
                  style={styles.bottomCta}
                >
                  <Text style={styles.bottomCtaText}>{isDemoMode ? 'Sign in to create a ride' : '+ Create a ride'}</Text>
                  <Text style={styles.bottomCtaArrow}>→</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>

        <RouteLocationPickerModal
          visible={showRoutePicker}
          backgroundColor={bg}
          from={draftFrom}
          to={draftTo}
          onChange={({ from, to }) => {
            setDraftFrom(from);
            setDraftTo(to);
          }}
          onClose={() => setShowRoutePicker(false)}
          onConfirm={({ from, to }) => {
            setSearchData(p => ({
              ...p,
              start: from,
              destination: to,
            }));
            setShowRoutePicker(false);
          }}
        />

        <Modal visible={showScheduleModal} transparent animationType="fade" onRequestClose={() => setShowScheduleModal(false)}>
          <View style={styles.scheduleModalBackdrop}>
            <View style={styles.scheduleModalCard}>
              <View style={styles.scheduleModalHeader}>
                <Text style={styles.scheduleModalTitle}>Pick schedule</Text>
                <Pressable onPress={() => setShowScheduleModal(false)}>
                  <Ionicons name="close" size={18} color="#6B7280" />
                </Pressable>
              </View>

              <StyledDateTimePicker
                text="Pick date"
                value={scheduleDateValue}
                mode="date"
                onChange={handleScheduleDateChange}
                minimumDate={new Date()}
                style={styles.schedulePicker}
              />

              <StyledDateTimePicker
                text="Pick time (optional)"
                value={scheduleTimeValue}
                mode="time"
                onChange={handleScheduleTimeChange}
                style={styles.schedulePicker}
              />

              <View style={styles.scheduleModalActions}>
                <Pressable onPress={handleScheduleDateOnly} style={styles.scheduleDateOnlyButton}>
                  <Text style={styles.scheduleDateOnlyText}>Use date only</Text>
                </Pressable>
                <Pressable onPress={() => setShowScheduleModal(false)} style={styles.scheduleApplyButton}>
                  <Text style={styles.scheduleApplyText}>Apply</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  clearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E83950',
  },
  clearPillText: {
    color: '#E83950',
    fontSize: 12,
    fontWeight: '500',
  },
  whereSearch: {
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  whereSearchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  routeBox: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fromDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E83950',
  },
  routeInput: {
    flex: 1,
    fontSize: 14,
  },
  routeValueText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  mapButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  departureToggle: {
    flex: 1,
    borderRadius: 16,
    padding: 4,
    flexDirection: 'row',
  },
  departureButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  departureButtonActive: {
    backgroundColor: '#1C1C1E',
  },
  departureText: {
    fontSize: 12,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  resultWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  scheduleBox: {
    borderColor: '#E83950',
    borderWidth: 2,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  scheduleInputText: {
    flex: 1,
    color: '#E83950',
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  scheduleModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  scheduleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  schedulePicker: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  scheduleModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleDateOnlyButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  scheduleDateOnlyText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  scheduleApplyButton: {
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  scheduleApplyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  filterPanelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  filterClearText: {
    color: '#E83950',
    fontSize: 12,
    fontWeight: '500',
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  transportWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  transportChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  transportChipActive: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  genderWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  genderChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  resultsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '400',
  },
  resultsFound: {
    fontSize: 12,
  },
  emptyWrap: {
    gap: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtitle: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyClear: {
    marginTop: 12,
    color: '#E83950',
    fontSize: 12,
    fontWeight: '500',
  },
  listWrap: {
    gap: 12,
  },
  bottomCta: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomCtaArrow: {
    color: '#FFFFFF',
    fontSize: 18,
  },
});
