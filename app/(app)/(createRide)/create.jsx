import React, { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { StyledFauxSearch as Search} from '../../../components/StyledFauxSearch' 
import { StyledTitle as Title } from '../../../components/StyledTitle'
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView'
import { StyledBorderText as BorderText } from '../../../components/StyledBorderText' 
import { StyledText as Text } from '../../../components/StyledText'
import { StyledCardButton as CardButton } from '../../../components/StyledCardButton'
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Octicons from '@expo/vector-icons/Octicons';
import { useRouter } from 'expo-router'
import { useRide } from '../../../context/RideContext';
import { useUser } from '../../../context/UserContext';

export default function CreateRide() {
  const router = useRouter();
  const { setRideData, myRides, fetchMyRides } = useRide();
  const { currentUser } = useUser();

  const recentRides = (myRides && myRides.length ? myRides : []).slice(0, 3);

  useEffect(() => {
    fetchMyRides();
  }, [fetchMyRides]);

  return (
    <ScrollView>
      <Title>Create a new ride</Title>

        {/* search field */}
        <Search
          title="Where to today?"
          onPress={() => {
            setRideData({
              creator: {
                name: currentUser?.name || '',
                handle: currentUser?.username ? `@${currentUser.username}` : '',
              },
              start: { name: '', coords: null },
              destination: { name: '', coords: null },
              transport: '',
              date: {day: '', time: ''},
              totalPassengers: 0,
              fare: '',
              partners: [],
              gender: 'Any',
              preferences: '',
              routePolyline: ''
            });
            router.push('/chooseStart');
          }}
        />
    
        <Title>Renew a previous ride</Title>

        {recentRides.map((ride, index) => (
          <CardButton
            key={index}
            onPress={() => {
              setRideData({
                ...ride,
                date: {day: '', time: ''},
                partners: [],
              });
          
              router.push('/(createRide)/resetDate');
            }}
          >
            {/* start location */}
            <View style={styles.rideRow}>
              <Octicons name="dot-fill" size={16} color="#e63e4c" style={styles.icon} />
              <View style={{ flex: 1 }}>
                <BorderText style={[styles.rideText, {marginVertical: 0}]}>{ride.start.name}</BorderText>
              </View>
            </View>

            {/* destination location */}
            <View style={styles.rideRow}>
              <Entypo name="location-pin" size={16} color="#e63e4c" style={styles.icon} />
              <View style={{ flex: 1 }}>
                <BorderText style={[styles.rideText, {marginVertical: 0}]}>{ride.destination.name}</BorderText>
              </View>
            </View>

            {/* time & date */}
            <View style={styles.rideRow}>
              <FontAwesome name="clock-o" size={14} color="#888" style={[styles.icon, {marginLeft: 4}]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rideText}>{ride.date.day} {ride.date.time}</Text>
              </View>
            </View>
          </CardButton>
        ))}

        {recentRides.length === 0 && (
          <Text style={{ marginTop: 10 }}>No previous rides available.</Text>
        )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
   button: {
    marginVertical: 10,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#1f1f1f',
  },
  buttonTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 6,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    flex: 1,
  },
  rideText: {
    fontSize: 14,
    flex: 1,
  },
  icon: {
    marginRight: 10
  }
});