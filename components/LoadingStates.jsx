import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

export const FullScreenLoader = ({ visible = true, message = 'Loading...' }) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#e63e4c" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

export const InlineLoader = ({ size = 'small', color = '#e63e4c' }) => {
  return <ActivityIndicator size={size} color={color} />;
};

export const SkeletonLoader = ({ width = '100%', height = 20, borderRadius = 4 }) => {
  return (
    <View style={[styles.skeleton, { width, height, borderRadius }]} />
  );
};

export const ListSkeletonLoader = ({ items = 3 }) => {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: items }).map((_, i) => (
        <View key={i} style={styles.skeletonItem}>
          <SkeletonLoader width="100%" height={60} borderRadius={8} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  skeletonItem: {
    marginBottom: 16,
  },
});
