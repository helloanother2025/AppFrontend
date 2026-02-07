import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { StyledText as Text } from '../../../../components/StyledText';
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView';
import { StyledTitle as Title } from '../../../../components/StyledTitle';
import RideCard from '../../../../components/RideDisplayCard';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import rides from '../../../../data/rideData.json';
import React from 'react';

const Dash = () => {
  const activeRide = rides[0];
  const router = useRouter();

  return (
    <>
    <View style={styles.container}>
      <Text style={{ fontWeight: 'bold', color: '#e63e4c', fontSize: 16 }}>
        BashayJabo
      </Text>

      <TouchableOpacity>
        <Ionicons name="settings-sharp" size={24} color="#ababab" />
      </TouchableOpacity>
    </View>

    <ScrollView contentContainerStyle={{paddingTop: 40, paddingBottom: 60}}>
      <Title>Start your journey!</Title>

      {/* Create Ride -> route directly to chooseStart if recent rides empty */}
      <TouchableOpacity style={styles.button} onPress={() => router.push('/create')}>
        <Text style={styles.buttonTitle}>Create a ride</Text>
        <Text style={styles.buttonText}>
          Choose your destination and look for others to share the journey.
        </Text>
      </TouchableOpacity>

      {/* Join Ride */}
      <TouchableOpacity style={styles.button} onPress={() => router.push('/availableRides')}>
        <Text style={styles.buttonTitle}>Join a ride</Text>
        <Text style={styles.buttonText}>
          Find others going your way who are also looking to share.
        </Text>
      </TouchableOpacity>

      {/* Fare Calculation 
      <TouchableOpacity style={styles.button} onPress={() => router.push('/fareCalculation')}>
        <Text style={styles.buttonTitle}>Fare Calculation</Text>
        <Text style={styles.buttonText}>
          Calculate and split fare for your current ride.
        </Text>
      </TouchableOpacity> */}

      <Title style={{marginTop: 10}}>Ongoing rides</Title>

      {/* Ride Card */}
      <RideCard ride={activeRide} ongoing={true} onPress={() => router.push(`/ride/${activeRide.id}`)}/>
    </ScrollView>
    </>
  );
};

export default Dash;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,      
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,     
    paddingHorizontal: 25,
    paddingBottom: 10,
    backgroundColor: '#f7f7f7',
  },
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
});
