import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { StyledText as Text } from '../../../../components/StyledText';
import { StyledTitle as Title } from '../../../../components/StyledTitle';
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView'; 
import RideCard from '../../../../components/RideDisplayCard';
import RouteMap from '../../../../components/RouteMap';
import rides from '../../../../data/rideData.json'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useRouter } from 'expo-router';

const JoinRequested = () => {
    const router = useRouter();
    const currentRide = rides[0];

    return (
        <ScrollView>
            <TouchableOpacity style={styles.backButton} onPress={() => router.push('availableRides')}>
                <FontAwesome style={{marginRight: 10}} name="chevron-left" size={14} color="black" />
                <Text style={{fontSize: 16, fontWeight: 'semibold'}}>Back</Text>
            </TouchableOpacity>

            <Title>Request sent!</Title>

            <RouteMap ride={currentRide} />

            <RideCard ride={currentRide} />

            <View style={{flexDirection: 'column', alignSelf: 'center', alignItems: 'center', marginVertical: 8}}>
                <Text style={{textAlign: 'center'}}>Your join request has been sent!</Text>
                <Text style={{textAlign: 'center'}}>Check your notifications for confirmation and ride updates.</Text>
            </View>
        </ScrollView>
    );
};

export default JoinRequested;

const styles = StyleSheet.create({
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
})