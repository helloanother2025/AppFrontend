import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { StyledText as Text } from '../../../components/StyledText'
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView'
import { StyledCard as Card} from '../../../components/StyledCard'
import { StyledLink } from '../../../components/StyledLink'
import { StyledButton as Button } from '../../../components/StyledButton'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { useRide } from '../../../context/RideContext'
import { useUser } from '../../../context/UserContext'
import React, { useEffect, useState } from 'react'
import axios from 'axios';
import FriendsBox from '../../../components/FriendsBox';
import { useFriends } from '../../../context/FriendsContext';
import { useTheme } from '../../../context/ThemeContext';
import { useRouter } from 'expo-router'
import ProfileImage from '../../../components/ProfileImage'

const UserProfile = () => {
    const { friends, fetchFriends } = useFriends();
  const { currentUser, fetchCurrentUser, logout } = useUser();
  const { myRides, joinedRides, fetchMyRides, fetchJoinedRides } = useRide();
  const router = useRouter();
  const user = currentUser;
  const [avgRating, setAvgRating] = useState(null);
  const [totalRatings, setTotalRatings] = useState(null);
  const { theme, toggleTheme } = useTheme();

  const createdRides = myRides || [];
  const joinedRidesData = joinedRides || [];

  useEffect(() => {
    fetchCurrentUser();
    fetchMyRides();
    fetchJoinedRides();
    // Fetch average feedback rating from feedback table
    const fetchAvg = async () => {
      try {
        const userId = user?.id || user?.user_id;
        console.log('Fetching feedback average for userId:', userId);
        if (!userId) return;
        // Use feedback endpoint without /api prefix
        const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
        const FEEDBACK_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');
        const res = await axios.get(`${FEEDBACK_BASE_URL}/feedback/user/${userId}/average`);
        setAvgRating(res.data.avgRating);
        setTotalRatings(res.data.totalRatings);
      } catch (e) {
        setAvgRating(null);
        setTotalRatings(null);
      }
    };
    if (user && (user.id || user.user_id)) fetchAvg();
  }, [fetchCurrentUser, fetchMyRides, fetchJoinedRides, user]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <ScrollView>
      <View style={{ alignItems: 'center', marginVertical: 16 }}>
        {/* Theme toggle removed, now in settings icon in header */}
      </View>
      <ProfileImage
        profilePicture={user.profilePicture}
        name={user.name}
        style={{ width: 150, height: 150, borderRadius: 75, alignSelf: 'center', marginBottom: 20 }}
      />

      <Card>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
          <View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.handle}>{user.handle || (user.username ? `@${user.username}` : '')}</Text>
            <Text style={styles.bio}>{user.bio || "Hello, fellow ride sharer!"}</Text>
          </View>

          <TouchableOpacity>
            <FontAwesome5 name="user-edit" size={22} color="#888" style={styles.icon}/>
          </TouchableOpacity>
        </View>
        {/* Friend request button */}
        <View style={{ marginTop: 12 }}>
          {/* Only show if not current user */}
          {user.id !== currentUser?.id && (
            <SendFriendRequestButton userId={user.id} />
          )}
        </View>

        {/* stats */}
        <View style={styles.statBox}>
          <View style={{alignItems: 'center'}}>
            <Text style={styles.statValue}>{createdRides.length}</Text>
            <Text style={{fontSize: 11}}>Rides Created</Text>
          </View>
          
          <View style={{alignItems: 'center'}}>
            <Text style={styles.statValue}>{joinedRidesData.length}</Text>
            <Text style={{fontSize: 11}}>Rides Joined</Text>
          </View>
          
          <View style={{alignItems: 'center'}}>
            {avgRating !== null && totalRatings > 0 ? (
                <Text style={styles.statValue}>{avgRating}</Text>
            ) : (
              <Text style={styles.statValue}>Unrated</Text>
            )}
            <Text style={{fontSize: 11}}>Overall Rating</Text>
          </View>
        </View>

        {/* contact info */}
        <View>
          <Text style={styles.sectionTitle}>Contact</Text>
          {/* <StyledLink type='facebook' text={user.name} value={user.fb}></StyledLink> */}
                    
          <StyledLink type='phone' text={user.phone} value={user.phone}></StyledLink>
          
          <StyledLink type='email' text={user.email} value={user.email} ></StyledLink>
        </View>      
      </Card>

      <Button
        title="Logout"
        onPress={handleLogout}
        style={{ marginTop: 20, backgroundColor: '#e63e4c' }}
      />
      <FriendsBox
        friends={friends}
        onFriendPress={(friend) => router.push(`/chat/chatScreen?userId=${friend.id}`)}
        style={{ marginTop: 16 }}
      />
    </ScrollView>
  );
};

export default UserProfile;

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
    marginVertical: 4,
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
  }
});