import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Pressable, Platform, } from 'react-native';
import { StyledFauxSearch as Search } from '../../../components/StyledFauxSearch';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import { StyledTitle as Title } from '../../../components/StyledTitle';
import { StyledText as Text } from '../../../components/StyledText';
import RideCard from '../../../components/RideDisplayCard';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSearch } from '../../../context/SearchContext';
import { useRide } from '../../../context/RideContext';
import { useRouter, useFocusEffect } from 'expo-router';

const TRANSPORT_OPTIONS = [
  { key: 'Car', label: 'Car', icon: <FontAwesome name="car" size={15} /> },
  { key: 'CNG', label: 'CNG', icon: <MaterialCommunityIcons name="rickshaw" size={17} /> },
  { key: 'Bus', label: 'Bus', icon: <FontAwesome name="bus" size={13} /> },
  { key: 'Bike', label: 'Bike', icon: <FontAwesome6 name="bicycle" size={15} /> },
];

const GENDER_OPTIONS = [
  { key: 'Any', label: 'Any', icon: <FontAwesome6 name="users" size={13} /> },
  { key: 'Male', label: 'Male', icon: <FontAwesome6 name="person" size={13} /> },
  { key: 'Female', label: 'Female', icon: <FontAwesome6 name="person-dress"  size={13} /> },
];

const AvailableRides = () => {
  const router = useRouter();
  const { searchData, resetSearchData } = useSearch();
  const { rides, fetchAvailableRides, loading } = useRide();
  const scrollRef = useRef(null);

  const [showSearch, setShowSearch] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [date, setDate] = useState(null);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('All');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // draft state inside the modal — only applied when "Apply" is tapped
  const [draftTransport, setDraftTransport] = useState(null);
  const [draftGender, setDraftGender] = useState(null);

  const RADIUS_KM = 5;

  const handleTimeFilterChange = (filter) => {
    setSelectedTimeFilter(filter);
    if (filter === 'All') {
      setDate(null);
      resetSearchData();
      setShowSearch(true);
    } else if (filter === 'Schedule' && !date) {
      setShowDatePicker(true);
    } else if (filter === 'Leave now') {
      setDate(null);
    }
  };

  const handleSearch = useCallback(async () => {
    const filters = {};
    if (selectedTransport) filters.transportMode = selectedTransport;
    if (selectedGender && selectedGender !== 'Any') filters.genderPreference = selectedGender;

    if (selectedTimeFilter === 'Leave now') {
      // "Leave now": 45 minutes before to 45 minutes after the selected date
      const now = new Date();
      filters.afterDate  = new Date(now.getTime() - 45 * 60 * 1000).toISOString();
      filters.beforeDate = new Date(now.getTime() + 45 * 60 * 1000).toISOString();
    } else if (selectedTimeFilter === 'Schedule' && date) {
      // "Schedule": 2 hours before to 2 hours after the selected date
      filters.afterDate  = new Date(date.getTime() - 2 * 60 * 60 * 1000).toISOString();
      filters.beforeDate = new Date(date.getTime() + 2 * 60 * 60 * 1000).toISOString();
    }

    const hasStart = !!searchData.start?.geometry?.location;
    const hasDest  = !!searchData.destination?.geometry?.location;
    let searchType = 'none';
    if (hasStart && hasDest) searchType = 'both';
    else if (hasStart) searchType = 'start';
    else if (hasDest)  searchType = 'destination';

    if (hasStart) {
      filters.startLocationLat = searchData.start.geometry.location.lat;
      filters.startLocationLng = searchData.start.geometry.location.lng;
      filters.radiusKm = RADIUS_KM;
    }
    if (hasDest) {
      filters.endLocationLat = searchData.destination.geometry.location.lat;
      filters.endLocationLng = searchData.destination.geometry.location.lng;
      filters.radiusKm = RADIUS_KM; // Apply radius for fuzzy search
    }
    filters.timeFilter = selectedTimeFilter;
    filters.searchType = searchType;
    await fetchAvailableRides(filters);
  }, [selectedTransport, selectedGender, date, selectedTimeFilter, searchData, fetchAvailableRides]);

  useEffect(() => {
    handleSearch();
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current.scrollToEnd({ animated: true }), 150);
    }
  }, [selectedTransport, selectedGender, date, selectedTimeFilter, searchData, handleSearch]);

  // Clear everything when leaving the screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        resetSearchData();
        setShowSearch(true);
        setSelectedTransport(null);
        setSelectedGender(null);
        setDate(null);
        setSelectedTimeFilter('All');
      };
    }, [resetSearchData])
  );

  const onDateChange = (selectedDate) => {
    setDate(selectedDate || date);
    setShowDatePicker(false);
  };

  const handleDatePickerCancel = () => {
    setShowDatePicker(false);
    if (!date) setSelectedTimeFilter('Leave now');
  };

  // Reset ALL search params — location, time, filters
  const handleResetAll = useCallback(() => {
    resetSearchData();
    setShowSearch(true);
    setSelectedTransport(null);
    setSelectedGender(null);
    setDate(null);
    setSelectedTimeFilter('All');
    setDraftTransport(null);
    setDraftGender(null);
  }, [resetSearchData]);

  const openFilterModal = () => {
    // Seed draft from current applied values
    setDraftTransport(selectedTransport);
    setDraftGender(selectedGender);
    setShowFilters(true);
  };

  const applyFilters = () => {
    setSelectedTransport(draftTransport);
    setSelectedGender(draftGender);
    setShowFilters(false);
  };

  const clearDraft = () => {
    setDraftTransport(null);
    setDraftGender(null);
  };

  const activeFilterCount = (selectedTransport ? 1 : 0) + (selectedGender && selectedGender !== 'Any' ? 1 : 0);
  const hasAnyFilter = activeFilterCount > 0 || !!searchData.start || !!searchData.destination || selectedTimeFilter !== 'All';

  return (
    <ScrollView innerRef={scrollRef}>

      {/* Header row: title + reset button */}
      <View style={styles.titleRow}>
        <Title style={{ marginBottom: 0 }}>Search for a ride</Title>
        {hasAnyFilter && (
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetAll}>
            <Ionicons name="refresh" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {!searchData.start?.name && !searchData.destination?.name && !searchData.start?.geometry && !searchData.destination?.geometry ? (
        <Search
          title="Where to today?"
          onPress={() => router.push('/searchRoute')}
        />
      ) : (
        <View style={styles.dropdownContainer}>
          <Search
            title={searchData.start?.name || 'Starting point'}
            onPress={() => router.push('/searchRoute')}
            style={{marginBottom: 0}}
          />
          <Search
            title={searchData.destination?.name || 'Destination'}
            onPress={() => router.push('/searchRoute')}
          />
        </View>
      )}

      {/* Time + filter controls */}
      <View style={styles.controlsRow}>
        <View style={[styles.scheduleContainer, { flex: 1 }]}>
          {['All', 'Leave now', 'Schedule'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.scheduleOption, selectedTimeFilter === f && styles.scheduleOptionActive]}
              onPress={() => handleTimeFilterChange(f)}
            >
              <Text style={[styles.scheduleOptionText, selectedTimeFilter === f && styles.scheduleOptionTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.filterToggle, activeFilterCount > 0 && styles.filterToggleActive]}
          onPress={openFilterModal}
        >
          <FontAwesome6 name="sliders" size={14} color={activeFilterCount > 0 ? 'white' : '#333'} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Scheduled date pill */}
      {selectedTimeFilter === 'Schedule' && date && (
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <FontAwesome name="calendar" size={14} color="#fff" />
          <Text style={styles.dateButtonText}>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })},{' '}
            {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </Text>
          <FontAwesome name="chevron-right" size={12} color="#fff" />
        </TouchableOpacity>
      )}

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="datetime"
        date={date || new Date()}
        onConfirm={onDateChange}
        onCancel={handleDatePickerCancel}
      />

      {/* Filter modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilters(false)} />
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetHeaderText}>Filters</Text>
            <TouchableOpacity onPress={clearDraft}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          </View>

          {/* Transport */}
          <Text style={styles.filterLabel}>Transport mode</Text>
          <View style={styles.filterOptions}>
            {TRANSPORT_OPTIONS.map(({ key, label, icon }) => {
              const active = draftTransport === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setDraftTransport(active ? null : key)}
                >
                  {React.cloneElement(icon, { color: active ? '#fff' : '#555' })}
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Gender */}
          <Text style={[styles.filterLabel, { marginTop: 20 }]}>Gender preference</Text>
          <View style={styles.filterOptions}>
            {GENDER_OPTIONS.map(({ key, label, icon }) => {
              const active = draftGender === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setDraftGender(active ? null : key)}
                >
                  {React.cloneElement(icon, { color: active ? '#fff' : '#555' })}
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Apply */}
          <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
            <Text style={styles.applyBtnText}>Apply filters</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Rides 
      <Title style={{ marginTop: 10 }}>Available rides</Title>
*/}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f1f1f" />
          <Text style={styles.loadingText}>Finding rides...</Text>
        </View>
      ) : rides.length > 0 ? (
        rides.map((ride, index) => (
          <RideCard
            key={index}
            ride={ride}
            join={true}
            onPress={() => router.push(`/ride/${ride.id}`)}
          />
        ))
      ) : (
        <>
          <Text style={{ marginVertical: 10 }}>No rides found matching your criteria.</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/(createRide)/chooseRoute')}>
            <Text style={styles.buttonTitle}>Create a ride</Text>
            <FontAwesome name="chevron-right" size={14} color="#fff" />
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

export default AvailableRides;

const styles = StyleSheet.create({
  titleRow: {
    width: '100%',
    alignItems: 'center',
    alignContent: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    marginBottom: 4,
  },
  resetBtn: {
    gap: 5,
    backgroundColor: '#888',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  resetBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  button: {
    marginVertical: 10,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#1f1f1f',
    flexDirection: 'row',
    alignContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  buttonTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 6,
    width: '95%',
  },
  dropdownContainer: {
    borderColor: '#ababab',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 15,
    width: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  scheduleContainer: {
    flexDirection: 'row',
    backgroundColor: '#e6e6e6',
    borderRadius: 12,
  },
  scheduleOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleOptionActive: {
    backgroundColor: '#1f1f1f',
  },
  scheduleOptionText: {
    fontSize: 13,
    color: '#000',
  },
  scheduleOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#888',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  dateButtonText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#fff',
  },
  filterToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#999',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    position: 'relative',
  },
  filterToggleActive: {
    backgroundColor: '#1f1f1f',
    borderColor: '#1f1f1f',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#e63e4c',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  clearAllText: {
    fontSize: 13,
    color: '#e63e4c',
    fontWeight: '600',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: '#e0e0e0',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#fafafa',
  },
  filterChipActive: {
    backgroundColor: '#1f1f1f',
    borderColor: '#1f1f1f',
  },
  filterChipText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  applyBtn: {
    marginTop: 28,
    backgroundColor: '#1f1f1f',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});