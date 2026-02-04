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
import { useSearch } from '../../../context/SearchContext';
import { useRouter } from 'expo-router';
import * as polyline from '@mapbox/polyline';
import { useRide } from '../../../context/RideContext';
import { useFocusEffect } from '@react-navigation/native';
import { parseServerDate } from '../../../src/utils/date';

const toRad = (x) => (x * Math.PI) / 180;

function normLatLng(p) {
  if (!p) return null;
  return {
    latitude: p.latitude ?? p.lat,
    longitude: p.longitude ?? p.lng,
  };
}

function haversineKm(aIn, bIn) {
  const a = normLatLng(aIn);
  const b = normLatLng(bIn);
  if (!a || !b) return Infinity;

  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function xyAt(refLat, pIn) {
  const p = normLatLng(pIn);
  const x = toRad(p.longitude) * Math.cos(toRad(refLat));
  const y = toRad(p.latitude);
  return { x, y };
}

// Project point P onto segment V->W 
function projectPointToSegment(pIn, vIn, wIn) {
  const p = normLatLng(pIn);
  const v = normLatLng(vIn);
  const w = normLatLng(wIn);
  if (!p || !v || !w) {
    return { distKm: Infinity, t: 0, proj: null, segLenKm: 0 };
  }

  const refLat = (v.latitude + w.latitude) / 2;
  const P = xyAt(refLat, p);
  const V = xyAt(refLat, v);
  const W = xyAt(refLat, w);

  const vx = W.x - V.x;
  const vy = W.y - V.y;
  const len2 = vx * vx + vy * vy;

  let t = 0;
  if (len2 > 0) {
    t = ((P.x - V.x) * vx + (P.y - V.y) * vy) / len2;
    t = Math.max(0, Math.min(1, t));
  }

  const proj = {
    latitude: v.latitude + t * (w.latitude - v.latitude),
    longitude: v.longitude + t * (w.longitude - v.longitude),
  };

  const distKm = haversineKm(p, proj);
  const segLenKm = haversineKm(v, w);

  return { distKm, t, proj, segLenKm };
}

// Location near polyline + cumulative position (km) along route 
function projectPointToRoute(locationIn, routePolyline, thresholdKm) {
  const location = normLatLng(locationIn);
  if (!location || !routePolyline) {
    return { onRoute: false, posKm: -1, minDistKm: Infinity };
  }

  const routeCoords = polyline
    .decode(routePolyline)
    .map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

  if (routeCoords.length < 2) {
    return { onRoute: false, posKm: -1, minDistKm: Infinity };
  }

  let bestMinDist = Infinity;
  let bestPosKm = 0;
  let cumulative = 0;

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const v = routeCoords[i];
    const w = routeCoords[i + 1];
    const { distKm, t, segLenKm } = projectPointToSegment(location, v, w);
    if (distKm < bestMinDist) {
      bestMinDist = distKm;
      bestPosKm = cumulative + t * segLenKm;
    }
    cumulative += segLenKm;
  }

  return {
    onRoute: bestMinDist <= thresholdKm,
    posKm: bestPosKm,
    minDistKm: bestMinDist,
  };
}


const AvailableRides = () => {
  const router = useRouter();
  const { searchData, resetSearchData } = useSearch();
  const scrollRef = useRef(null);
  const { rides: availableRides, fetchAvailableRides } = useRide();

  const [showSearch, setShowSearch] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [date, setDate] = useState(null);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [leaveNow, setLeaveNow] = useState(false);
  const [displayedRides, setDisplayedRides] = useState([]);

  const getRideStartDate = (ride) => {
    const raw = ride?.start_time ?? ride?.startTime ?? ride?.start_time_utc ?? ride?.startTimeUtc ?? ride?.dateTime;
    if (!raw) return null;
    const parsed = raw instanceof Date ? raw : parseServerDate(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const filterRides = async (ridesList) => {
    const RADIUS_THRESHOLD_KM = 5; // near endpoints
    const ROUTE_THRESHOLD_KM = 2;  // near the route
    const ORDER_EPS_KM = 0.05;     // tolerance
    const { start, destination } = searchData;
    const startCoords = start?.coords;
    const destCoords = destination?.coords;
    let filtered = ridesList;
    if (startCoords && destCoords) {
      filtered = ridesList.filter((ride) => {
        const ridePolyline = ride.routePolyline;

        // 1) projections to route
        const startProj = projectPointToRoute(
          { latitude: startCoords.latitude ?? startCoords.lat, longitude: startCoords.longitude ?? startCoords.lng },
          ridePolyline,
          ROUTE_THRESHOLD_KM
        );
        const destProj = projectPointToRoute(
          { latitude: destCoords.latitude ?? destCoords.lat, longitude: destCoords.longitude ?? destCoords.lng },
          ridePolyline,
          ROUTE_THRESHOLD_KM
        );

        // 2) endpoint fallbacks
        const startNearStart = haversineKm(ride.start.coords, startCoords) <= RADIUS_THRESHOLD_KM;
        const destNearEnd   = haversineKm(ride.destination.coords, destCoords) <= RADIUS_THRESHOLD_KM;

        const startOK = startProj.onRoute || startNearStart;
        const destOK  = destProj.onRoute  || destNearEnd;

        // 3) ordering only when both points are on the route
        let orderOK = true;
        if (startProj.onRoute && destProj.onRoute) {
          orderOK = startProj.posKm <= destProj.posKm + ORDER_EPS_KM;
        }

        return startOK && destOK && orderOK;
      });
    } else if (startCoords || destCoords) {
      filtered = ridesList.filter((ride) => {
        const sMatch = startCoords
          ? haversineKm(ride.start.coords, startCoords) <= RADIUS_THRESHOLD_KM
          : true;
        const dMatch = destCoords
          ? haversineKm(ride.destination.coords, destCoords) <= RADIUS_THRESHOLD_KM
          : true;
        return sMatch && dMatch;
      });
    }

    // Date and "leave now" filters
    if (leaveNow) {
      const now = new Date();
      const nowPlus = new Date(now.getTime() + 30 * 60 * 1000);
      filtered = filtered.filter((ride) => {
        const rideDate = getRideStartDate(ride);
        return rideDate && rideDate >= now && rideDate <= nowPlus;
      });
    } else if (date) {
      filtered = filtered.filter((ride) => {
        const rideDate = getRideStartDate(ride);
        return rideDate && rideDate >= date;
      });
    }

    // Transport and gender filters (case-insensitive)
    filtered = filtered.filter((ride) => {
      if (selectedTransport) {
        const rideTransport = ride.transport ?? ride.transport_mode ?? ride.transportMode;
        if (!rideTransport || rideTransport.toLowerCase() !== selectedTransport.toLowerCase()) return false;
      }
      if (selectedGender && selectedGender !== 'Any') {
        const rideGender = ride.gender ?? ride.gender_preference ?? ride.genderPreference;
        if (!rideGender || rideGender.toLowerCase() !== selectedGender.toLowerCase()) return false;
      }
      return true;
    });

    return filtered;
  };

  useEffect(() => {
    fetchAvailableRides();
  }, [fetchAvailableRides]);

  useFocusEffect(
    useCallback(() => {
      resetSearchData();
      setShowSearch(true);
      return () => {};
    }, [resetSearchData])
  );

  useEffect(() => {
    (async () => {
      const filtered = await filterRides(availableRides);
      setDisplayedRides(filtered);

      if (scrollRef.current) {
        setTimeout(() => scrollRef.current.scrollToEnd({ animated: true }), 150);
      }
    })();
  }, [selectedTransport, selectedGender, date, leaveNow, searchData, availableRides]);

  const onDateChange = (selectedDate) => setDate(selectedDate || date);

  const buildFilterParams = () => {
    const params = {};
    if (selectedTransport) params.transportMode = selectedTransport;
    if (selectedGender && selectedGender !== 'Any') params.genderPreference = selectedGender;
    if (leaveNow) {
      const now = new Date();
      const nowPlus = new Date(now.getTime() + 30 * 60 * 1000);
      params.afterDate = now.toISOString();
      params.beforeDate = nowPlus.toISOString();
    } else if (date) {
      params.afterDate = date.toISOString();
    }
    return params;
  };

  const handleSearch = async () => {
    await fetchAvailableRides(buildFilterParams());
    const filtered = await filterRides(availableRides);
    setDisplayedRides(filtered);
    setShowSearch(true);
  };

  const toggleLeaveNow = () => {
    setLeaveNow(!leaveNow);
  }

  const clearFilters = () => {
    setSelectedTransport(null);
    setSelectedGender(null);
    setDate(null);
    setLeaveNow(false);
    setDisplayedRides(availableRides);
  };

  return (
    <ScrollView innerRef={scrollRef}>
      <Title>Search for a ride</Title>

      {showSearch && <Search title="Where to today?" onPress={() => setShowSearch(false)} />}

      {!showSearch && (
        <View style={styles.dropdownContainer}>
          <Search
            title={searchData.start?.name || 'Starting point'}
            onPress={() => router.push('/searchStart')}
          />
          <Search
            title={searchData.destination?.name || 'Destination'}
            onPress={() => router.push('/searchDest')}
          />
          <StyledDateTimePicker
            style={{ width: '100%' }}
            text="Date & time"
            value={date}
            mode="datetime"
            onChange={onDateChange}
          />
          <Button title="Ready to go" onPress={handleSearch} style={{ width: '100%' }} />
        </View>
      )}

      <View style={styles.buttonRow}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Switch
            trackColor={{false: '#ababab', true: '#c9c9c9'}}
            thumbColor={leaveNow ? '#e63e4c' : '#000'}
            value={leaveNow}
            onValueChange={toggleLeaveNow}
          /> 
          <Text style={{marginLeft: 5, color: leaveNow ? '#e63e4c' : '000'}}>Leave now</Text>
        </View>
         

        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}>
          <FontAwesome6 name="sliders" size={14} color="white" />
          <Text style={styles.filterToggleText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <BorderView style={{ width: '100%' }}>
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
                      size={22}
                      color={selectedTransport === type ? 'white' : '#444'}
                    />
                  ) : (
                    <FontAwesome
                      name={type === 'Car' ? 'car' : 'bus'}
                      size={14}
                      color={selectedTransport === type ? 'white' : '#444'}
                    />
                  )}
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedTransport === type && { color: 'white' },
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
                    color={selectedGender === g ? 'white' : '#444'}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedGender === g && { color: 'white' },
                    ]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={{ color: '#fff' }}>Clear</Text>
            <MaterialCommunityIcons name="close" size={14} color="#fff" />
          </TouchableOpacity>
        </BorderView>
      )}

      <Title style={{marginTop: 10}}>Available rides</Title>

      {displayedRides.length > 0 ? (
        displayedRides.map((ride, index) => (
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
          <TouchableOpacity style={styles.button} onPress={() => router.push('/chooseStart')}>
            <Text style={styles.buttonTitle}>Create a Ride</Text>
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
    backgroundColor: '#222',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  filterToggleText: {
    color: 'white',
    marginLeft: 6,
    fontSize: 13,
  },
  filterGroup: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    fontWeight: '500',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: 'white',
  },
  filterChipActive: {
    backgroundColor: '#1f1f1f',
    borderColor: '#1f1f1f',
  },
  filterChipText: {
    marginLeft: 6,
    color: '#333',
    fontSize: 13,
  },
  clearButton: { 
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignSelf: 'flex-end', 
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#888', 
    width: '30%', 
  },
})