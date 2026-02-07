import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import CustomMarker from './CustomMapMarker';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { mapLight } from './mapLight';
import { mapDark } from './mapDark';
import { useTheme } from '../context/ThemeContext';

const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Simple in-memory cache to avoid redundant Directions API calls
const directionsCache = new Map();

const RouteMap = ({ ride, userStartCoords, userDestCoords, small = true, style }) => {
  const mapRef = useRef(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [userRouteCoords, setUserRouteCoords] = useState([]);
  const {theme} = useTheme();

  const startCoords = ride?.start?.coords ? { latitude: ride.start.coords.lat, longitude: ride.start.coords.lng } : null;
  const destCoords = ride?.destination?.coords ? { latitude: ride.destination.coords.lat, longitude: ride.destination.coords.lng } : null;
  const userStart = userStartCoords ? { latitude: userStartCoords.lat, longitude: userStartCoords.lng } : null;
  const userDest = userDestCoords ? { latitude: userDestCoords.lat, longitude: userDestCoords.lng } : null;

  useEffect(() => {
    if (!startCoords || !destCoords) return;

    // If polyline already exists, decode and use it directly
    if (ride.routePolyline) {
      const decoded = decodePolyline(ride.routePolyline);
      setRouteCoords(decoded);
    } else {
      // Otherwise, fetch 
      fetchDirections(startCoords, destCoords, setRouteCoords);
    }
  }, [ride]);

  useEffect(() => {
    if (userStart && userDest) {
      fetchDirections(userStart, userDest, setUserRouteCoords);
    }
  }, [userStart, userDest]);

  const fetchDirections = async (start, destination, setCoords) => {
    try {
      const cacheKey = `${start.latitude},${start.longitude}-${destination.latitude},${destination.longitude}`;

      if (directionsCache.has(cacheKey)) {
        setCoords(directionsCache.get(cacheKey));
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&key=${GOOGLE_MAPS_APIKEY}`
      );
      const json = await response.json();

      if (json.routes.length) {
        const encoded = json.routes[0].overview_polyline.points;
        const decoded = decodePolyline(encoded);
        setCoords(decoded);
        directionsCache.set(cacheKey, decoded);

        // await updateRideRoute(ride.id, encoded);
      }
    } catch (error) {
      console.error('Error fetching directions:', error);
    }
  };

  useEffect(() => {
    const allCoords = [...routeCoords, ...userRouteCoords];
    if (allCoords.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: small ? 340 : 180, right: 200, bottom: small ? 300 : 260, left: 200 },
        animated: true,
      });
    }
  }, [routeCoords, userRouteCoords]);

  const decodePolyline = (t) => {
    let points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < t.length) {
      let b, shift = 0, result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }

    return points;
  };

  return (
    <View style={[styles.mapWrapper, small ? {aspectRatio: 1.25} : {aspectRatio: 0.5}, style]}>
      <MapView 
        ref={mapRef} 
        style={styles.map} 
        customMapStyle={theme === 'dark' ? mapDark : mapLight}
      >
        {startCoords && <Marker coordinate={startCoords} title="Start" pinColor="orange"/>}
        {destCoords && <Marker coordinate={destCoords} title="Destination" pinColor="#e63e4c"/>}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={6} strokeColor={theme === 'dark' ? "#c9c9c9" : "#1f1f1f"} />
        )}
        
        {userStart && <CustomMarker coordinate={userStart} title="Your pickup" color="#888" iconName="circle" size={18}/>}
        {userDest && <CustomMarker coordinate={userDest} title="Your drop-off" color="#888" iconName="circle"  size={18}/>}
        {userRouteCoords.length > 0 && (
          <Polyline coordinates={userRouteCoords} strokeWidth={4} strokeColor="#ababab"/>
        )}
      </MapView>
    </View>
  );
};

export default RouteMap;

const styles = StyleSheet.create({
  mapWrapper: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
