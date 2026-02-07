import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function CustomMarker({
  coordinate,
  color = '#e63e4c',
  size = 18,
  title,
  labelColor = '#000',
  iconName,
}) {
  return (
    <Marker coordinate={coordinate} title={title} anchor={{ x: 0.2, y: 0.3 }}>
      <View style={{ alignItems: 'center' }}>
        {iconName ? (
          <FontAwesome name={iconName} size={size} color={color} />
        ) : (
          <View
            style={[
              styles.marker,
              {
                backgroundColor: color,
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
          />
        )}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    borderWidth: 1,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
