import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, useAnimatedProps } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SPRING_CONFIG = { damping: 20, stiffness: 200 };

export default function BottomSheet({
  initialPosition = 'collapsed', // 'collapsed' | 'expanded'
  topSnap = 0.2, // as fraction of screen height
  bottomSnap = 0.6, // as fraction of screen height
  children,
  contentPaddingBottomExtra = 0,
  style,
  contentContainerStyle,
  scrollProps,
}) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const initialY = initialPosition === 'expanded' ? screenHeight * topSnap : screenHeight * bottomSnap;
  const translateY = useSharedValue(initialY);
  const context = useSharedValue({ y: initialY });
  const isCollapsed = useSharedValue(initialPosition === 'collapsed');

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      const upperLimit = screenHeight * topSnap;
      const lowerLimit = screenHeight * bottomSnap;
      const next = event.translationY + context.value.y;
      translateY.value = Math.min(Math.max(next, upperLimit), lowerLimit);
    })
    .onEnd(() => {
      const upper = screenHeight * topSnap;
      const lower = screenHeight * bottomSnap;
      const mid = (upper + lower) / 2;
    
      const snapTo = translateY.value > mid ? lower : upper;
    
      translateY.value = withSpring(snapTo, SPRING_CONFIG);
    
      isCollapsed.value = snapTo === lower;
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      top: translateY.value,
      height: screenHeight - translateY.value,
    };
  });

  const animatedScrollProps = useAnimatedProps(() => {
    return { scrollEnabled: !isCollapsed.value };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      <GestureDetector gesture={gesture}>
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>
      </GestureDetector>
      <Animated.ScrollView
        animatedProps={animatedScrollProps}
        contentContainerStyle={{
          paddingBottom: insets.bottom + contentPaddingBottomExtra,
          ...(contentContainerStyle || {}),
        }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        bounces={false}
        scrollIndicatorInsets={{ bottom: insets.bottom + 16 }}
        keyboardShouldPersistTaps="handled"
        {...scrollProps}
      >
        {children}
      </Animated.ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f7f7f7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 12
  },
  handle: {
    width: 50,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d0d0d0',
  },
});









