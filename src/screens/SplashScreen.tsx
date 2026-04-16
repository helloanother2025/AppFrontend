import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useUser } from '../context/UserContext';


export function SplashScreen() {
  const pulse = useRef(new Animated.Value(0)).current;
  const { isAuthenticated, isLoading } = useUser();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const timer = setTimeout(() => {
      router.replace(isAuthenticated ? '/(app)' : '/Login');
    }, 1200);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  return (
    <View style={styles.root}>
      <View style={styles.frame}>
        <View style={styles.centerBlock}>
          <Text style={styles.brand}>BashayJabo</Text>
          <Text style={styles.subtitle}>Share your ride, share the joy</Text>
        </View>

        <View style={styles.dotsRow}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#e63e4c',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 24,
  },
  centerBlock: {
    alignItems: 'center',
    gap: 12,
  },
  brand: {
    color: '#f7f7f7',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 56,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
});
