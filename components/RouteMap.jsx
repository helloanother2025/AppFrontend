import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import CustomMarker from './CustomMapMarker';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { getDirections, decodePolyline } from '../src/utils/mapServices';

const RouteMap = ({ ride, userStartCoords, userDestCoords, rideColor = '#1f1f1f', userColor = '#e63e4c' }) => {
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
        edgePadding: { top: 320, right: 200, bottom: 300, left: 200 },
        animated: true,
      });
    }
  }, [routeCoords, userRouteCoords]);

  return (
    <View style={styles.mapWrapper}>
      <MapView ref={mapRef} style={styles.map}>
        {startCoords && <Marker coordinate={startCoords} title="Start" pinColor="orange"/>}
        {destCoords && <Marker coordinate={destCoords} title="Destination" pinColor="#e63e4c"/>}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={7} strokeColor={rideColor} />
        )}
        
        {userStart && <CustomMarker coordinate={userStart} title="Your pickup" color="#888" iconName="circle" size={18}/>}
        {userDest && <CustomMarker coordinate={userDest} title="Your drop-off" color="#888" iconName="circle"  size={18}/>}
        {userRouteCoords.length > 0 && (
          <Polyline coordinates={userRouteCoords} strokeWidth={4} strokeColor={userColor} />
        )}
      </MapView>
    </View>
  );
};

export default RouteMap;

const styles = StyleSheet.create({
  mapWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#e6e6e6',
    marginVertical: 10,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
