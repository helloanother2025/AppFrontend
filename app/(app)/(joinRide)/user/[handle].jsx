import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { StyledText as Text } from '../../../../components/StyledText'
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView'
import { StyledCard as Card} from '../../../../components/StyledCard'
import { StyledLink } from '../../../../components/StyledLink'
import Ionicons from '@expo/vector-icons/Ionicons'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useLocalSearchParams, useRouter } from 'expo-router'
import users from '../../../../data/userData.json'
import rides from '../../../../data/rideData.json'
import React, { useEffect, useState } from 'react'
import { useRide } from '../../../../context/RideContext'
import { useUser } from '../../../../context/UserContext'

const UserDetails = () => {
  const { handle } = useLocalSearchParams();
  const { rides: availableRides } = useRide();
  const { fetchUserProfile } = useUser();
  const [user, setUser] = useState(null);

  const targetHandle = Array.isArray(handle) ? handle[0] : handle;
  const fallbackUser = users.find(u => u.handle === targetHandle);

  const createdRides = (availableRides.length ? availableRides : rides).filter(r => r.creator.handle === (user?.handle || fallbackUser?.handle));

  const joinedRides = (availableRides.length ? availableRides : rides).filter(r => r.partners.some(p => p.handle === (user?.handle || fallbackUser?.handle)));

  const router = useRouter();
  
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const profile = await fetchUserProfile(targetHandle);
        if (isMounted) {
          setUser({
            ...profile,
            handle: profile?.username ? `@${profile.username}` : profile?.handle,
          });
        }
      } catch (error) {
        if (isMounted) {
          setUser(fallbackUser || null);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [fetchUserProfile, targetHandle, fallbackUser]);

  if (!user && !fallbackUser) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  const profile = user || fallbackUser;

  return (
    <ScrollView>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <FontAwesome style={{marginRight: 10}} name="chevron-left" size={14} color="black" />
        <Text style={{fontSize: 16, fontWeight: 'semibold'}}>Back</Text>
      </TouchableOpacity>

      <View style={styles.imgPlaceholder}>
        <Text>Image</Text>
      </View>

      <Card>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
          <View style={{width: '80%'}}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.handle}>{profile.handle || (profile.username ? `@${profile.username}` : '')}</Text>
            <Text style={styles.bio}>{profile.bio || "Hello, fellow ride sharer!"}</Text>
          </View>

          <TouchableOpacity onPress={() => {
            const uid = profile.user_id || profile.id || profile.userId;
            console.log('💬 Opening chat with user:', { uid, name: profile.name, handle: profile.handle });
            router.push({ 
              pathname: '/(chat)/chatScreen', 
              params: { 
                userId: String(uid),
                userName: profile.name,
                userHandle: profile.handle || profile.username
              } 
            });
          }}>
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
            <Text style={styles.statValue}>{profile.rating ?? profile.avg_rating ?? '-'}</Text>
            <Text style={{fontSize: 11}}>Overall Rating</Text>
          </View>
        </View>

        {/* contact info */}
        <View>
          <Text style={styles.sectionTitle}>Contact</Text>
          <StyledLink type='facebook' text={profile.name} value={profile.fb}></StyledLink>
          
          <StyledLink type='phone' text={profile.phone} value={profile.phone}></StyledLink>
          
          <StyledLink type='email' text={profile.email} value={profile.email} ></StyledLink>
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
  imgPlaceholder: {
    height: 150,
    width: '50%',
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
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