import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { Ride, formatRideDate, transportEmoji, type TransportMode } from '../utils/rideMapper';
import { useAppContext } from '../context/AppContext';
import { InCallModal } from './InCallModal';
import { LocationDisplay } from './LocationDisplay';
import { UserAvatar } from './UserAvatar';

type RideCardProps = {
  ride: Ride;
  onPress?: () => void;
  clickable?: boolean;
  showPassengers?: boolean;
  passengers?: any[];
};

export function RideCard({ 
  ride, 
  onPress, 
  clickable = true, 
  showPassengers = false,
  passengers = [] 
}: RideCardProps) {
  const { darkMode, groupChats } = useAppContext();
  const navigation = useNavigation<any>();
  const [callingUserId, setCallingUserId] = useState<string | null>(null);


  const card = darkMode ? '#1A1A1A' : '#FFFFFF';
  const border = darkMode ? '#2A2A2A' : '#EEEEEE';
  const textPrimary = darkMode ? '#F5F5F5' : '#111111';
  const textSecondary = darkMode ? '#888888' : '#666666';
  const statBg = darkMode ? '#111111' : '#F9F9F9';
  const statBorder = darkMode ? '#2A2A2A' : '#F0F0F0';

  const availableSeats = ride.seats - ride.currentPassengers;
  const totalCapacity = ride.seats + 1;
  const groupChat = groupChats.find((gc) => gc.rideId === ride.id);


  const callingUser =
    callingUserId === ride.creator.id
      ? ride.creator
      : passengers.find((jr) => jr.requester.id === callingUserId)?.requester || null;

  const handlePress = () => {
    if (!clickable) return;
    if (onPress) {
      onPress();
      return;
    }
  };


  return (
    <>
      <Pressable
        onPress={handlePress}
        disabled={!clickable}
        style={({ pressed }) => [styles.card, { backgroundColor: card, borderColor: border }, clickable && pressed ? styles.cardPressed : null]}
      >
        <View style={styles.content}>
          <View style={styles.creatorRow}>
            <View style={styles.shrink0}>
              <UserAvatar size="md" name={ride.creator.name} source={ride.creator.avatar || undefined} />
            </View>
            <View style={styles.creatorInfo}>

              <Text numberOfLines={1} style={[styles.creatorName, { color: textPrimary }]}>
                {ride.creator.name}
              </Text>
              <View style={styles.creatorMetaRow}>
                <Text style={[styles.username, { color: textSecondary }]}>@{ride.creator.username}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={10} color="#E83950" />
                  <Text style={[styles.ratingText, { color: textSecondary }]}>{ride.creator.rating}</Text>
                </View>
              </View>
            </View>
            <View style={styles.actionsRow}>
              {ride.genderPreference !== 'Any' ? (
                <View style={styles.preferenceBadge}>
                  <Text style={styles.preferenceBadgeText}>{ride.genderPreference} only</Text>
                </View>
              ) : null}
              <Pressable onPress={() => setCallingUserId(ride.creator.id)} style={[styles.iconButton, { backgroundColor: darkMode ? '#2A2A2A' : '#F5F5F7' }]}> 
                <Ionicons name="call-outline" size={12} color={textSecondary} />
              </Pressable>
            </View>
          </View>

          <LocationDisplay from={ride.from.shortName} to={ride.to.shortName} compact />

          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={12} color={textSecondary} />
            <Text style={[styles.timeText, { color: textSecondary }]}>{formatRideDate(ride.departureTime).time}</Text>
          </View>

        </View>

        <View style={[styles.statsRow, { borderTopColor: statBorder, backgroundColor: statBg }]}> 
          <View style={styles.statCell}>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Transport</Text>
            <Text style={[styles.statValue, { color: textPrimary }]}>{transportEmoji[ride.transport as TransportMode] || '🚗'} {ride.transport}</Text>
          </View>

          <View style={[styles.statCell, { borderLeftWidth: 1, borderRightWidth: 1, borderLeftColor: statBorder, borderRightColor: statBorder }]}> 
            <Text style={[styles.statLabel, { color: textSecondary }]}>Spots left</Text>
            <Text style={[styles.statValue, { color: availableSeats <= 1 ? '#E83950' : textPrimary }]}>{availableSeats} / {totalCapacity}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Per spot</Text>
            <Text style={[styles.statValue, { color: textPrimary }]}>{ride.fare != null ? `BDT ${(ride.fare / Math.max(ride.seats, 1)).toFixed(0)}` : 'TBD'}</Text>
          </View>
        </View>

        {showPassengers && passengers.length > 0 ? (
          <View style={{ borderTopWidth: 1, borderTopColor: statBorder }}>
            <View style={styles.passengersWrap}>
              <Text style={[styles.passengersTitle, { color: textSecondary }]}>Passengers ({passengers.length})</Text>
              <View style={styles.passengerList}>
                {passengers.map((jr) => (
                  <View key={jr.id} style={styles.passengerRow}>
                    <UserAvatar size="sm" name={jr.requester.name} source={jr.requester.avatar || undefined} />
                    <Pressable onPress={() => router.push({ pathname: '/(app)/user/[id]', params: { id: String(jr.requester.id) } })}>
                      <Text style={[styles.passengerName, { color: textPrimary }]} numberOfLines={1}>{jr.requester.name}</Text>
                    </Pressable>
                    <View style={styles.passengerActions}>
                      <Pressable onPress={() => setCallingUserId(jr.requester.id)} style={[styles.iconButton, { backgroundColor: darkMode ? '#2A2A2A' : '#F5F5F7' }]}>
                        <Ionicons name="call-outline" size={11} color={textSecondary} />
                      </Pressable>
                      {groupChat ? (
                        <Pressable onPress={() => (navigation.getParent() ?? navigation).navigate('GroupChat' as never)} style={[styles.iconButton, styles.chatButton]}>
                          <Ionicons name="chatbubble-outline" size={11} color="#FFFFFF" />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {groupChat && !showPassengers ? (
          <View style={[styles.groupChatRow, { borderTopColor: statBorder, backgroundColor: statBg }]}> 
            <Ionicons name="chatbubble-outline" size={13} color="#E83950" />
            <Text style={styles.groupChatText}>Group Chat Available</Text>
            {groupChat.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{groupChat.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

      </Pressable>

      {callingUser ? <InCallModal user={callingUser} onClose={() => setCallingUserId(null)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  content: {
    padding: 16,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shrink0: {
    flexShrink: 0,
  },
  creatorInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  creatorMetaRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    gap: 6,
  },
  preferenceBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E83950',
  },
  preferenceBadgeText: {
    color: '#E83950',
    fontSize: 12,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  timeText: {
    fontSize: 12,
  },
  statsRow: {
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  passengersWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  passengersTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  passengerList: {
    gap: 8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passengerName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  passengerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  chatButton: {
    backgroundColor: '#E83950',
  },
  groupChatRow: {
    borderTopWidth: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  groupChatText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E83950',
  },
  unreadBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: '#E83950',
  },
  unreadText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
