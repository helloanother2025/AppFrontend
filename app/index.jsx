import { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { StyledText as Text } from '../components/StyledText';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import React from 'react';

const Home = () => {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
    'Montserrat-SemiBold': require('../assets/fonts/Montserrat-SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => router.replace('/(auth)/login'), 500);
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.title}>BashayJabo</Text>
      </Animated.View>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
  },
  title: {
    fontWeight: 'bold',
    color: '#e63e4c',
    fontSize: 24,
    textAlign: 'center',
  },
});
