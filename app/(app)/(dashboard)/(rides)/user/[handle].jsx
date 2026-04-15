import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { StyledText as Text } from '../../../../../components/StyledText'
import { StyledScrollView as ScrollView } from '../../../../../components/StyledScrollView'
import { StyledCard as Card} from '../../../../../components/StyledCard'
import { StyledLink } from '../../../../../components/StyledLink'
import Ionicons from '@expo/vector-icons/Ionicons'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useLocalSearchParams, useRouter } from 'expo-router'
import users from '../../../../../data/userData.json'
import rides from '../../../../../data/rideData.json'
import React from 'react'
import ProfileImage from '../../../../../components/ProfileImage'

const UserDetails = () => {
  const { handle } = useLocalSearchParams();
  const user = users.find(u => u.handle === handle);

  const createdRides = rides.filter(r => r.creator.handle === user.handle);

  const joinedRides = rides.filter(r => r.partners.some(p => p.handle === user.handle));

  const router = useRouter();
  
  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <ScrollView>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <FontAwesome style={{marginRight: 10}} name="chevron-left" size={14} color="black" />
        <Text style={{fontSize: 16, fontWeight: 'semibold'}}>Back</Text>
      </TouchableOpacity>

      <ProfileImage
        profilePicture={user.profilePicture}
        name={user.name}
        style={{ width: 150, height: 150, borderRadius: 75, alignSelf: 'center', marginVertical: 20 }}
      />

      <Card>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
          <View style={{width: '80%'}}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.handle}>{user.handle}</Text>
            <Text style={styles.bio}>{user.bio || "Hello, fellow ride sharer!"}</Text>
          </View>

          <TouchableOpacity style={{ paddingHorizontal: 10, marginRight: 15 }} onPress={() => router.push({ pathname: '/(chat)/chatScreen', params: { handle: user.handle } })}>
            <Ionicons name="chatbubble-ellipses" size={28} color="#e63e4c" style={styles.icon} />
          </TouchableOpacity>
        </View>

        {/* stats */}
        <View style={styles.statBox}>
        <View style={{alignItems: 'center'}}>
            <Text style={styles.statValue}>{createdRides.length}</Text>
            <Text style={{fontSize: 11}}>Rides Created</Text>
          </View>
          
          <View style={{alignItems: 'center'}}>
            <Text style={styles.statValue}>{joinedRides.length}</Text>
            <Text style={{fontSize: 11}}>Rides Joined</Text>
          </View>
          
          <View style={{alignItems: 'center'}}>
            <Text style={styles.statValue}>{user.rating}</Text>
            <Text style={{fontSize: 11}}>Overall Rating</Text>
          </View>
        </View>

        {/* contact info */}
        <View>
          <Text style={styles.sectionTitle}>Contact</Text>
          <StyledLink type='facebook' text={user.name} value={user.fb}></StyledLink>
          
          <StyledLink type='phone' text={user.phone} value={user.phone}></StyledLink>
          
          <StyledLink type='email' text={user.email} value={user.email} ></StyledLink>
        </View> 
      </Card>
    </ScrollView>
  );
};

export default UserDetails;

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontWeight: 'semibold',
    fontSize: 16,
    color: 'red',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 20,
    color: '#111',
  },
  handle: {
    fontSize: 14,
    color: '#888',
  },
  bio: {
    fontSize: 14,
    color: '#333',
    marginTop: 6,
  },
  statBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 14,    
    backgroundColor: '#eee',
    flexDirection: 'row',
    marginVertical: 6,
    padding: 8,
    alignItems: 'center',
    marginVertical: 16
  },
  statValue: {
    fontWeight: 'semibold',
    fontSize: 18,
    color: '#000',
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 8,
    marginBottom: 4
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  contactLink: {
    flexDirection: 'row',
    alignContent: 'center'
  },
  icon: {
    marginRight: 10
  },
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5
  },
  rideText: {
    fontSize: 14,
    flex: 1,
  },
  rideColumn: {
    alignItems: 'flex-start',
    width: '50%'
  },
  transportText: {
    backgroundColor: '#ababab',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  }
});