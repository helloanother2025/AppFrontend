import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { StyledText as Text } from '../../../../components/StyledText'
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView'
import { StyledCard as Card } from '../../../../components/StyledCard'
import { StyledLink } from '../../../../components/StyledLink'
import Ionicons from '@expo/vector-icons/Ionicons'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { useRide } from '../../../../context/RideContext'
import { useUser } from '../../../../context/UserContext'
import { useFriends } from '../../../../context/FriendsContext'
import { usersAPI } from '../../../../src/api/users'
import SendFriendRequestButton from '../../../../components/SendFriendRequestButton'
import ProfileImage from '../../../../components/ProfileImage'

const UserDetails = () => {
  const { handle } = useLocalSearchParams();
  const { rides: availableRides } = useRide();
  const { fetchUserProfile, currentUser } = useUser();
  const { friends } = useFriends();
  const [user, setUser] = useState(null);
  const [rideStats, setRideStats] = useState({ createdCount: 0, joinedCount: 0 });

  const targetHandle = Array.isArray(handle) ? handle[0] : handle;
  const normalizedHandle = targetHandle?.startsWith('@') ? targetHandle.slice(1) : targetHandle;

  const createdRides = (availableRides || []).filter(r => r.creator?.handle === user?.handle);
  const joinedRides  = (availableRides || []).filter(r => r.partners?.some(p => p.handle === user?.handle));

  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const profile = await fetchUserProfile(normalizedHandle || targetHandle);
        if (isMounted) {
          setUser({
            ...profile,
            handle: profile?.username ? `@${profile.username}` : profile?.handle,
          });
          if (profile?.user_id) {
            const stats = await usersAPI.getUserRideStats(profile.user_id);
            if (isMounted) setRideStats(stats);
          }
        }
      } catch {
        if (isMounted) setUser(null);
      }
    })();
    return () => { isMounted = false; };
  }, [fetchUserProfile, normalizedHandle, targetHandle]);

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  const profile = user;

  const isAlreadyFriend = friends.some(
    f => String(f.id || f.user_id) === String(profile.user_id)
  );

  return (
    <ScrollView>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <FontAwesome style={{ marginRight: 10 }} name="chevron-left" size={14} color="black" />
        <Text style={{ fontSize: 16, fontWeight: 'semibold' }}>Back</Text>
      </TouchableOpacity>

      <ProfileImage
        profilePicture={user.profilePicture}
        name={user.name}
        style={{ width: 150, height: 150, borderRadius: 75, alignSelf: 'center', marginVertical: 20 }}
      />

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ width: '80%' }}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.handle}>{profile.handle || (profile.username ? `@${profile.username}` : '')}</Text>
            <Text style={styles.bio}>{profile.bio || 'Hello, fellow ride sharer!'}</Text>
          </View>

          {currentUser && profile.user_id !== currentUser?.user_id && (
            <TouchableOpacity
              onPress={() => {
                const uid = profile.user_id || profile.id || profile.userId;
                router.push({
                  pathname: '/(chat)/chatScreen',
                  params: { userId: String(uid), userName: profile.name, userHandle: profile.handle || profile.username },
                });
              }}
            >
              <Ionicons name="chatbubble-ellipses" size={28} color="#e63e4c" style={styles.icon} />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statBox}>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.statValue}>{rideStats.createdCount ?? createdRides.length}</Text>
            <Text style={{ fontSize: 11 }}>Rides Created</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.statValue}>{rideStats.joinedCount ?? joinedRides.length}</Text>
            <Text style={{ fontSize: 11 }}>Rides Joined</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.statValue}>{profile.rating ?? profile.avg_rating ?? '-'}</Text>
            <Text style={{ fontSize: 11 }}>Overall Rating</Text>
          </View>
        </View>

        {currentUser && profile.user_id !== currentUser?.user_id && !isAlreadyFriend && (
          <View style={{ marginTop: 16, marginBottom: 8 }}>
            <SendFriendRequestButton userId={profile.user_id} />
          </View>
        )}

        {/* Contact */}
        <View>
          <Text style={styles.sectionTitle}>Contact</Text>
          <StyledLink type="phone" text={profile.phone} value={profile.phone} />
          <StyledLink type="email" text={profile.email} value={profile.email} />
        </View>
      </Card>
    </ScrollView>
  );
};

export default UserDetails;

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontWeight: 'semibold', fontSize: 16, color: 'red' },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  name: { fontWeight: 'bold', fontSize: 20, color: '#111' },
  handle: { fontSize: 14, color: '#888' },
  bio: { fontSize: 14, color: '#333', marginTop: 6 },
  statBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 14,
    backgroundColor: '#eee',
    marginVertical: 16,
    padding: 8,
    alignItems: 'center',
  },
  statValue: { fontWeight: 'semibold', fontSize: 18, color: '#000' },
  sectionTitle: { fontWeight: 'bold', fontSize: 16, marginTop: 8, marginBottom: 4 },
  icon: { marginRight: 10 },
});
