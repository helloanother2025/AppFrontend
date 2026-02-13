import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { StyledFauxSearch as Search } from '../../../components/StyledFauxSearch';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import { StyledTitle as Title } from '../../../components/StyledTitle';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledDateTimePicker } from '../../../components/StyledDateTimePicker';
import { StyledButton as Button } from '../../../components/StyledButton';
import { StyledBorderView as BorderView } from '../../../components/StyledBorderView';
import RideCard from '../../../components/RideDisplayCard';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSearch } from '../../../context/SearchContext';
import { useRide } from '../../../context/RideContext';
import { useRouter } from 'expo-router';


const AvailableRides = () => {
  const router = useRouter();
  const { searchData, resetSearchData } = useSearch();
  const { rides, fetchAvailableRides, loading } = useRide(); // Use useRide hook
  const scrollRef = useRef(null);

  const [showSearch, setShowSearch] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [date, setDate] = useState(null);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('All'); // 'All', 'Leave now', 'Schedule'
  const [showDatePicker, setShowDatePicker] = useState(false);

  const RADIUS_KM = 3; // Default search radius for backend

  const handleTimeFilterChange = (filter) => {
    setSelectedTimeFilter(filter);
    if (filter === 'All') {
      setDate(null);
    } else if (filter === 'Leave now') {
      setDate(null);
    } else if (filter === 'Schedule') {
      // Potentially show date picker immediately if not already set
      if (!date) setShowDatePicker(true);
    }
  };

  const handleSearch = useCallback(async () => {
    const filters = {};
    if (selectedTransport) {
      filters.transportMode = selectedTransport;
    }
    if (selectedGender && selectedGender !== 'Any') {
      filters.genderPreference = selectedGender;
    }

    if (selectedTimeFilter === 'All') {
      // No specific date/time filters for "All" rides, they will be fetched by recency
    } else if (selectedTimeFilter === 'Leave now') {
      const now = new Date();
      // "Leave now": 45 minutes before to 45 minutes after current time
      const fortyFiveMinutesAgo = new Date(now.getTime() - 45 * 60 * 1000);
      const fortyFiveMinutesFromNow = new Date(now.getTime() + 45 * 60 * 1000);
      filters.afterDate = fortyFiveMinutesAgo.toISOString();
      filters.beforeDate = fortyFiveMinutesFromNow.toISOString();
    } else if (selectedTimeFilter === 'Schedule' && date) {
      // "Schedule": 2 hours before to 2 hours after the selected date
      const twoHoursBefore = new Date(date.getTime() - 2 * 60 * 60 * 1000);
      const twoHoursAfter = new Date(date.getTime() + 2 * 60 * 60 * 1000);
      filters.afterDate = twoHoursBefore.toISOString();
      filters.beforeDate = twoHoursAfter.toISOString();
    }
    
    const hasStartLocation = !!searchData.start?.geometry?.location;
    const hasEndLocation = !!searchData.destination?.geometry?.location;

    let searchType = 'none';
    if (hasStartLocation && hasEndLocation) {
      searchType = 'both';
    } else if (hasStartLocation) {
      searchType = 'start';
    } else if (hasEndLocation) {
      searchType = 'destination';
    }

    // Add location filters from searchData if available
    if (hasStartLocation) {
      filters.startLocationLat = searchData.start.geometry.location.lat;
      filters.startLocationLng = searchData.start.geometry.location.lng;
      filters.radiusKm = RADIUS_KM; // Apply radius for fuzzy search
    }
    if (hasEndLocation) {
      filters.endLocationLat = searchData.destination.geometry.location.lat;
      filters.endLocationLng = searchData.destination.geometry.location.lng;
      filters.radiusKm = RADIUS_KM; // Apply radius for fuzzy search
    }
    filters.timeFilter = selectedTimeFilter; // Pass the active time filter
    filters.searchType = searchType; // Pass the determined search type
    await fetchAvailableRides(filters);
  }, [selectedTransport, selectedGender, date, selectedTimeFilter, searchData, fetchAvailableRides]);

  useEffect(() => {
    handleSearch();
    if (scrollRef.current) {
        setTimeout(() => scrollRef.current.scrollToEnd({ animated: true }), 150);
    }
  }, [selectedTransport, selectedGender, date, selectedTimeFilter, searchData, handleSearch]); // Depend on handleSearch, which now encapsulates all filter states

  const onDateChange = (selectedDate) => {
    setDate(selectedDate || date);
    setShowDatePicker(false);
  };

  const handleDatePickerCancel = () => {
    setShowDatePicker(false);
    if (!date) {
      // If date was not set and user cancels, revert to "Leave now"
      setSelectedTimeFilter('Leave now');
    }
  }

  const clearFilters = useCallback(() => {
    setSelectedTransport(null);
    setSelectedGender(null);
    setDate(null);
    setSelectedTimeFilter('All'); // Reset to 'All'
    resetSearchData(); // Clear location search data
  }, [resetSearchData]);

  return (
    <ScrollView innerRef={scrollRef}>
      <Title>Search for a ride</Title>

      {showSearch && <Search title="Where to today?" onPress={() => {router.push('/searchRoute'); setShowSearch(false)}} />}

      {!showSearch && (
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

      <View style={styles.controlsContainer}>
        <View style={styles.scheduleContainer}>
          <TouchableOpacity
            style={[styles.scheduleOption, selectedTimeFilter === 'All' && styles.scheduleOptionActive]}
            onPress={() => handleTimeFilterChange('All')}>
            <Text style={[styles.scheduleOptionText, selectedTimeFilter === 'All' && styles.scheduleOptionTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scheduleOption, selectedTimeFilter === 'Leave now' && styles.scheduleOptionActive]}
            onPress={() => handleTimeFilterChange('Leave now')}>
            <Text style={[styles.scheduleOptionText, selectedTimeFilter === 'Leave now' && styles.scheduleOptionTextActive]}>
              Leave now
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scheduleOption, selectedTimeFilter === 'Schedule' && styles.scheduleOptionActive]}
            onPress={() => handleTimeFilterChange('Schedule')}>
            <Text style={[styles.scheduleOptionText, selectedTimeFilter === 'Schedule' && styles.scheduleOptionTextActive]}>
              Schedule
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTimeFilter === 'Schedule' && date && (
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}>
            <FontAwesome name="calendar" size={14} color="#e63e4c" />
            <Text style={styles.dateButtonText}>
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </Text>
            <FontAwesome name="chevron-right" size={12} color="#e63e4c" />
          </TouchableOpacity>
        )}


        <TouchableOpacity
          style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
          onPress={() => setShowFilters(!showFilters)}>
          <FontAwesome6 name="sliders" size={14} color={showFilters ? "white" : "#333"} />
          <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
            Filters
          </Text>
          {(selectedTransport || selectedGender) && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {(selectedTransport ? 1 : 0) + (selectedGender ? 1 : 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="datetime"
        date={date || new Date()}
        onConfirm={onDateChange}
        onCancel={handleDatePickerCancel}
      />

      {showFilters && (
        <BorderView style={styles.filtersContainer}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterHeaderText}>Filter by:</Text>
            {(selectedTransport || selectedGender) && (
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Transport</Text>
            <View style={styles.filterOptions}>
              {['Car', 'CNG', 'Bus'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    selectedTransport === type && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setSelectedTransport(selectedTransport === type ? null : type)
                  }>
                  {type === 'CNG' ? (
                    <MaterialCommunityIcons
                      name="rickshaw"
                      size={18}
                      color={selectedTransport === type ? 'white' : '#666'}
                    />
                  ) : (
                    <FontAwesome
                      name={type === 'Car' ? 'car' : 'bus'}
                      size={14}
                      color={selectedTransport === type ? 'white' : '#666'}
                    />
                  )}
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedTransport === type && styles.filterChipTextActive,
                    ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Gender</Text>
            <View style={styles.filterOptions}>
              {['Any', 'Male', 'Female'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.filterChip,
                    selectedGender === g && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedGender(selectedGender === g ? null : g)}>
                  <FontAwesome6
                    name={
                      g === 'Male' ? 'person' : g === 'Female' ? 'person-dress' : 'users'
                    }
                    size={14}
                    color={selectedGender === g ? 'white' : '#666'}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedGender === g && styles.filterChipTextActive,
                    ]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </BorderView>
      )}

      <Title style={{marginTop: 10}}>Available rides</Title>

      {rides.length > 0 ? (
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
    borderColor: '#2a2a2a',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 15,
    alignContent: 'flex-start',
    width: '100%',
  },
  controlsContainer: {
    width: '100%',
    marginBottom: 10,
  },
  scheduleContainer: {
    flexDirection: 'row',
    backgroundColor: '#e6e6e6',
    borderRadius: 14,
    marginBottom: 10,
  },
  scheduleOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleOptionActive: {
    backgroundColor: '#e63e4c',
  },
  scheduleOptionText: {
    fontSize: 14,
    color: '#000',
  },
  scheduleOptionTextActive: {
    color: '#fff',
    fontWeight: 'semibold',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignContent: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e63e4c',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  dateButtonText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#000',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignContent: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#999',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    position: 'relative',
  },
  filterToggleActive: {
    backgroundColor: '#1f1f1f',
    borderColor: '#1f1f1f',
  },
  filterToggleText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: 'semibold',
    color: '#000',
  },
  filterToggleTextActive: {
    color: 'white',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#e63e4c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  filtersContainer: {
    width: '100%',
    marginTop: 10,
    marginBottom: 15,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterHeaderText: {
    fontSize: 16,
    fontWeight: 'semibold',
    color: '#000',
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    color: '#000',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#e6e6e6',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },
  filterChipActive: {
    backgroundColor: '#1f1f1f',
    borderColor: '#1f1f1f',
  },
  filterChipText: {
    marginLeft: 6,
    color: '#000',
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  clearButton: { 
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e63e4c',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
})