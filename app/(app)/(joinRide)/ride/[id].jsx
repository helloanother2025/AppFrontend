import { StyleSheet, TouchableOpacity } from 'react-native'
import { StyledText as Text } from '../../../../components/StyledText'
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView'
import { StyledNavigatorButton as NavButton } from '../../../../components/StyledNavigatorButton'
import RideDetailsCard from '../../../../components/RideDetailsCard'
import RouteMap from '../../../../components/RouteMap'
import BottomSheet from '../../../../components/BottomSheet';
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSearch } from '../../../../context/SearchContext';
import FontAwesome from '@expo/vector-icons/FontAwesome'
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRide } from '../../../../context/RideContext';

const RideDetails = () => {
  const { id } = useLocalSearchParams();
  const { searchData } = useSearch();
  const { rides, getRideDetails } = useRide();
  const [ride, setRide] = useState(null);

  const rideId = Array.isArray(id) ? id[0] : id;

  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const fetched = await getRideDetails(rideId);
      const fallback = rides.find((r) => String(r.id) === String(rideId));
      if (isMounted) {
        setRide(fetched || fallback || null);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [rideId, getRideDetails, rides]);

  if (!ride) {
    return (
      <ScrollView>
        <Text>Ride not found.</Text>
      </ScrollView>
    );
  }

  const userStartCoords = searchData.start?.coords;
  const userDestCoords = searchData.destination?.coords;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavButton style={styles.backButton} onPress={() => router.back()} />


      <RouteMap ride={ride} userStartCoords={userStartCoords} userDestCoords={userDestCoords} small={false} />

      <BottomSheet initialPosition="collapsed">
        <RideDetailsCard ride={ride} join={true}/>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

export default RideDetails;

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1,
    backgroundColor: '#fff'
  }
});