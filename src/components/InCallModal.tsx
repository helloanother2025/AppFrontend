import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type User } from '../utils/rideMapper';
import { UserAvatar } from './UserAvatar';

type InCallModalProps = {
  user: User;
  onClose: () => void;
};


type CallState = 'calling' | 'connected' | 'ended';

export function InCallModal({ user, onClose }: InCallModalProps) {
  const [callState, setCallState] = useState<CallState>('calling');
  const [callDuration, setCallDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const connectTimer = setTimeout(() => {
      setCallState('connected');
    }, 2500);

    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    if (callState !== 'connected') {
      return;
    }

    const interval = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  useEffect(() => {
    if (callState !== 'calling') {
      return;
    }

    const makeLoop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = makeLoop(ring1, 0);
    const a2 = makeLoop(ring2, 400);
    const a3 = makeLoop(ring3, 800);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      ring1.stopAnimation();
      ring2.stopAnimation();
      ring3.stopAnimation();
      ring1.setValue(0);
      ring2.setValue(0);
      ring3.setValue(0);
    };
  }, [callState, ring1, ring2, ring3]);

  const durationText = useMemo(() => {
    const m = Math.floor(callDuration / 60)
      .toString()
      .padStart(2, '0');
    const s = (callDuration % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [callDuration]);

  const handleEndCall = () => {
    setCallState('ended');
    setTimeout(onClose, 800);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.topBlock}>
          <Text style={styles.statusText}>
            {callState === 'calling' ? 'Calling...' : callState === 'connected' ? 'Connected' : 'Call ended'}
          </Text>

          <View style={styles.avatarWrap}>
            {callState === 'calling' ? (
              <>
                {[ring1, ring2, ring3].map((ring, idx) => (
                  <Animated.View
                    key={idx}
                    style={[
                      styles.ring,
                      {
                        transform: [
                          {
                            scale: ring.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1 + (idx + 1) * 0.4],
                            }),
                          },
                        ],
                        opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                      },
                    ]}
                  />
                ))}
              </>
            ) : null}

            <View style={styles.avatarInner}>
              <UserAvatar name={user.name} source={user.avatar ?? null} size={88} />
            </View>
          </View>

          <Text style={styles.nameText}>{user.name}</Text>
          <Text style={styles.phoneText}>@{user.username || 'user'}</Text>

          {callState === 'connected' ? <Text style={styles.durationText}>{durationText}</Text> : null}

        </View>

        <View style={styles.bottomBlock}>
          {callState === 'connected' ? (
            <View style={styles.secondaryControls}>
              <Pressable onPress={() => setMuted((prev) => !prev)} style={styles.controlWrap}>
                <View style={[styles.controlButton, { backgroundColor: muted ? '#E83950' : 'rgba(255,255,255,0.15)' }]}>
                  <Ionicons name={muted ? 'mic-off' : 'mic'} size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.controlLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
              </Pressable>

              <Pressable onPress={() => setSpeakerOn((prev) => !prev)} style={styles.controlWrap}>
                <View style={[styles.controlButton, { backgroundColor: speakerOn ? '#E83950' : 'rgba(255,255,255,0.15)' }]}>
                  <Ionicons name={speakerOn ? 'volume-high' : 'volume-mute'} size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.controlLabel}>Speaker</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable onPress={handleEndCall} style={styles.endCallButton}>
            <Ionicons name="call" size={26} color="#FFFFFF" style={styles.endCallIcon} />
          </Pressable>
          <Text style={styles.endCallText}>End call</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    justifyContent: 'space-between',
  },
  topBlock: {
    paddingTop: 72,
    alignItems: 'center',
  },
  statusText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 24,
  },
  avatarWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ring: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarInner: {
    zIndex: 3,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  phoneText: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  durationText: {
    marginTop: 8,
    color: '#4ADE80',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBlock: {
    paddingBottom: 64,
    alignItems: 'center',
    gap: 18,
  },
  secondaryControls: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 4,
  },
  controlWrap: {
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallIcon: {
    transform: [{ rotate: '135deg' }],
  },
  endCallText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
});
