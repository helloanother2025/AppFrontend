import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { StyledText as Text } from './StyledText';

const getInitials = (name) => {
  if (!name) return '';
  const names = name.split(' ');
  return names.map(n => n[0]).join('').toUpperCase();
};

const ProfileImage = ({ profilePicture, name, style }) => {
  return (
    <>
      {profilePicture ? (
        <Image
          source={{ uri: profilePicture }}
          style={[styles.image, style]}
        />
      ) : (
        <View
          style={[
            styles.initialsContainer,
            style,
          ]}
        >
          <Text style={styles.initialsText}>{getInitials(name)}</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  image: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  initialsContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default ProfileImage;