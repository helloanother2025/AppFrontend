import { StyleSheet, View } from 'react-native';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledNavigatorButton as NavButton } from '../../../components/StyledNavigatorButton'
import RideDetailsCard from '../../../components/RideDetailsCard';
import RouteMap from '../../../components/RouteMap';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSearch } from '../../../context/SearchContext';
import rides from '../../../data/rideData.json';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '../../../components/BottomSheet';

const RideDetails = () => {
  const { id } = useLocalSearchParams();
  const { searchData } = useSearch();
  const ride = rides.find((r) => r.id === parseInt(id));
  const router = useRouter();
  

  if (!ride) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Ride not found.</Text>
      </View>
    );
  }

  const userStartCoords = searchData.start?.coords;
  const userDestCoords = searchData.destination?.coords;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavButton style={styles.backButton} onPress={() => router.back()} />

      <RouteMap ride={ride} userStartCoords={userStartCoords} userDestCoords={userDestCoords} small={false} />

      <BottomSheet initialPosition="collapsed" topSnap={0.25} bottomSnap={0.7}>
        <RideDetailsCard ride={ride} join={true} onUserPress={() => router.push(`/user/${ride.creator.handle}`)}/>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

export default RideDetails;

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
    backgroundColor: '#fff'
  },
});