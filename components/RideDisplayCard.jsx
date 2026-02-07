import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StyledText as Text } from './StyledText';
import { StyledCardButton as CardButton } from './StyledCardButton';
import { StyledButton as Button } from './StyledButton';
import { StyledBorderText as BorderText } from './StyledBorderText';
import { StyledBorderView as BorderView } from './StyledBorderView';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Octicons from '@expo/vector-icons/Octicons';
import { useRouter } from 'expo-router'; 

export default function RideDisplayCard({ ride, style, join = false, create = false, ongoing = false, previous = false, onPress }) {
  const [isRequested, setIsRequested] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const router = useRouter();

  const handleRequest = () => {
    router.push('/joinRequested')
    setIsRequested(true);
  };

  const handleComplete = () => {
    router.push('/complete')
    setIsCompleted(true);
  };

  return (
    <CardButton style={style} onPress={onPress} disabled={onPress ? false : true}>

    {(join || create) && (ride.gender != 'Any') && (
        <View
          style={[
            styles.genderBadge,
            ride.gender.toLowerCase() === 'female' ? styles.femaleBadge : styles.maleBadge
          ]}>
          <Text style={styles.genderText}>
            {ride.gender.toLowerCase() === 'female' ? 'Female only' : 'Male only'}
          </Text>
        </View>
      )}

      {/* Ride creator */}
      {(!previous) && (
        <View style={styles.creatorRow}>
          <Text style={{ fontSize: 30 }}>👤 </Text>
          <View>
            <Text style={{ fontWeight: 'semibold', fontSize: 16 }}>{ride.creator.name}</Text>
            <Text style={styles.handle}>{ride.creator.handle}</Text>
          </View>
        </View>
      )}
      
      {/* Start location */}
      <View style={[styles.rideRow, { marginVertical: 0 }]}>
        <Octicons name="dot-fill" size={18} color="#e63e4c" style={styles.icon} />
        <View style={{ flex: 1 }}>
          <BorderText style={styles.rideText}>{ride.start.name}</BorderText>
        </View>
      </View>

      {/* Destination */}
      <View style={[styles.rideRow, { marginVertical: 0 }]}>
        <Entypo name="location-pin" size={18} color="#e63e4c" style={styles.icon} />
        <View style={{ flex: 1 }}>
          <BorderText style={styles.rideText}>{ride.destination.name}</BorderText>
        </View>
      </View>

      {/* Time & date */}
      {ride.date.day && ride.date.time && (
        <View style={styles.rideRow}>
          <FontAwesome name="clock-o" size={14} color="#888" style={[styles.icon, { marginLeft: 4 }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rideText}>{ride.date.day}, {ride.date.time}</Text>
          </View>
        </View>
      )}
      

      {/* Transport, seats, fare */}
      {(ride.transport && !previous && !ongoing) && (
        <View style={styles.transportContainer}>
          <View style={{ width: '33%', flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 12 }}>Transport</Text>
            <Text style={[styles.rideText, { fontWeight: 'semibold' }]}>{ride.transport}</Text>
          </View>

          <View style={{ width: '33%', alignItems: 'center' }}>
            <Text style={{ fontSize: 12 }}>{join ? 'Seats' : create ? 'Passengers' : 'Participants'}</Text>
            <Text style={[styles.rideText, { fontWeight: 'semibold' }]}>
              {join ? ride.totalPassengers - ride.partners.length : create ? ride.totalPassengers : ride.partners.length + 1}
            </Text>
          </View>

          <View style={{ width: '33%', alignItems: 'center' }}>
            <Text style={{ fontSize: 12 }}>Total fare</Text>
            {ride.fare === 'TBA' ? (
              <Text style={[styles.rideText, { fontWeight: 'semibold' }]}>TBA</Text>
            ) : (
              <Text style={[styles.rideText, { fontWeight: 'semibold' }]}>৳ {ride.fare}</Text>
            )}
          </View>
        </View>
      )}
      
      {/*
      {join && (
        <Button
          style={[{ marginTop: 10 }, isRequested && { backgroundColor: '#ababab' }]}
          title={isRequested ? "Request sent" : "Request to join"}
          onPress={handleRequest}
          disabled={isRequested}
        />
      )}
      */}

      {ongoing && (
        <Button
          title={isCompleted ? "Ride completed" : "Complete ride"}
          style={[{ marginTop: 10 }, isCompleted && { backgroundColor: '#ababab' }]}
          onPress={handleComplete}
          disabled={isCompleted}
        />
      )}

      {(create && ride.preferences) && ( <>
        <View style={styles.subtitle}>
          <Text style={[styles.rideText,{fontWeight: 'semibold'}]}>Preferences</Text>
        </View>

        <BorderView>
          <View style={{flexDirection: 'row'}}>
            <View style={styles.rideColumn}>
              <Text style={styles.rideText}>Total passengers:</Text>
            </View>
            <View style={styles.rideColumn}>
              <Text style={styles.rideText}>{ride.partners.length} / {ride.totalPassengers}</Text>
            </View>
          </View>

          <View style={{flexDirection: 'row'}}>
            <View style={styles.rideColumn}>
              <Text style={styles.rideText}>Preferred gender:</Text>
            </View>
            <View style={styles.rideColumn}>
              <Text style={styles.rideText}>{ride.gender}</Text>
            </View>
          </View>

          <View style={{flexDirection: 'row'}}>
            <View style={styles.rideColumn}>
              <Text style={styles.rideText}>Other:</Text>
            </View>
            <View style={styles.rideColumn}>
              <Text style={styles.rideText}>{ride.preferences ? ride.preferences : '-'}</Text>
            </View>
          </View>
        </BorderView>
      </>
      )}
    </CardButton>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontWeight: 'semibold', 
    fontSize: 14, 
    marginVertical: 5,
  },
  genderBadge: {
    position: 'absolute',
    top: -10,
    right: 15,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    zIndex: 10,
  },
  femaleBadge: {
    backgroundColor: '#f0a5c6',
  },
  maleBadge: {
    backgroundColor: '#91cdeb',
  },
  genderText: {
    fontSize: 12,
    fontWeight: 'semibold',
    color: '#fff',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 8,
  },
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    flex: 1,
  }, 
  rideColumn: {
    alignItems: 'flex-start',
    marginTop: 5,
    width: '50%'
  },
  rideText: {
    fontSize: 14,
    flex: 1,
  },
  transportContainer: {
    borderRadius: 14,
    backgroundColor: '#eee',
    flexDirection: 'row',
    marginVertical: 6,
    padding: 8,
    alignItems: 'flex-end',
  },
  handle: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
  icon: {
    marginRight: 10,
  },
});
