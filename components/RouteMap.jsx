import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import CustomMarker from './CustomMapMarker';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { getDirections, decodePolyline } from '../src/utils/mapServices';


const RouteMap = ({ ride, userStartCoords, userDestCoords, small = true, style, rideColor = '#1f1f1f', userColor = '#888888' }) => {
  const mapRef = useRef(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [userRouteCoords, setUserRouteCoords] = useState([]);

  const startCoords = ride?.start?.coords ? { latitude: ride.start.coords.lat, longitude: ride.start.coords.lng } : null;
  const destCoords = ride?.destination?.coords ? { latitude: ride.destination.coords.lat, longitude: ride.destination.coords.lng } : null;
  const userStart = userStartCoords ? { latitude: userStartCoords.lat, longitude: userStartCoords.lng } : null;
  const userDest = userDestCoords ? { latitude: userDestCoords.lat, longitude: userDestCoords.lng } : null;

  useEffect(() => {
    if (!startCoords || !destCoords) return;

    // If polyline already exists, decode and use it directly
    if (ride.routePolyline) {
      if (typeof ride.routePolyline === 'string' && ride.routePolyline.trim() === '') {
        // If it's an empty string, treat it as no polyline data
        console.warn("ride.routePolyline is an empty string, treating as no polyline data.");
        setRouteCoords([]);
        return; 
      }
      try {
        const geoJsonPolyline = typeof ride.routePolyline === 'string' ? JSON.parse(ride.routePolyline) : ride.routePolyline;
        if (geoJsonPolyline && Array.isArray(geoJsonPolyline.coordinates) && geoJsonPolyline.coordinates.length > 0) {
          // GeoJSON coordinates are [longitude, latitude], convert to {latitude, longitude}
          const formattedCoords = geoJsonPolyline.coordinates.map(coord => ({
            longitude: coord[0],
            latitude: coord[1],
          }));
          setRouteCoords(formattedCoords);
        } else {
            console.warn("Parsed routePolyline is not a valid GeoJSON object or has no coordinates.");
            console.log("Malformed geoJsonPolyline:", geoJsonPolyline); // ADDED LOG
            fetchDirections(startCoords, destCoords, setRouteCoords); // Fallback if parsed but invalid
        }
      } catch (e) {
        console.error("Error parsing stored routePolyline as GeoJSON:", e);
        // Fallback to fetching if parsing fails
        fetchDirections(startCoords, destCoords, setRouteCoords);
      }
    } else {
      // Otherwise, fetch or if ride.routePolyline is null/undefined
      fetchDirections(startCoords, destCoords, setRouteCoords);
    }
  }, [ride]);

  useEffect(() => {
    if (userStart && userDest) {
      fetchDirections(userStart, userDest, setUserRouteCoords);
    } else {
      setUserRouteCoords([]);
    }
  }, [userStart?.latitude, userStart?.longitude, userDest?.latitude, userDest?.longitude]);

  const fetchDirections = async (start, destination, setCoords) => {
    try {
      const directions = await getDirections(start, destination);
      if (directions?.coordinates?.length) {
        setCoords(directions.coordinates);
      }
    } catch (error) {
      console.error('Error fetching directions:', error);
    }
  };

  useEffect(() => {
    const allCoords = [...routeCoords, ...userRouteCoords];
    if (allCoords.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: small ? 340 : 100, right: small ? 200 : 50, bottom: small ? 300 : 340, left: small ? 200 : 50 },
        animated: true,
      });
    }
  }, [routeCoords, userRouteCoords]);

  return (
    <View style={[styles.mapWrapper, small ? {aspectRatio: 1.25} : {aspectRatio: 0.5}, style]}>
      <MapView 
        ref={mapRef} 
        style={styles.map}
      >
        {startCoords && <Marker coordinate={startCoords} title="Start" pinColor="orange"/>}
        {destCoords && <Marker coordinate={destCoords} title="Destination" pinColor="#e63e4c"/>}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={6} strokeColor={rideColor} />
        )}

        {userStart && <CustomMarker coordinate={userStart} title="Your pickup" color="#888" iconName="circle" size={18}/>}
        {userDest && <CustomMarker coordinate={userDest} title="Your drop-off" color="#888" iconName="circle"  size={18}/>}
        {userRouteCoords.length > 0 && (
          <Polyline coordinates={userRouteCoords} strokeWidth={3.5} strokeColor={userColor}/>
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